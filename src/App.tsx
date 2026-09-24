import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AudioPlayer } from './components/AudioPlayer';
import { BackgroundEffects } from './components/BackgroundEffects';
import { ClickToEnterOverlay } from './components/ClickToEnterOverlay';
import { DiscordPresence } from './components/DiscordPresence';
import { ProfileCard } from './components/ProfileCard';
import { Showcases } from './components/Showcases';
import { SocialLinks } from './components/SocialLinks';
import { useTitleAnimation } from './lib/titleFrames';
import type { ProfileConfig, TitleAnimation } from './types';

/** Animates document.title. Its own component so each tick re-renders only this, not the page. */
function TabTitle({ title, type, speedMs }: { title: string; type: TitleAnimation; speedMs: number }) {
  const frame = useTitleAnimation(title, type, speedMs);
  useEffect(() => {
    document.title = frame;
  }, [frame]);
  return null;
}

interface Props {
  profile: ProfileConfig;
  views?: number | undefined;
}

export default function App({ profile, views }: Props) {
  const { user, links, showcases, audio, theme, box, background, page, discordPresence } = profile;
  const [revealed, setRevealed] = useState(!page.reveal.enabled);
  const audioRef = useRef<HTMLAudioElement>(null);

  // play() must run inside the click handler to satisfy browser autoplay policies.
  const reveal = () => {
    setRevealed(true);
    audioRef.current?.play().catch(() => undefined); // blocked or missing file: player stays paused
  };

  return (
    <>
      <TabTitle title={page.title} type={page.titleAnimation} speedMs={page.titleSpeedMs} />
      <BackgroundEffects
        background={background}
        overlay={page.overlay}
        cursorTrail={page.cursorTrail}
        cursorEmoji={page.cursorEmoji}
        trailColor={theme.accent}
      />

      {revealed ? (
        <main
          className={`relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6.5 px-4 py-10 ${page.enterAnimation === 'none' ? '' : `enter enter-${page.enterAnimation}`}`}
          style={{ '--enter-ms': `${page.enterAnimationMs}ms` } as CSSProperties}
        >
          <ProfileCard user={user} box={box} theme={theme} views={page.showViews ? views : undefined}>
            <SocialLinks links={links} theme={theme} />
          </ProfileCard>
          {showcases.length > 0 && <Showcases items={showcases} box={box} theme={theme} />}
          {discordPresence.enabled && <DiscordPresence userId={discordPresence.userId} box={box} theme={theme} />}
        </main>
      ) : (
        <ClickToEnterOverlay text={page.reveal.text} blur={page.reveal.blur} onEnter={reveal} />
      )}

      {audio.src && (
        <AudioPlayer
          audioRef={audioRef}
          src={audio.src}
          track={audio}
          theme={theme}
          visible={revealed && audio.showPlayer}
        />
      )}
    </>
  );
}
