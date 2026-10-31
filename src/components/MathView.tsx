import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  displayMode?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  displayMode = false,
  className = '',
  ariaLabel,
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        strict: false,
        output: 'htmlAndMathml',
      });
    } catch (err) {
      // Graceful fallback if invalid expression
      return `<span class="font-mono text-xs text-[#585651]">${math}</span>`;
    }
  }, [math, displayMode]);

  return (
    <span
      className={`font-math select-text ${displayMode ? 'block overflow-x-auto py-1 max-w-full' : 'inline-block'} ${className}`}
      aria-label={ariaLabel || math}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
