import React, { useState, useRef, useId, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  Maximize2,
  X,
  Crosshair,
} from 'lucide-react';
import { SpectralLine } from './besselUtils';
interface InspectedPoint {
  panel: 'primary' | 'secondary';
  seriesId: string;
  seriesName: string;
  seriesSymbol: string;
  color: string;
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  harmonicNote?: string;
}

function parseAxisInfo(label: string): { symbol: string; unit: string } {
  const unitMatch = label.match(/\(([^)]+)\)\s*$/);
  const rawUnit = unitMatch ? unitMatch[1].trim() : '';
  const unit = rawUnit === 'seconds' || rawUnit === 'second' ? 's' : rawUnit;
  const base = unitMatch ? label.slice(0, unitMatch.index).trim() : label.trim();

  if (/\bm\(t\)/.test(base)) return { symbol: 'm(t)', unit };
  if (/\bs\(t\)/.test(base)) return { symbol: 's(t)', unit };
  if (/\bf_i\(t\)/.test(base)) return { symbol: 'f_i(t)', unit };
  if (/(?:^|\s)t$/.test(base)) return { symbol: 't', unit };
  if (/(?:^|\s)f$/.test(base)) return { symbol: 'f', unit };
  if (/magnitude/i.test(base)) return { symbol: '|S(f)|', unit };
  if (/frequency/i.test(base)) return { symbol: 'f_i', unit };
  if (/amplitude/i.test(base)) return { symbol: 'y', unit };
  if (/phase\s*error/i.test(base)) return { symbol: 'e(t)', unit };
  if (/error/i.test(base)) return { symbol: 'err', unit };
  return { symbol: base || 'y', unit };
}

function getSeriesDisplaySymbol(seriesName: string, fallbackSymbol: string): string {
  const fnMatch = seriesName.match(/([A-Za-z_][A-Za-z0-9_]*\([^)]+\))\s*$/);
  if (fnMatch) return fnMatch[1];
  if (/original/i.test(seriesName)) return 'm(t)';
  if (/demodulated/i.test(seriesName)) return 'm_rec(t)';
  if (/differentiated/i.test(seriesName)) return 'v_d(t)';
  if (/envelope/i.test(seriesName)) return 'E(t)';
  if (/phase\s*error/i.test(seriesName)) return 'e(t)';
  if (/residual/i.test(seriesName)) return 'err(t)';
  return fallbackSymbol || seriesName;
}

function formatCoordValue(val: number, span: number): string {
  if (Math.abs(val) < 1e-9) return '0';
  if (span < 0.05) return val.toFixed(4);
  if (span < 0.5) return val.toFixed(3);
  if (span < 10) return Number(val.toFixed(3)).toString();
  return Number(val.toFixed(2)).toString();
}

function findNearestIndexByX(pts: { x: number }[], targetX: number): number {
  if (pts.length === 0) return 0;
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].x < targetX) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(pts[lo - 1].x - targetX) < Math.abs(pts[lo].x - targetX)) {
    return lo - 1;
  }
  return lo;
}

export interface FmPlotPoint {
  x: number;
  y: number;
}

export interface FmSeries {
  id: string;
  name: string;
  color: string;
  points?: FmPlotPoint[];
  spectralLines?: SpectralLine[];
  type?: 'line' | 'spectrum' | 'stem';
  strokeWidth?: number;
  dash?: string;
}

export interface FmCarsonBand {
  center: number;
  bandwidth: number;
  label?: string;
  color?: string;
}

export interface FmActiveMarker {
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface FmSplitPanelConfig {
  title?: string;
  yLabel: string;
  range: [number, number];
  series: FmSeries[];
  referenceLines?: { y?: number; x?: number; label: string; color?: string; style?: 'dashed' | 'solid' }[];
}

export interface FmInteractivePlotProps {
  title: string;
  subtitle?: string;
  xLabel: string;
  yLabel: string;
  domain: [number, number]; // Explicit xlim [xMin, xMax]
  range: [number, number];  // Explicit ylim [yMin, yMax]
  series: FmSeries[];
  referenceLines?: { y?: number; x?: number; label: string; color?: string; style?: 'dashed' | 'solid' }[];
  carsonBands?: FmCarsonBand[];
  activeMarker?: FmActiveMarker;
  secondaryPanel?: FmSplitPanelConfig;
  topPanelTitle?: string;
  height?: number;
  statusBadge?: string;
  headerControls?: React.ReactNode;
  className?: string;
}

function formatTickValue(val: number, span: number): string {
  if (Math.abs(val) < 1e-9) return '0';
  if (span < 0.05) return val.toFixed(3);
  if (span < 0.5) return val.toFixed(2);
  if (span < 10) return Number(val.toFixed(2)).toString();
  return Number(val.toFixed(1)).toString();
}

export const FmInteractivePlot: React.FC<FmInteractivePlotProps> = ({
  title,
  subtitle,
  xLabel,
  yLabel,
  domain,
  range,
  series,
  referenceLines = [],
  carsonBands = [],
  activeMarker,
  secondaryPanel,
  topPanelTitle,
  height = 170,
  statusBadge,
  headerControls,
  className = '',
}) => {
  const clipId = useId();
  const clipIdSecondary = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan, Zoom, and Fullscreen State
  const [currentDomain, setCurrentDomain] = useState<[number, number]>(domain);
  const [currentRange, setCurrentRange] = useState<[number, number]>(range);
  const [secondaryRange, setSecondaryRange] = useState<[number, number]>(
    secondaryPanel?.range ?? [-1, 1]
  );
  const [isPanActive, setIsPanActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<InspectedPoint | null>(null);
  const [pinnedPoint, setPinnedPoint] = useState<InspectedPoint | null>(null);

  // Clear pinned/hovered inspection when switching between distinct plots
  useEffect(() => {
    setPinnedPoint(null);
    setHoveredPoint(null);
  }, [title]);

  // Measure actual container pixel dimensions to guarantee crisp 1:1 edge-to-edge rendering
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 720,
    height,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    const rafId = requestAnimationFrame(updateSize);
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isExpanded]);

  // Allow ESC key to exit full-screen modal
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Enforce explicit dynamic xlim / ylim when parameters update
  useEffect(() => {
    setCurrentDomain(domain);
  }, [domain[0], domain[1]]);

  useEffect(() => {
    setCurrentRange(range);
  }, [range[0], range[1]]);

  useEffect(() => {
    if (secondaryPanel) {
      setSecondaryRange(secondaryPanel.range);
    }
  }, [secondaryPanel?.range[0], secondaryPanel?.range[1]]);

  const [xMin, xMax] = currentDomain;
  const [yMin, yMax] = currentRange;
  const [secYMin, secYMax] = secondaryRange;

  const isViewModified =
    Math.abs(xMin - domain[0]) > 1e-4 ||
    Math.abs(xMax - domain[1]) > 1e-4 ||
    Math.abs(yMin - range[0]) > 1e-4 ||
    Math.abs(yMax - range[1]) > 1e-4;

  const width = size.width;
  const actualHeight = size.height;
  const hasTopTitle = Boolean(topPanelTitle);
  const padding = {
    top: hasTopTitle ? 28 : carsonBands.length > 0 ? 22 : 18,
    right: 24,
    bottom: 48,
    left: 68,
  };

  const plotWidth = Math.max(40, width - padding.left - padding.right);
  const totalPlotHeight = Math.max(40, actualHeight - padding.top - padding.bottom);
  const splitGap = secondaryPanel ? 32 : 0;
  const plotHeight = secondaryPanel
    ? Math.max(40, (totalPlotHeight - splitGap) / 2)
    : totalPlotHeight;
  const secTop = padding.top + plotHeight + splitGap;

  const xSpan = Math.max(1e-6, xMax - xMin);
  const ySpan = Math.max(1e-6, yMax - yMin);
  const secYSpan = Math.max(1e-6, secYMax - secYMin);

  const mapX = useCallback(
    (x: number) => padding.left + ((x - xMin) / xSpan) * plotWidth,
    [xMin, xSpan, plotWidth, padding.left]
  );

  const mapY = useCallback(
    (y: number) => padding.top + ((yMax - y) / ySpan) * plotHeight,
    [yMax, ySpan, plotHeight, padding.top]
  );

  const mapSecY = useCallback(
    (y: number) => secTop + ((secYMax - y) / secYSpan) * plotHeight,
    [secYMax, secYSpan, plotHeight, secTop]
  );

  // Normalize Carson bands so adjacent spans (e.g. -fc and +fc when BT/2 > fc) never overlap or double-shade
  const normalizedCarsonBands = useMemo(() => {
    if (carsonBands.length === 0) return [];
    const sorted = carsonBands
      .map((band, idx) => ({
        ...band,
        origIdx: idx,
        leftFreq: band.center - band.bandwidth / 2,
        rightFreq: band.center + band.bandwidth / 2,
      }))
      .sort((a, b) => a.center - b.center);

    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      if (curr.rightFreq > next.leftFreq) {
        const midpoint = (curr.center + next.center) / 2;
        curr.rightFreq = Math.min(curr.rightFreq, midpoint);
        next.leftFreq = Math.max(next.leftFreq, midpoint);
      }
    }
    return sorted;
  }, [carsonBands]);

  // Compute Carson pill bounding boxes so spectral labels never collide with them
  const carsonPillBoxes = useMemo(() => {
    const boxes: { left: number; right: number; top: number; bottom: number }[] = [];
    for (const band of normalizedCarsonBands) {
      if (!band.label) continue;
      const xLeft = mapX(band.leftFreq);
      const xRight = mapX(band.rightFreq);
      const bandW = Math.max(0, xRight - xLeft);
      if (xRight < padding.left || xLeft > width - padding.right) continue;
      const rx = Math.min(
        width - padding.right - 224,
        Math.max(padding.left + 8, xLeft + bandW / 2 - 110)
      );
      const ry = padding.top + 6;
      const box = {
        left: rx - 4,
        right: rx + 224,
        top: ry - 2,
        bottom: ry + 26,
      };
      const overlaps = boxes.some(
        (b) => !(box.right < b.left || box.left > b.right || box.bottom < b.top || box.top > b.bottom)
      );
      if (!overlaps) {
        boxes.push(box);
      }
    }
    return boxes;
  }, [normalizedCarsonBands, mapX, width, padding.right, padding.left, padding.top]);

  // Zoom and Pan Handlers
  const handleZoomIn = () => {
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const halfX = (xSpan * 0.7) / 2;
    const halfY = (ySpan * 0.7) / 2;
    setCurrentDomain([xCenter - halfX, xCenter + halfX]);
    setCurrentRange([yCenter - halfY, yCenter + halfY]);
    if (secondaryPanel) {
      const secCenter = (secYMin + secYMax) / 2;
      const secHalf = (secYSpan * 0.7) / 2;
      setSecondaryRange([secCenter - secHalf, secCenter + secHalf]);
    }
  };

  const handleZoomOut = () => {
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const halfX = (xSpan * 1.4) / 2;
    const halfY = (ySpan * 1.4) / 2;
    setCurrentDomain([xCenter - halfX, xCenter + halfX]);
    setCurrentRange([yCenter - halfY, yCenter + halfY]);
    if (secondaryPanel) {
      const secCenter = (secYMin + secYMax) / 2;
      const secHalf = (secYSpan * 1.4) / 2;
      setSecondaryRange([secCenter - secHalf, secCenter + secHalf]);
    }
  };

  const handleResetAxes = () => {
    setCurrentDomain(domain);
    setCurrentRange(range);
    if (secondaryPanel) {
      setSecondaryRange(secondaryPanel.range);
    }
  };

  const xInfo = useMemo(() => parseAxisInfo(xLabel), [xLabel]);
  const yInfoPrimary = useMemo(() => parseAxisInfo(yLabel), [yLabel]);
  const yInfoSecondary = useMemo(
    () => parseAxisInfo(secondaryPanel?.yLabel || yLabel),
    [secondaryPanel?.yLabel, yLabel]
  );

  const findNearestInspectedPoint = useCallback(
    (svgX: number, svgY: number): InspectedPoint | null => {
      if (svgX < padding.left || svgX > width - padding.right) return null;

      let targetPanel: 'primary' | 'secondary' | null = null;
      if (
        secondaryPanel &&
        svgY >= secTop - splitGap / 2 &&
        svgY <= secTop + plotHeight + 4
      ) {
        targetPanel = 'secondary';
      } else if (svgY >= padding.top - 4 && svgY <= padding.top + plotHeight + (secondaryPanel ? splitGap / 2 : 4)) {
        targetPanel = 'primary';
      }
      if (!targetPanel) return null;

      const candidateSeries =
        targetPanel === 'secondary' ? secondaryPanel!.series : series;
      const yMapper = targetPanel === 'secondary' ? mapSecY : mapY;
      const activeYInfo = targetPanel === 'secondary' ? yInfoSecondary : yInfoPrimary;
      const activeYLabel = targetPanel === 'secondary' ? secondaryPanel!.yLabel : yLabel;

      const targetX = xMin + ((svgX - padding.left) / plotWidth) * xSpan;

      let bestPoint: InspectedPoint | null = null;
      let bestScore = Infinity;

      for (const s of candidateSeries) {
        if (s.type === 'spectrum' && s.spectralLines && s.spectralLines.length > 0) {
          const visibleLines = s.spectralLines.filter(
            (l) => l.freq >= xMin - xSpan * 0.02 && l.freq <= xMax + xSpan * 0.02
          );
          for (const line of visibleLines) {
            const lx = mapX(line.freq);
            const dx = Math.abs(lx - svgX);
            if (dx < bestScore) {
              bestScore = dx;
              const n = line.harmonicOrder;
              const offsetOrder =
                line.offsetOrder ?? (line.side === 'negative' ? -n : n);
              let harmonicNote = line.side === 'negative' ? '-f_c' : 'f_c';
              if (n !== 0) {
                const absOrder = Math.abs(offsetOrder);
                const sign = offsetOrder > 0 ? '+' : '-';
                harmonicNote = `${sign}${absOrder}f_m`;
              }
              bestPoint = {
                panel: targetPanel,
                seriesId: s.id,
                seriesName: s.name,
                seriesSymbol: '|S(f)|',
                color: line.harmonicOrder === 0 ? '#C85A32' : s.color,
                x: line.freq,
                y: line.amplitude,
                xLabel,
                yLabel: activeYLabel,
                xUnit: xInfo.unit,
                yUnit: activeYInfo.unit,
                harmonicNote,
              };
            }
          }
          continue;
        }

        const pts = s.points || [];
        if (pts.length === 0) continue;

        const isSorted = pts.length <= 2 || pts[0].x <= pts[pts.length - 1].x;
        let startIdx = 0;
        let endIdx = pts.length - 1;
        if (isSorted && pts.length > 60) {
          const centerIdx = findNearestIndexByX(pts, targetX);
          startIdx = Math.max(0, centerIdx - 28);
          endIdx = Math.min(pts.length - 1, centerIdx + 28);
        }

        for (let i = startIdx; i <= endIdx; i++) {
          const pt = pts[i];
          if (pt.x < xMin - xSpan * 0.02 || pt.x > xMax + xSpan * 0.02) continue;
          const px = mapX(pt.x);
          const py = yMapper(pt.y);
          const dist = Math.hypot(px - svgX, py - svgY);
          if (dist < bestScore) {
            bestScore = dist;
            bestPoint = {
              panel: targetPanel,
              seriesId: s.id,
              seriesName: s.name,
              seriesSymbol: getSeriesDisplaySymbol(s.name, activeYInfo.symbol),
              color: s.color,
              x: pt.x,
              y: pt.y,
              xLabel,
              yLabel: activeYLabel,
              xUnit: xInfo.unit,
              yUnit: activeYInfo.unit,
            };
          }
        }
      }

      return bestPoint;
    },
    [
      padding.left,
      padding.top,
      width,
      padding.right,
      secondaryPanel,
      secTop,
      splitGap,
      plotHeight,
      series,
      mapSecY,
      mapY,
      yInfoSecondary,
      yInfoPrimary,
      yLabel,
      xMin,
      xMax,
      plotWidth,
      xSpan,
      mapX,
      xLabel,
      xInfo.unit,
    ]
  );

  const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      svgX: ((e.clientX - rect.left) / rect.width) * width,
      svgY: ((e.clientY - rect.top) / rect.height) * actualHeight,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanActive) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && dragStart) {
      setHoveredPoint(null);
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      const dxUnits = (dx / plotWidth) * xSpan;
      const dyUnits = (dy / plotHeight) * ySpan;

      setCurrentDomain([xMin - dxUnits, xMax - dxUnits]);
      if (!secondaryPanel) {
        setCurrentRange([yMin + dyUnits, yMax + dyUnits]);
      }
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isPanActive) {
      const coords = getSvgCoords(e);
      if (coords) {
        setHoveredPoint(findNearestInspectedPoint(coords.svgX, coords.svgY));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setHoveredPoint(null);
  };

  const handlePlotClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanActive) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const snapped = findNearestInspectedPoint(coords.svgX, coords.svgY);
    if (snapped) {
      setPinnedPoint(snapped);
    }
  };

  // Ticks
  const xTicksCount = width > 650 ? 8 : 6;
  const xTicks = useMemo(() => {
    return Array.from({ length: xTicksCount + 1 }, (_, i) => xMin + (i * xSpan) / xTicksCount);
  }, [xMin, xSpan, xTicksCount]);

  const yTicksCount = secondaryPanel ? 3 : 4;
  const yTicks = useMemo(() => {
    return Array.from({ length: yTicksCount + 1 }, (_, i) => yMin + (i * ySpan) / yTicksCount);
  }, [yMin, ySpan, yTicksCount]);

  const secYTicks = useMemo(() => {
    if (!secondaryPanel) return [];
    return Array.from({ length: 4 }, (_, i) => secYMin + (i * secYSpan) / 3);
  }, [secondaryPanel, secYMin, secYSpan]);

  const zeroY = mapY(0);
  const hasZeroY = zeroY >= padding.top && zeroY <= padding.top + plotHeight;
  const secZeroY = mapSecY(0);
  const hasSecZeroY = secondaryPanel ? secZeroY >= secTop && secZeroY <= secTop + plotHeight : false;

  const content = (
    <div
      className={`bg-white flex flex-col select-none ${
        isExpanded
          ? 'w-screen h-screen p-3 sm:p-4 overflow-hidden'
          : `border border-[#E6E4DD] rounded-md px-2.5 py-1.5 shadow-xs ${className}`
      }`}
    >
      {/* Header with Title and Built-in Interactive Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#E6E4DD]/80 mb-1.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-[14px] font-heading font-semibold tracking-wide uppercase text-[#1A1917] truncate">
            {title}
          </h4>
          {subtitle && (
            <span className="hidden xl:inline text-[13px] font-mono text-[#75736E] truncate">
              {subtitle}
            </span>
          )}
          {statusBadge && (
            <span className="text-[13px] font-mono px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651] shrink-0">
              {statusBadge}
            </span>
          )}
        </div>

        {/* Interactive Toolbar: Optional Controls + Pan, Zoom In, Zoom Out, Reset Axes, Expand */}
        <div className="flex items-center gap-1 shrink-0">
          {headerControls && <div className="mr-1.5 flex items-center">{headerControls}</div>}

          <button
            type="button"
            onClick={() => setIsPanActive(!isPanActive)}
            title={isPanActive ? 'Pan Active (Click & Drag)' : 'Pan / Drag Axes'}
            className={`px-2 py-1 rounded text-[13px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              isPanActive
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6] border border-[#E6E4DD]/70'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pan</span>
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1 rounded text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6] border border-[#E6E4DD]/70 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1 rounded text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6] border border-[#E6E4DD]/70 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleResetAxes}
            title="Reset Axes to Dynamic Limits"
            className={`px-2 py-1 rounded text-[13px] font-mono flex items-center gap-1 transition-colors cursor-pointer border ${
              isViewModified
                ? 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/40 font-semibold'
                : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6] border-[#E6E4DD]/70'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <div className="w-[1px] h-4 bg-[#E6E4DD] mx-0.5" />

          {isExpanded ? (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              aria-label="Close full-screen plot"
              title="Close Full-Screen (ESC)"
              className="px-2.5 py-1 rounded text-[13px] font-mono font-semibold bg-[#1A1917] text-white hover:bg-[#C85A32] transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              aria-label="Expand plot to full screen"
              title="Expand Full-Screen"
              className="p-1 rounded text-[#585651] hover:text-[#C85A32] hover:bg-[#FBF4F0] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Responsive SVG Canvas */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 bg-[#FAF9F6] rounded border border-[#E6E4DD]/60 overflow-hidden"
      >
        <svg
          ref={svgRef}
          width={width}
          height={actualHeight}
          viewBox={`0 0 ${width} ${actualHeight}`}
          className={`w-full h-full block touch-none ${
            isPanActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handlePlotClick}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
            </clipPath>
            {secondaryPanel && (
              <clipPath id={clipIdSecondary}>
                <rect x={padding.left} y={secTop} width={plotWidth} height={plotHeight} />
              </clipPath>
            )}
          </defs>

          {/* Grid lines */}
          <g className="grid-lines" stroke="#E6E4DD" strokeWidth="0.75" strokeDasharray="3 3">
            {xTicks.map((xVal, idx) =>
              secondaryPanel ? (
                <React.Fragment key={`x-${idx}`}>
                  <line
                    x1={mapX(xVal)}
                    y1={padding.top}
                    x2={mapX(xVal)}
                    y2={padding.top + plotHeight}
                  />
                  <line
                    x1={mapX(xVal)}
                    y1={secTop}
                    x2={mapX(xVal)}
                    y2={secTop + plotHeight}
                  />
                </React.Fragment>
              ) : (
                <line
                  key={`x-${idx}`}
                  x1={mapX(xVal)}
                  y1={padding.top}
                  x2={mapX(xVal)}
                  y2={actualHeight - padding.bottom}
                />
              )
            )}
            {yTicks.map((yVal, idx) => (
              <line
                key={`y-${idx}`}
                x1={padding.left}
                y1={mapY(yVal)}
                x2={width - padding.right}
                y2={mapY(yVal)}
              />
            ))}
            {secondaryPanel &&
              secYTicks.map((yVal, idx) => (
                <line
                  key={`sy-${idx}`}
                  x1={padding.left}
                  y1={mapSecY(yVal)}
                  x2={width - padding.right}
                  y2={mapSecY(yVal)}
                />
              ))}
          </g>

          {/* Zero baseline(s) */}
          {hasZeroY && (
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="#8A8882"
              strokeWidth="1"
            />
          )}
          {hasSecZeroY && (
            <line
              x1={padding.left}
              y1={secZeroY}
              x2={width - padding.right}
              y2={secZeroY}
              stroke="#8A8882"
              strokeWidth="1"
            />
          )}

          {/* Carson Bandwidth Shaded Regions */}
          {(() => {
            const placedPills: { left: number; right: number }[] = [];
            return normalizedCarsonBands.map((band, bIdx) => {
              const xLeft = mapX(band.leftFreq);
              const xRight = mapX(band.rightFreq);
              const bandW = Math.max(0, xRight - xLeft);
              const bandColor = band.color || '#D97706';

              if (xRight < padding.left || xLeft > width - padding.right || bandW <= 0) return null;

              const pillX = Math.min(
                width - padding.right - 224,
                Math.max(padding.left + 8, xLeft + bandW / 2 - 110)
              );
              const canShowPill =
                Boolean(band.label) &&
                !placedPills.some((p) => !(pillX + 224 < p.left || pillX > p.right));
              if (canShowPill) {
                placedPills.push({ left: pillX - 4, right: pillX + 224 });
              }

              return (
                <g key={`carson-band-${bIdx}`} clipPath={`url(#${clipId})`}>
                  <rect
                    x={xLeft}
                    y={padding.top}
                    width={bandW}
                    height={plotHeight}
                    fill={bandColor}
                    fillOpacity="0.11"
                  />
                  <line
                    x1={xLeft}
                    y1={padding.top}
                    x2={xLeft}
                    y2={padding.top + plotHeight}
                    stroke={bandColor}
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={xRight}
                    y1={padding.top}
                    x2={xRight}
                    y2={padding.top + plotHeight}
                    stroke={bandColor}
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  {canShowPill && band.label && (
                    <g>
                      <rect
                        x={pillX}
                        y={padding.top + 6}
                        width="220"
                        height="22"
                        rx="4"
                        fill="#FFFBEB"
                        fillOpacity="0.94"
                        stroke={bandColor}
                        strokeOpacity="0.45"
                        strokeWidth="0.9"
                      />
                      <text
                        x={pillX + 110}
                        y={padding.top + 21}
                        textAnchor="middle"
                        fontSize="13"
                        fontFamily="monospace"
                        fill={bandColor}
                        fontWeight="bold"
                      >
                        {band.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            });
          })()}

          {/* Reference Lines (Horizontal & Vertical) */}
          <g clipPath={`url(#${clipId})`}>
            {referenceLines.map((ref, idx) => {
              if (ref.y !== undefined) {
                const ry = mapY(ref.y);
                if (ry < padding.top - 5 || ry > actualHeight - padding.bottom + 5) return null;
                return (
                  <g key={`ref-y-${idx}`}>
                    <line
                      x1={padding.left}
                      y1={ry}
                      x2={width - padding.right}
                      y2={ry}
                      stroke={ref.color || '#C85A32'}
                      strokeWidth="1"
                      strokeDasharray={ref.style === 'solid' ? undefined : '4 3'}
                      strokeOpacity="0.8"
                    />
                    <text
                      x={width - padding.right - 6}
                      y={ry - 5}
                      textAnchor="end"
                      fontSize="13"
                      fontFamily="monospace"
                      fill={ref.color || '#C85A32'}
                      fontWeight="bold"
                    >
                      {ref.label}
                    </text>
                  </g>
                );
              }
              if (ref.x !== undefined) {
                const rx = mapX(ref.x);
                return (
                  <g key={`ref-x-${idx}`}>
                    <line
                      x1={rx}
                      y1={padding.top}
                      x2={rx}
                      y2={actualHeight - padding.bottom}
                      stroke={ref.color || '#C85A32'}
                      strokeWidth="1"
                      strokeDasharray={ref.style === 'solid' ? undefined : '4 3'}
                    />
                    <text
                      x={rx + 4}
                      y={padding.top + 16}
                      textAnchor="start"
                      fontSize="13"
                      fontFamily="monospace"
                      fill={ref.color || '#C85A32'}
                      fontWeight="bold"
                    >
                      {ref.label}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </g>

          {/* Series Curves and Discrete Spectral Lines */}
          <g clipPath={`url(#${clipId})`}>
            {series.map((s) => {
              if (s.type === 'spectrum' && s.spectralLines) {
                const basePy = mapY(0);
                // Format compact labels (±f_m, ±2f_m, f_c) and place them with staggering & collision avoidance
                const visibleStems = s.spectralLines.filter(
                  (line) => line.freq >= xMin - xSpan * 0.05 && line.freq <= xMax + xSpan * 0.05
                );

                type LabelBox = { left: number; right: number; top: number; bottom: number };
                const placedBoxes: LabelBox[] = [...carsonPillBoxes];

                // Prioritize carrier (n=0), then lower harmonic orders & larger amplitudes
                const labelCandidates = visibleStems
                  .filter(
                    (line) =>
                      line.harmonicOrder === 0 ||
                      (Math.abs(line.harmonicOrder) <= 5 && line.amplitude > 0.015)
                  )
                  .slice()
                  .sort((a, b) => {
                    if (a.harmonicOrder === 0) return -1;
                    if (b.harmonicOrder === 0) return 1;
                    const orderDiff = Math.abs(a.harmonicOrder) - Math.abs(b.harmonicOrder);
                    if (orderDiff !== 0) return orderDiff;
                    return b.amplitude - a.amplitude;
                  });

                const placedLabels = new Map<string, { text: string; x: number; y: number; staggered: boolean }>();

                for (const line of labelCandidates) {
                  const lx = mapX(line.freq);
                  const ly = mapY(line.amplitude);
                  const n = line.harmonicOrder;
                  const offsetOrder =
                    line.offsetOrder ?? (line.side === 'negative' ? -n : n);
                  let shortText: string;
                  if (n === 0) {
                    shortText = line.side === 'negative' ? '-f_c' : 'f_c';
                  } else {
                    const absOrder = Math.abs(offsetOrder);
                    const sign = offsetOrder > 0 ? '+' : '-';
                    shortText = `${sign}${absOrder}f_m`;
                  }

                  const boxWidth = shortText.length * 8 + 8;
                  const halfW = boxWidth / 2;
                  const clampedX = Math.min(
                    width - padding.right - halfW - 2,
                    Math.max(padding.left + halfW + 2, lx)
                  );

                  // Try vertical stagger tiers (above first, then slightly below tip if near top ceiling)
                  const tierOffsets = [-9, -25, -41, 18, 34];
                  let chosenY: number | null = null;
                  let isStaggered = false;

                  for (let tIdx = 0; tIdx < tierOffsets.length; tIdx++) {
                    const candidateY = ly + tierOffsets[tIdx];
                    if (candidateY < padding.top + 15 || candidateY > basePy - 5) continue;

                    const box: LabelBox = {
                      left: clampedX - halfW,
                      right: clampedX + halfW,
                      top: candidateY - 13,
                      bottom: candidateY + 3,
                    };

                    const overlaps = placedBoxes.some(
                      (b) => !(box.right < b.left || box.left > b.right || box.bottom < b.top || box.top > b.bottom)
                    );
                    if (!overlaps) {
                      chosenY = candidateY;
                      isStaggered = tIdx > 0 && Math.abs(ly - candidateY) > 14;
                      placedBoxes.push(box);
                      break;
                    }
                  }

                  if (chosenY !== null) {
                    placedLabels.set(`${line.side}-${line.harmonicOrder}-${line.freq}`, {
                      text: shortText,
                      x: clampedX,
                      y: chosenY,
                      staggered: isStaggered,
                    });
                  }
                }

                return (
                  <g key={s.id} className="spectral-lines">
                    {visibleStems.map((line, lIdx) => {
                      const lx = mapX(line.freq);
                      const ly = mapY(line.amplitude);
                      const isCarrier = line.harmonicOrder === 0;
                      const labelPlacement = placedLabels.get(
                        `${line.side}-${line.harmonicOrder}-${line.freq}`
                      );

                      return (
                        <g key={`spec-${lIdx}`}>
                          <line
                            x1={lx}
                            y1={basePy}
                            x2={lx}
                            y2={ly}
                            stroke={isCarrier ? '#C85A32' : s.color}
                            strokeWidth={isCarrier ? 2.4 : 1.7}
                          />
                          <circle
                            cx={lx}
                            cy={ly}
                            r={isCarrier ? 3.5 : 2.6}
                            fill={isCarrier ? '#C85A32' : s.color}
                          />
                          {labelPlacement && (
                            <>
                              {labelPlacement.staggered && (
                                <line
                                  x1={lx}
                                  y1={ly - 3}
                                  x2={labelPlacement.x}
                                  y2={labelPlacement.y + 3}
                                  stroke={isCarrier ? '#C85A32' : '#8A8882'}
                                  strokeWidth="0.9"
                                  strokeOpacity="0.5"
                                  strokeDasharray="2 2"
                                />
                              )}
                              <text
                                x={labelPlacement.x}
                                y={labelPlacement.y}
                                textAnchor="middle"
                                fontSize="13"
                                fontFamily="monospace"
                                fill={isCarrier ? '#C85A32' : '#585651'}
                                fontWeight={isCarrier ? 'bold' : 'normal'}
                                stroke="#FAF9F6"
                                strokeWidth="3"
                                paintOrder="stroke"
                              >
                                {labelPlacement.text}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              }

              const pts = s.points || [];
              if (pts.length === 0) return null;

              const pathData = pts
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapY(p.y).toFixed(1)}`)
                .join(' ');

              return (
                <path
                  key={s.id}
                  d={pathData}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.strokeWidth || 1.8}
                  strokeDasharray={s.dash}
                />
              );
            })}

            {/* Active Marker */}
            {activeMarker && (
              <g className="active-marker">
                <circle
                  cx={mapX(activeMarker.x)}
                  cy={mapY(activeMarker.y)}
                  r="6"
                  fill="none"
                  stroke={activeMarker.color || '#C85A32'}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={mapX(activeMarker.x)}
                  cy={mapY(activeMarker.y)}
                  r="3.2"
                  fill={activeMarker.color || '#C85A32'}
                />
                {activeMarker.label && (
                  <text
                    x={mapX(activeMarker.x) + 8}
                    y={mapY(activeMarker.y) - 6}
                    fontSize="13"
                    fontFamily="monospace"
                    fill={activeMarker.color || '#C85A32'}
                    fontWeight="bold"
                  >
                    {activeMarker.label}
                  </text>
                )}
              </g>
            )}
          </g>

          {/* Secondary Split Panel (Directly Below Top Panel Sharing Exact X-Axis) */}
          {secondaryPanel && (
            <>
              <g clipPath={`url(#${clipIdSecondary})`}>
                {(secondaryPanel.referenceLines || []).map((ref, idx) => {
                  if (ref.y === undefined) return null;
                  const ry = mapSecY(ref.y);
                  if (ry < secTop - 5 || ry > secTop + plotHeight + 5) return null;
                  return (
                    <g key={`sec-ref-y-${idx}`}>
                      <line
                        x1={padding.left}
                        y1={ry}
                        x2={width - padding.right}
                        y2={ry}
                        stroke={ref.color || '#C85A32'}
                        strokeWidth="1"
                        strokeDasharray={ref.style === 'solid' ? undefined : '4 3'}
                        strokeOpacity="0.8"
                      />
                      <text
                        x={width - padding.right - 6}
                        y={ry - 5}
                        textAnchor="end"
                        fontSize="13"
                        fontFamily="monospace"
                        fill={ref.color || '#C85A32'}
                        fontWeight="bold"
                      >
                        {ref.label}
                      </text>
                    </g>
                  );
                })}
                {secondaryPanel.series.map((s) => {
                  const pts = s.points || [];
                  if (pts.length === 0) return null;
                  const pathData = pts
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapSecY(p.y).toFixed(1)}`)
                    .join(' ');
                  return (
                    <path
                      key={s.id}
                      d={pathData}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.strokeWidth || 1.8}
                      strokeDasharray={s.dash}
                    />
                  );
                })}
              </g>

              {topPanelTitle && (
                <text
                  x={padding.left}
                  y={padding.top - 9}
                  fontSize="13"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill="#C85A32"
                >
                  {topPanelTitle}
                </text>
              )}
              {secondaryPanel.title && (
                <text
                  x={padding.left}
                  y={secTop - 9}
                  fontSize="13"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill="#1A1917"
                >
                  {secondaryPanel.title}
                </text>
              )}
            </>
          )}

          {/* Plot Border(s) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="none"
            stroke="#E6E4DD"
            strokeWidth="1"
          />
          {secondaryPanel && (
            <rect
              x={padding.left}
              y={secTop}
              width={plotWidth}
              height={plotHeight}
              fill="none"
              stroke="#E6E4DD"
              strokeWidth="1"
            />
          )}

          {/* Ticks and Labels */}
          <g className="ticks" fontSize="13" fontFamily="monospace" fill="#585651">
            {xTicks.map((xVal, i) => (
              <text key={`tx-${i}`} x={mapX(xVal)} y={actualHeight - padding.bottom + 18} textAnchor="middle">
                {formatTickValue(xVal, xSpan)}
              </text>
            ))}
            {yTicks.map((yVal, i) => (
              <text key={`ty-${i}`} x={padding.left - 8} y={mapY(yVal) + 4} textAnchor="end">
                {formatTickValue(yVal, ySpan)}
              </text>
            ))}
            {secondaryPanel &&
              secYTicks.map((yVal, i) => (
                <text key={`sty-${i}`} x={padding.left - 8} y={mapSecY(yVal) + 4} textAnchor="end">
                  {formatTickValue(yVal, secYSpan)}
                </text>
              ))}
          </g>

          {/* Axes labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={actualHeight - 8}
            textAnchor="middle"
            fontSize="14"
            fontFamily="monospace"
            fill="#1A1917"
            fontWeight="bold"
          >
            {xLabel}
          </text>
          <text
            x={18}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fontFamily="monospace"
            fill="#1A1917"
            fontWeight="bold"
            transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}
          >
            {yLabel}
          </text>
          {secondaryPanel && (
            <text
              x={18}
              y={secTop + plotHeight / 2}
              textAnchor="middle"
              fontSize="14"
              fontFamily="monospace"
              fill="#1A1917"
              fontWeight="bold"
              transform={`rotate(-90 18 ${secTop + plotHeight / 2})`}
            >
              {secondaryPanel.yLabel}
            </text>
          )}

          {/* Oscilloscope Hover Crosshair & Snap Highlight */}
          {hoveredPoint && !isPanActive && (() => {
            const isSec = hoveredPoint.panel === 'secondary' && Boolean(secondaryPanel);
            const hx = mapX(hoveredPoint.x);
            const hy = isSec ? mapSecY(hoveredPoint.y) : mapY(hoveredPoint.y);
            const topBound = isSec ? secTop : padding.top;
            const bottomBound = topBound + plotHeight;

            if (hx < padding.left || hx > width - padding.right || hy < topBound - 2 || hy > bottomBound + 2) {
              return null;
            }

            return (
              <g className="pointer-events-none">
                <line
                  x1={hx}
                  y1={topBound}
                  x2={hx}
                  y2={bottomBound}
                  stroke="#1A1917"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1={padding.left}
                  y1={hy}
                  x2={width - padding.right}
                  y2={hy}
                  stroke="#1A1917"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hx}
                  cy={hy}
                  r="5.5"
                  fill="#FFFFFF"
                  fillOpacity="0.9"
                  stroke={hoveredPoint.color}
                  strokeWidth="2"
                />
                <circle cx={hx} cy={hy} r="2.8" fill={hoveredPoint.color} />
              </g>
            );
          })()}

          {/* Click-to-Pin Target Marker */}
          {pinnedPoint && (() => {
            const isSec = pinnedPoint.panel === 'secondary' && Boolean(secondaryPanel);
            const px = mapX(pinnedPoint.x);
            const py = isSec ? mapSecY(pinnedPoint.y) : mapY(pinnedPoint.y);
            const topBound = isSec ? secTop : padding.top;
            const bottomBound = topBound + plotHeight;

            if (px < padding.left || px > width - padding.right || py < topBound - 2 || py > bottomBound + 2) {
              return null;
            }

            return (
              <g className="pointer-events-none">
                <line
                  x1={px}
                  y1={Math.max(topBound, py - 14)}
                  x2={px}
                  y2={Math.min(bottomBound, py + 14)}
                  stroke="#1A1917"
                  strokeWidth="1.2"
                  strokeOpacity="0.7"
                />
                <line
                  x1={Math.max(padding.left, px - 14)}
                  y1={py}
                  x2={Math.min(width - padding.right, px + 14)}
                  y2={py}
                  stroke="#1A1917"
                  strokeWidth="1.2"
                  strokeOpacity="0.7"
                />
                <circle
                  cx={px}
                  cy={py}
                  r="8"
                  fill="#FFFFFF"
                  fillOpacity="0.75"
                  stroke="#1A1917"
                  strokeWidth="1.8"
                />
                <circle
                  cx={px}
                  cy={py}
                  r="4"
                  fill="#C85A32"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                />
              </g>
            );
          })()}
        </svg>

        {/* Live Hover Coordinate Tooltip */}
        {hoveredPoint && !isPanActive && (() => {
          const isSec = hoveredPoint.panel === 'secondary' && Boolean(secondaryPanel);
          const hx = mapX(hoveredPoint.x);
          const hy = isSec ? mapSecY(hoveredPoint.y) : mapY(hoveredPoint.y);
          const activeYSpan = isSec ? secYSpan : ySpan;
          const flipLeft = hx > width - 250;
          const flipBelow = hy < 70;
          const xFormatted = `${xInfo.symbol} = ${formatCoordValue(hoveredPoint.x, xSpan)}${
            hoveredPoint.xUnit ? ` ${hoveredPoint.xUnit}` : ''
          }${hoveredPoint.harmonicNote ? ` (${hoveredPoint.harmonicNote})` : ''}`;
          const yFormatted = `${hoveredPoint.seriesSymbol} = ${formatCoordValue(hoveredPoint.y, activeYSpan)}${
            hoveredPoint.yUnit ? ` ${hoveredPoint.yUnit}` : ''
          }`;

          return (
            <div
              className="absolute z-30 pointer-events-none bg-[#1A1917]/95 text-white px-2.5 py-1.5 rounded-md shadow-md border border-white/15 text-[13px] font-mono whitespace-nowrap"
              style={{
                left: flipLeft ? `${Math.max(8, hx - 12)}px` : `${Math.min(width - 12, hx + 12)}px`,
                top: flipBelow ? `${hy + 12}px` : `${Math.max(8, hy - 12)}px`,
                transform: `translate(${flipLeft ? '-100%' : '0%'}, ${flipBelow ? '0%' : '-100%'})`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                  style={{ backgroundColor: hoveredPoint.color }}
                />
                <span>
                  {xFormatted}, {yFormatted}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Pinned Coordinate Readout Badge with Clear Button */}
        {pinnedPoint && (() => {
          const isSec = pinnedPoint.panel === 'secondary' && Boolean(secondaryPanel);
          const activeYSpan = isSec ? secYSpan : ySpan;
          const xFormatted = `${xInfo.symbol} = ${formatCoordValue(pinnedPoint.x, xSpan)}${
            pinnedPoint.xUnit ? ` ${pinnedPoint.xUnit}` : ''
          }${pinnedPoint.harmonicNote ? ` (${pinnedPoint.harmonicNote})` : ''}`;
          const yFormatted = `${pinnedPoint.seriesSymbol} = ${formatCoordValue(pinnedPoint.y, activeYSpan)}${
            pinnedPoint.yUnit ? ` ${pinnedPoint.yUnit}` : ''
          }`;

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-7 z-20 bg-[#1A1917] text-white border border-[#C85A32]/70 rounded-md px-2.5 py-1 shadow-md flex items-center gap-2.5 text-[13px] font-mono"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#C85A32] shrink-0" />
              <span className="font-semibold text-[#FDE68A]">Pinned</span>
              <span>
                {xFormatted}, {yFormatted}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedPoint(null);
                }}
                className="ml-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#C85A32] text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear pinned marker"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          );
        })()}
      </div>

      {/* Series Legend */}
      {(series.length > 0 || (secondaryPanel?.series?.length ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[13px] font-mono text-[#585651] shrink-0">
          {[...series, ...(secondaryPanel?.series || [])].map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span
                className="w-4 h-0.5 rounded inline-block"
                style={{
                  backgroundColor: s.color,
                  borderTop: s.dash ? '1.5px dashed' : undefined,
                }}
              />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isExpanded) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} full-screen view`}
        className="fixed inset-0 z-[100] w-screen h-screen bg-white overflow-hidden"
      >
        {content}
      </div>,
      document.body
    );
  }

  return content;
};
