import { useState, type CSSProperties } from 'react';
import { CursorCanvas, PageOverlayLayer } from '../../components/BackgroundEffects';
import { Media } from '../../components/Media';
import { Username } from '../../components/ProfileCard';
import { useTitleAnimation } from '../../lib/titleFrames';
import {
  CURSOR_TRAILS,
  ENTER_ANIMATIONS,
  PAGE_OVERLAYS,
  TITLE_ANIMATIONS,
  USERNAME_EFFECTS,
  type CursorTrail,
  type EnterAnimation,
  type PageOverlay,
  type TitleAnimation,
  type UsernameEffect,
} from '../../types';
import { useAdmin } from '../state';
import {
  BoolSelect,
  Button,
  ColorInput,
  Field,
  Grid,
  Info,
  PageHeader,
  Section,
  Select,
  Slider,
  TextArea,
  TextInput,
  Upload,
  cx,
} from '../ui';

const SPARKLE_COLORS = { white: '#FFFFFF', black: '#000000' } as const;

const TITLE_LABELS: Record<TitleAnimation, string> = {
  none: 'None',
  typing: 'Typing',
  scroll: 'Scroll',
  blink: 'Blink',
  wave: 'Wave',
  glitch: 'Glitch',
  decrypt: 'Decrypt',
  sparkle: 'Sparkle',
};
const TRAIL_LABELS: Record<CursorTrail, string> = {
  none: 'None',
  'fairy-dust': 'Fairy Dust',
  bubbles: 'Bubbles',
  snow: 'Snowflakes',
  rainbow: 'Rainbow',
  ghost: 'Ghost Trail',
  follow: 'Follow Ring',
  emoji: 'Emoji',
};
const EFFECT_LABELS: Record<UsernameEffect, string> = {
  none: 'None',
  glow: 'Glow',
  neon: 'Neon Flicker',
  rainbow: 'Rainbow',
  shimmer: 'Shimmer',
  glitch: 'Glitch',
  wave: 'Wave',
  typewriter: 'Typewriter',
};
const TITLE_OPTIONS = TITLE_ANIMATIONS.map((value) => ({ value, label: TITLE_LABELS[value] }));
const TRAIL_OPTIONS = CURSOR_TRAILS.map((value) => ({ value, label: TRAIL_LABELS[value] }));
const EFFECT_OPTIONS = USERNAME_EFFECTS.map((value) => ({ value, label: EFFECT_LABELS[value] }));

/** A fake browser tab showing the title animation live. */
function TabPreview({ title, type, speedMs, icon }: { title: string; type: TitleAnimation; speedMs: number; icon: string }) {
  const frame = useTitleAnimation(title || ' ', type, speedMs);
  return (
    <div className="flex h-12 items-end rounded-lg border border-adm-line bg-adm-field px-3">
      <div className="flex h-9 w-60 items-center gap-2 rounded-t-lg border border-b-0 border-adm-line bg-adm-panel px-3">
        <img src={icon} alt="" className="size-4 shrink-0 rounded-sm object-cover" />
        <span className="truncate text-xs whitespace-pre text-adm-text">{frame}</span>
      </div>
    </div>
  );
}

const OVERLAY_LABELS: Record<PageOverlay, string> = {
  none: 'None',
  glitch: 'Glitch',
  crt: 'CRT Monitor',
  vhs: 'VHS Tape',
  grain: 'Film Grain',
  rain: 'Rain',
  storm: 'Thunderstorm',
  snow: 'Snow',
  sakura: 'Sakura Petals',
  leaves: 'Autumn Leaves',
  fireflies: 'Fireflies',
  embers: 'Embers',
  hearts: 'Floating Hearts',
  bubbles: 'Bubbles',
  stars: 'Starry Night',
  aurora: 'Aurora',
  vignette: 'Vignette',
};
const ENTER_LABELS: Record<EnterAnimation, string> = {
  none: 'None',
  'slide-up': 'Slide Up',
  'slide-down': 'Slide Down',
  'slide-left': 'Slide Left',
  'slide-right': 'Slide Right',
  fade: 'Fade',
  'zoom-in': 'Zoom In',
  'zoom-out': 'Zoom Out',
  'blur-in': 'Blur In',
  flip: 'Flip',
  bounce: 'Bounce',
  'rotate-in': 'Rotate In',
  swing: 'Swing',
  elastic: 'Elastic Pop',
  unfold: 'Unfold',
  'glitch-in': 'Glitch In',
};
const OVERLAY_OPTIONS = PAGE_OVERLAYS.map((value) => ({ value, label: OVERLAY_LABELS[value] }));
const ENTER_OPTIONS = ENTER_ANIMATIONS.map((value) => ({ value, label: ENTER_LABELS[value] }));

/** Mini page: your background, a stand-in card that plays the entrance, and the overlay on top. */
function EffectsPreview(props: {
  overlay: PageOverlay;
  enter: EnterAnimation;
  ms: number;
  background: string | null;
  avatar: string;
  username: string;
}) {
  const [run, setRun] = useState(0); // bump to replay; changing the animation also replays via the key
  return (
    <div className="relative h-48 overflow-hidden rounded-xl border border-adm-line bg-[#090909]">
      {props.background && <Media src={props.background} className="absolute inset-0 size-full object-cover" />}
      <div
        key={`${props.enter}-${props.ms}-${run}`}
        className={cx('absolute inset-0 grid place-items-center', props.enter !== 'none' && `enter enter-${props.enter}`)}
        style={{ '--enter-ms': `${props.ms}ms` } as CSSProperties}
      >
        <div className="w-44 rounded-xl border border-white/15 bg-black/40 p-4 text-center backdrop-blur-md">
          <img src={props.avatar} alt="" className="mx-auto size-10 rounded-full object-cover" />
          <p className="mt-2 truncate font-sans text-xs font-bold text-white">{props.username}</p>
        </div>
      </div>
      {props.overlay !== 'none' && <PageOverlayLayer type={props.overlay} preview />}
      <Button tone="secondary" small className="absolute right-2 bottom-2 bg-adm-bg/80" onClick={() => setRun((r) => r + 1)}>
        Replay
      </Button>
    </div>
  );
}

/** Runs the selected trail while the mouse is over the box. */
function TrailPreview({ type, color, emoji }: { type: CursorTrail; color: string; emoji: string }) {
  const [active, setActive] = useState(false);
  return (
    <div
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="grid h-24 place-items-center rounded-xl border border-dashed border-adm-line-strong bg-black/40 text-xs text-adm-muted"
    >
      {type === 'none' ? 'No cursor trail' : 'Move your mouse here to preview'}
      {active && type !== 'none' && <CursorCanvas type={type} color={color} emoji={emoji} />}
    </div>
  );
}

export function AppearancePage() {
  const { draft: d, update, go } = useAdmin();
  const sparkle = !d.theme.sparkles.enabled ? 'none' : d.theme.sparkles.color === '#FFFFFF' ? 'white' : 'black';

  return (
    <div className="space-y-6">
      <PageHeader title="Appearance" description="Colors, card style, backgrounds and effects." />

      <Section title="Page title" description="The browser tab text and icon">
        <Grid>
          <TextInput
            label="Page Title"
            required
            max={100}
            value={d.page.title}
            onChange={(v) => update((x) => void (x.page.title = v))}
          />
          <Select
            label="Title Animation"
            value={d.page.titleAnimation}
            options={TITLE_OPTIONS}
            onChange={(v) => update((x) => void (x.page.titleAnimation = v))}
          />
        </Grid>
        <TabPreview
          title={d.page.title}
          type={d.page.titleAnimation}
          speedMs={d.page.titleSpeedMs}
          icon={d.page.favicon ?? d.user.avatarUrl}
        />
        <Slider
          label="Animation Speed"
          unit="ms"
          min={100}
          max={500}
          value={d.page.titleSpeedMs}
          onChange={(v) => update((x) => void (x.page.titleSpeedMs = v))}
        />
        <Upload label="Favicon" kind="image" value={d.page.favicon} onChange={(v) => update((x) => void (x.page.favicon = v))} />
      </Section>

      <Section title="Colors">
        <ColorInput label="Theme Color" value={d.theme.accent} onChange={(v) => update((x) => void (x.theme.accent = v))} />
        <Grid>
          <ColorInput
            label="Primary Text"
            value={d.theme.primaryText}
            onChange={(v) => update((x) => void (x.theme.primaryText = v))}
          />
          <ColorInput
            label="Secondary Text"
            value={d.theme.secondaryText}
            onChange={(v) => update((x) => void (x.theme.secondaryText = v))}
          />
        </Grid>
      </Section>

      <Section title="Background">
        <Upload label="Image or video" kind="media" value={d.background.src} onChange={(v) => update((x) => void (x.background.src = v))} />
        <Grid>
          <Select
            label="Size"
            value={d.background.size}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
            ]}
            onChange={(v) => update((x) => void (x.background.size = v))}
          />
          <ColorInput label="Fallback Color" value={d.background.color} onChange={(v) => update((x) => void (x.background.color = v))} />
          <Slider label="Blur" unit="px" max={100} value={d.background.blur} onChange={(v) => update((x) => void (x.background.blur = v))} />
          <Slider label="Opacity" unit="%" max={100} value={d.background.opacity} onChange={(v) => update((x) => void (x.background.opacity = v))} />
        </Grid>
      </Section>

      <Section title="Card" description="The glass box around your profile">
        <Grid>
          <Slider label="Width" unit="px" min={300} max={1500} value={d.box.width} onChange={(v) => update((x) => void (x.box.width = v))} />
          <Slider label="Inner Spacing" unit="px" max={100} value={d.box.padding} onChange={(v) => update((x) => void (x.box.padding = v))} />
          <ColorInput label="Color" value={d.box.color} onChange={(v) => update((x) => void (x.box.color = v))} />
          <Slider label="Opacity" unit="%" max={100} value={d.box.opacity} onChange={(v) => update((x) => void (x.box.opacity = v))} />
          <Slider label="Radius" unit="px" max={50} value={d.box.radius} onChange={(v) => update((x) => void (x.box.radius = v))} />
          <Slider label="Blur" unit="px" max={100} value={d.box.blur} onChange={(v) => update((x) => void (x.box.blur = v))} />
          <ColorInput label="Shadow Color" value={d.box.shadowColor} onChange={(v) => update((x) => void (x.box.shadowColor = v))} />
          <Slider
            label="Shadow Opacity"
            unit="%"
            max={100}
            value={d.box.shadowOpacity}
            onChange={(v) => update((x) => void (x.box.shadowOpacity = v))}
          />
        </Grid>
      </Section>

      <Section title="Border">
        <Grid>
          <Slider label="Width" unit="px" max={5} value={d.box.borderWidth} onChange={(v) => update((x) => void (x.box.borderWidth = v))} />
          <ColorInput label="Color" value={d.box.borderColor} onChange={(v) => update((x) => void (x.box.borderColor = v))} />
          <Slider label="Opacity" unit="%" max={100} value={d.box.borderOpacity} onChange={(v) => update((x) => void (x.box.borderOpacity = v))} />
          <Select
            label="Style"
            value={d.box.borderStyle}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            onChange={(v) => update((x) => void (x.box.borderStyle = v))}
          />
        </Grid>
      </Section>

      <Section title="Banner" description={`Spans the top of your card: ${d.box.width} × 130 px`}>
        <Upload label="Image or video" kind="media" value={d.user.bannerUrl} onChange={(v) => update((x) => void (x.user.bannerUrl = v))} />
      </Section>

      <Section title="Username & avatar">
        <Grid>
          <Select
            label="Username Effect"
            value={d.theme.usernameEffect}
            options={EFFECT_OPTIONS}
            onChange={(v) => update((x) => void (x.theme.usernameEffect = v))}
          />
          <Select
            label="Sparkles"
            value={sparkle}
            options={[
              { value: 'none', label: 'None' },
              { value: 'white', label: 'White' },
              { value: 'black', label: 'Black' },
            ]}
            onChange={(v) =>
              update((x) => {
                x.theme.sparkles.enabled = v !== 'none';
                if (v !== 'none') x.theme.sparkles.color = SPARKLE_COLORS[v];
              })
            }
          />
        </Grid>
        <Field label="Preview">
          <div className="grid h-20 place-items-center rounded-xl border border-adm-line bg-black/40">
            <p
              className="relative font-sans text-[22px] leading-none font-bold tracking-tight"
              style={{ color: d.theme.primaryText }}
            >
              <Username text={d.user.username} effect={d.theme.usernameEffect} theme={d.theme} />
            </p>
          </div>
        </Field>
        <Slider label="Avatar Radius" unit="px" max={50} value={d.user.avatarRadius} onChange={(v) => update((x) => void (x.user.avatarRadius = v))} />
      </Section>

      <Section title="Cursor">
        <Grid>
          <Select
            label="Cursor Trail"
            value={d.page.cursorTrail}
            options={TRAIL_OPTIONS}
            onChange={(v) => update((x) => void (x.page.cursorTrail = v))}
          />
          {d.page.cursorTrail === 'emoji' && (
            <TextInput
              label="Emoji"
              required
              max={16}
              value={d.page.cursorEmoji}
              onChange={(v) => update((x) => void (x.page.cursorEmoji = v))}
              placeholder="✨"
            />
          )}
        </Grid>
        <TrailPreview type={d.page.cursorTrail} color={d.theme.accent} emoji={d.page.cursorEmoji} />
        <Info tone="warn">Cursor trails only run on devices with a mouse; phones and tablets skip them.</Info>
      </Section>

      <Section title="Overlay & entrance" description="An effect layered over the whole page, and how your card appears">
        <Grid>
          <Select
            label="Page Overlay"
            value={d.page.overlay}
            options={OVERLAY_OPTIONS}
            onChange={(v) => update((x) => void (x.page.overlay = v))}
          />
          <Select
            label="Enter Animation"
            value={d.page.enterAnimation}
            options={ENTER_OPTIONS}
            onChange={(v) => update((x) => void (x.page.enterAnimation = v))}
          />
        </Grid>
        <Slider
          label="Enter Animation Speed"
          unit="ms"
          min={100}
          max={1000}
          value={d.page.enterAnimationMs}
          onChange={(v) => update((x) => void (x.page.enterAnimationMs = v))}
        />
        <EffectsPreview
          overlay={d.page.overlay}
          enter={d.page.enterAnimation}
          ms={d.page.enterAnimationMs}
          background={d.background.src}
          avatar={d.user.avatarUrl}
          username={d.user.username}
        />
      </Section>

      <Section
        title="Music"
        description="Player settings. Upload the song itself on the Tracks page."
        action={
          <Button tone="secondary" small onClick={() => go('tracks')}>
            Tracks
          </Button>
        }
      >
        <Grid>
          <BoolSelect
            label="Track Player"
            off="Hidden"
            on="Bar"
            value={d.audio.showPlayer}
            onChange={(v) => update((x) => void (x.audio.showPlayer = v))}
          />
          <Slider label="Starting Volume" unit="%" max={100} value={d.audio.volume} onChange={(v) => update((x) => void (x.audio.volume = v))} />
        </Grid>
      </Section>

      <Section title="Reveal screen" description="Shown before your page when enabled in Options">
        <Slider label="Blur" unit="px" max={50} value={d.page.reveal.blur} onChange={(v) => update((x) => void (x.page.reveal.blur = v))} />
        <TextArea
          label="Text"
          required
          max={1000}
          value={d.page.reveal.text}
          onChange={(v) => update((x) => void (x.page.reveal.text = v))}
        />
      </Section>
    </div>
  );
}
