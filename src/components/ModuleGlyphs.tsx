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

    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
  }
};
