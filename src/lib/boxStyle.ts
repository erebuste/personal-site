import type { CSSProperties } from 'react';
import type { BoxConfig } from '../types';

/** `#rrggbb` + 0–100 opacity → `#rrggbbaa`. */
export const withAlpha = (hex: string, opacityPct: number): string =>
  hex + Math.round((opacityPct / 100) * 255).toString(16).padStart(2, '0');

export const boxStyle = (b: BoxConfig): CSSProperties => ({
  width: '100%',
  maxWidth: b.width,
  backgroundColor: withAlpha(b.color, b.opacity),
  backdropFilter: `blur(${b.blur}px)`,
  WebkitBackdropFilter: `blur(${b.blur}px)`,
  borderRadius: b.radius,
  border: `${b.borderWidth}px ${b.borderStyle} ${withAlpha(b.borderColor, b.borderOpacity)}`,
  boxShadow: `0 8px 32px ${withAlpha(b.shadowColor, b.shadowOpacity)}`,
});
