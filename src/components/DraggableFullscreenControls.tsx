import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical, CornerDownLeft } from 'lucide-react';

export interface DraggableFullscreenControlsProps {
  children: React.ReactNode;
  /**
   * 'docked': Starts docked in normal flex flow at the bottom of the fullscreen view.
   *           On first drag, smoothly detaches into fixed floating coordinates with zero jump.
   * 'overlay': Starts as an absolute bottom-center floating overlay inside a relative stage.
   *            On drag, moves freely anywhere across the viewport via fixed coordinates.
   */
  variant?: 'docked' | 'overlay';
  /** Surface styling classes (background, border, padding, width, etc.) */
  className?: string;
  /** Tooltip / aria-label for the drag handle */
  dragLabel?: string;
  /** Minimum margin in pixels to keep from viewport edges */
  edgeMargin?: number;
}

const INTERACTIVE_SELECTOR =
  'button, input, select, textarea, a, label, [role="button"], [role="slider"], [data-no-drag="true"]';

export const DraggableFullscreenControls: React.FC<DraggableFullscreenControlsProps> = ({
  children,
  variant = 'docked',
  className = '',
  dragLabel = 'Drag to move controls anywhere (double-click to reset position)',
  edgeMargin = 8,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [floatingWidth, setFloatingWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    hasMoved: boolean;
  } | null>(null);

  const clampCoordinates = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxX = Math.max(edgeMargin, vw - width - edgeMargin);
      const maxY = Math.max(edgeMargin, vh - height - edgeMargin);
      return {
        x: Math.min(Math.max(edgeMargin, x), maxX),
        y: Math.min(Math.max(edgeMargin, y), maxY),
      };
    },
    [edgeMargin]
  );

  const isDetached = position !== null;

  // Keep floating controls clamped inside the viewport on window resize or content expand/collapse
  useEffect(() => {
    if (!isDetached) return;

    const reClamp = () => {
      const el = containerRef.current;
      if (!el) return;
      const vw = window.innerWidth;
      const maxAllowedWidth = Math.max(260, vw - edgeMargin * 2);

      if (variant === 'docked' && floatingWidth && floatingWidth > maxAllowedWidth) {
        setFloatingWidth(maxAllowedWidth);
      }

      const rect = el.getBoundingClientRect();
      setPosition((prev) => {
        if (!prev) return prev;
        const clamped = clampCoordinates(prev.x, prev.y, rect.width, rect.height);
        if (Math.abs(clamped.x - prev.x) < 0.5 && Math.abs(clamped.y - prev.y) < 0.5) {
          return prev;
        }
        return clamped;
      });
    };

    window.addEventListener('resize', reClamp);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        reClamp();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', reClamp);
      if (observer) observer.disconnect();
    };
  }, [isDetached, variant, floatingWidth, edgeMargin, clampCoordinates]);

  const handleResetPosition = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setPosition(null);
    setFloatingWidth(null);
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary button for mouse events
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const isHandle = Boolean(target.closest('[data-drag-handle="true"]'));
    if (!isHandle && target.closest(INTERACTIVE_SELECTOR)) {
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      hasMoved: false,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }

    // Prevent canvas underneath from receiving pointer events
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.hasMoved) {
      if (Math.hypot(dx, dy) < 3) return;
      drag.hasMoved = true;
      setIsDragging(true);
      if (variant === 'docked' && floatingWidth === null) {
        const maxAllowedWidth = Math.max(260, window.innerWidth - edgeMargin * 2);
        setFloatingWidth(Math.min(drag.width, maxAllowedWidth));
      }
    }

    const nextPos = clampCoordinates(
      drag.originX + dx,
      drag.originY + dy,
      drag.width,
      drag.height
    );
    setPosition(nextPos);
    e.stopPropagation();
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    dragStateRef.current = null;
    setIsDragging(false);
  };

  const positioningClasses = isDetached
    ? 'fixed z-50 bg-white/95 backdrop-blur-md shadow-xl'
    : variant === 'overlay'
    ? 'absolute bottom-3 left-1/2 -translate-x-1/2 z-30'
    : 'sticky bottom-0 shrink-0 z-30';

  const inlineStyle: React.CSSProperties | undefined = isDetached
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        margin: 0,
        ...(variant === 'docked' && floatingWidth
          ? {
              width: `${floatingWidth}px`,
              maxWidth: `calc(100vw - ${edgeMargin * 2}px)`,
            }
          : {}),
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      style={inlineStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`${positioningClasses} ${className} transition-shadow ${
        isDragging
          ? 'ring-2 ring-[#C85A32]/40 shadow-2xl select-none cursor-grabbing'
          : ''
      }`}
    >
      <div className="flex items-stretch gap-2.5">
        {/* Left Drag Handle Rail + Optional Dock/Reset Button */}
        <div className="flex flex-col items-center justify-center gap-1 pr-2 border-r border-[#E6E4DD] shrink-0">
          <div
            data-drag-handle="true"
            role="button"
            tabIndex={0}
            aria-label={dragLabel}
            title={dragLabel}
            onDoubleClick={handleResetPosition}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleResetPosition();
              }
            }}
            className={`touch-none select-none flex flex-col items-center justify-center px-1 py-1.5 rounded text-[#8A8882] hover:text-[#C85A32] hover:bg-[#FBF4F0] transition-colors ${
              isDragging ? 'cursor-grabbing text-[#C85A32] bg-[#FBF4F0]' : 'cursor-grab'
            }`}
          >
            <GripVertical className="w-4 h-4" />
            <span className="text-[8px] font-mono uppercase tracking-wider font-semibold leading-none mt-0.5 hidden sm:block">
              Drag
            </span>
          </div>

          {isDetached && (
            <button
              type="button"
              onClick={handleResetPosition}
              title={variant === 'docked' ? 'Dock back to bottom' : 'Reset to bottom center'}
              aria-label={variant === 'docked' ? 'Dock back to bottom' : 'Reset to bottom center'}
              className="px-1 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651] hover:text-[#C85A32] hover:border-[#C85A32]/50 cursor-pointer transition-colors flex items-center gap-0.5 text-[9px] font-mono font-semibold"
            >
              <CornerDownLeft className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Dock</span>
            </button>
          )}
        </div>

        {/* Controls Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};
