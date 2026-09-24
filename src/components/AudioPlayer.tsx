import { useEffect, useState, type RefObject } from 'react';
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { AudioTrackConfig, ThemeConfig } from '../types';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** iOS ignores audio.volume (hardware buttons only), so a slider there would do nothing. */
function volumeIsSettable(): boolean {
  const probe = new Audio();
  probe.volume = 0.5;
  return probe.volume === 0.5;
}

interface Props {
  audioRef: RefObject<HTMLAudioElement | null>;
  src: string;
  track: AudioTrackConfig;
  theme: ThemeConfig;
  visible: boolean;
}

export function AudioPlayer({ audioRef, src, track, theme, visible }: Props) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(track.volume / 100);
  const [canSetVolume] = useState(volumeIsSettable);
  const [failed, setFailed] = useState(false);

  const silent = muted || volume === 0;
  const VolumeIcon = silent ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!silent) {
      el.muted = true;
      return;
    }
    el.muted = false;
    if (el.volume === 0) el.volume = 0.5; // unmuting from a slider dragged to 0
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = track.volume / 100;
  }, [audioRef, track.volume]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setFailed(true));
    else el.pause();
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onError={() => setFailed(true)}
      />

      {visible && !failed && (
        <div className="animate-fade-in fixed bottom-4 left-4 z-30 flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 backdrop-blur-xl">
          {track.cover && <img src={track.cover} alt="" className="size-10 shrink-0 rounded-md object-cover" />}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 transition-all duration-200 hover:scale-105 hover:bg-white/20"
          >
            {playing ? <Pause className="size-3.5" fill="currentColor" /> : <Play className="size-3.5" fill="currentColor" />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold" style={{ color: theme.primaryText }}>
              {track.title}
            </p>
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={time}
              onChange={(e) => {
                if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
              }}
              className="mt-1 h-1 w-full cursor-pointer"
              style={{ accentColor: theme.accent }}
            />
            <p className="mt-0.5 text-[9px] tabular-nums" style={{ color: theme.secondaryText }}>
              {fmt(time)} / {fmt(duration || 0)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={silent ? 'Unmute' : 'Mute'}
              className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
            >
              <VolumeIcon className="size-4" />
            </button>
            {canSetVolume && (
              <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const el = audioRef.current;
                  if (!el) return;
                  el.volume = Number(e.target.value);
                  el.muted = el.volume === 0;
                }}
                className="h-1 w-16 cursor-pointer"
                style={{ accentColor: theme.accent }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
