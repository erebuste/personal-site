import type { CSSProperties } from 'react';

interface Props {
  src: string;
  className?: string;
  style?: CSSProperties;
}

/** Image, gif or looping muted .mp4, decided by extension. */
export function Media({ src, className, style }: Props) {
  return /\.mp4($|\?)/i.test(src) ? (
    <video src={src} autoPlay muted loop playsInline className={className} style={style} />
  ) : (
    <img src={src} alt="" draggable={false} className={className} style={style} />
  );
}
