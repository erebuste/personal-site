interface Props {
  text: string;
  blur: number;
  onEnter: () => void;
}

/** Full-screen click barrier; the click is the user gesture that unlocks audio autoplay. */
export function ClickToEnterOverlay({ text, blur, onEnter }: Props) {
  return (
    <button
      type="button"
      autoFocus
      onClick={onEnter}
      className="fixed inset-0 z-45 grid cursor-pointer place-items-center bg-black/30 outline-none"
      style={{ backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` }}
    >
      <span className="animate-pulse text-base font-medium tracking-wide text-white/90">{text}</span>
    </button>
  );
}
