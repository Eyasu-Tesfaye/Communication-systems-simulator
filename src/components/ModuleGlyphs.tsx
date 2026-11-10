import React from 'react';

interface GlyphProps {
  id: string;
  className?: string;
  accent?: boolean;
}

export const ModuleGlyph: React.FC<GlyphProps> = ({ id, className = 'w-5 h-5', accent = false }) => {
  const strokeColor = accent ? '#C85A32' : 'currentColor';

  switch (id) {
    case 'signals':
      // Waveform sine
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 12h3c2 0 2-7 4-7s2 14 4 14 2-7 4-7h5" />
        </svg>
      );

    case 'fourier':
      // Frequency discrete spectrum spikes
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M3 19h18" />
          <path d="M7 19v-6" />
          <path d="M12 19V5" />
          <path d="M17 19v-10" />
          <circle cx="12" cy="5" r="1.25" fill={strokeColor} />
          <circle cx="7" cy="13" r="1.25" fill={strokeColor} />
          <circle cx="17" cy="9" r="1.25" fill={strokeColor} />
        </svg>
      );

    case 'complex-signals':
      // Complex plane unit circle and phasor
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" strokeDasharray="2 2" strokeOpacity="0.6" />
          <path d="M12 3v18" strokeOpacity="0.4" />
          <path d="M3 12h18" strokeOpacity="0.4" />
          <path d="M12 12l5.5-5.5" strokeWidth="2" />
          <circle cx="17.5" cy="6.5" r="1.5" fill={strokeColor} />
        </svg>
      );

    case 'convolution':
      // Overlapping signal kernels
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M3 18h18" strokeOpacity="0.4" />
          <path d="M4 18l3-10h4l3 10" strokeOpacity="0.5" />
          <path d="M10 18l3-12h4l3 12" strokeWidth="2" />
        </svg>
      );

    case 'probability':
      // Gaussian normal distribution bell curve
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 19h20" strokeOpacity="0.4" />
          <path d="M3 18.5c3 0 5-1.5 7-7.5 1-3 1.5-5 2-5s1 2 2 5c2 6 4 7.5 7 7.5" strokeWidth="2" />
          <path d="M12 6v13" strokeDasharray="1.5 1.5" strokeOpacity="0.5" />
        </svg>
      );

    case 'random-processes':
      // Stochastic realization trajectory
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 12h20" strokeDasharray="1.5 2" strokeOpacity="0.3" />
          <path d="M2 13l3-4 3 6 4-8 4 6 3-3 3 2" strokeWidth="1.75" />
        </svg>
      );

    case 'correlation-spectrum':
      // Symmetrical autocorrelation peak
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 18h20" strokeOpacity="0.4" />
          <path d="M3 17.5c4-0.5 7-1 8-11.5 1 10.5 4 11 8 11.5" strokeWidth="2" />
          <path d="M12 6v12" strokeDasharray="1.5 2" strokeOpacity="0.6" />
        </svg>
      );

    case 'cam':
    case 'am':
      // Conventional AM envelope with carrier oscillations
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 7c3 0 4 6 7 6s4-6 7-6 4 6 6 6" strokeDasharray="1.5 1.5" strokeOpacity="0.5" />
          <path d="M2 17c3 0 4-6 7-6s4 6 7 6 4-6 6-6" strokeDasharray="1.5 1.5" strokeOpacity="0.5" />
          <path d="M2 12l2-4 2 8 2-8 2 8 2-8 2 8 2-8 2 8 2-8 2 8 2-4" strokeWidth="1.25" />
        </svg>
      );

    case 'dsb-sc':
      // Double sideband suppressed carrier envelope waist and phase flip
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 12c3-6 5-6 7 0s4 6 7 0 4-6 6 0" strokeOpacity="0.4" />
          <path d="M2 12c3 6 5 6 7 0s4-6 7 0 4 6 6 0" strokeOpacity="0.4" />
          <path d="M2 12l1.5-3 1.5 6 1.5-6 1.5 6 2-3 2 3 1.5-6 1.5 6 1.5-6 1.5 6 2-3 2 3" strokeWidth="1.25" />
          <circle cx="9" cy="12" r="1.5" fill={strokeColor} />
          <circle cx="16" cy="12" r="1.5" fill={strokeColor} />
        </svg>
      );

    case 'ssb':
      // Single sideband frequency spectrum slice
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 19h20" strokeOpacity="0.4" />
          <path d="M8 19v-3" strokeDasharray="1.5 1.5" strokeOpacity="0.5" />
          <path d="M15 19V7" strokeWidth="2" />
          <circle cx="15" cy="7" r="1.5" fill={strokeColor} />
          <path d="M11 19c0-8 4-8 4-8s4 0 4 8" strokeWidth="1.25" strokeOpacity="0.7" />
        </svg>
      );

    case 'vsb':
      // Vestigial sideband filter slope
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 19h20" strokeOpacity="0.4" />
          <path d="M4 19l4-12h7l4 12" strokeWidth="1.5" strokeOpacity="0.4" />
          <path d="M6 19l3-12h8l2 12" strokeWidth="2" />
          <path d="M11 6v13" strokeDasharray="1.5 2" strokeOpacity="0.6" />
        </svg>
      );

    case 'fm':
      // Frequency Modulation: variable density sine waves
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2 12c1-6 2-6 3 0s1 6 2 0 2-6 4 0 3 6 5 0 2-6 3 0 2 6 3 0" strokeWidth="1.5" />
        </svg>
      );

    case 'am-pm':
    case 'pm':
      // Phase Modulation / Angle & Phase Shift
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" strokeOpacity="0.4" strokeDasharray="2 2" />
          <path d="M12 12l5-5" strokeWidth="2" />
          <path d="M12 12l2 6" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="17" cy="7" r="1.5" fill={strokeColor} />
          <path d="M15 10a4 4 0 0 1 0 4" strokeWidth="1.25" strokeOpacity="0.75" />
        </svg>
      );

    case 'demodulation':
      // Diode envelope detector / demodulation
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M3 12h5" />
          <polygon points="8,8 14,12 8,16" fill={accent ? '#C85A32' : 'currentColor'} fillOpacity="0.2" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="14" y1="8" x2="14" y2="16" stroke={strokeColor} strokeWidth="1.5" />
          <path d="M14 12h7" />
          <path d="M18 12v3" strokeOpacity="0.7" />
          <line x1="16" y1="15" x2="20" y2="15" strokeWidth="1.5" />
          <line x1="16" y1="18" x2="20" y2="18" strokeWidth="1.5" />
          <path d="M18 18v2" strokeOpacity="0.7" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
  }
};
