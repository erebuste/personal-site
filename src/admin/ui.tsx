import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, ImagePlus, Music, Sparkles, TriangleAlert } from 'lucide-react';
import { Media } from '../components/Media';
import { errorMessage, useAdmin, type UploadKind } from './state';

// Admin building blocks, "Midnight Purple". Colors come from the --color-adm-* tokens in index.css.

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

const fieldClass =
  'h-10 w-full rounded-lg border border-adm-line bg-adm-field px-3 text-sm text-adm-text outline-none transition-colors placeholder:text-adm-dim focus:border-adm-violet focus:ring-2 focus:ring-adm-violet/25';

/** Gradient "T" with a sparkle. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  const id = `logo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M9 10.5h14V14h-5.25v10h-3.5V14H9z" fill="#fff" />
      <path d="M25 3.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="#fff" />
    </svg>
  );
}

type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';
const TONES: Record<Tone, string> = {
  primary:
    'bg-linear-to-r from-adm-violet to-adm-pink text-white shadow-lg shadow-adm-violet/25 hover:brightness-110',
  secondary: 'border border-adm-line bg-adm-field text-adm-text hover:border-adm-line-strong',
  danger: 'border border-adm-danger/40 bg-adm-danger/10 text-adm-danger hover:bg-adm-danger/20',
  ghost: 'text-adm-muted hover:bg-white/5 hover:text-adm-text',
};

export function Button({
  tone = 'primary',
  small,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; small?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        small ? 'h-8 px-3 text-xs' : 'h-10 px-5 text-sm',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-adm-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** A titled card grouping related fields. */
export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-adm-line bg-adm-panel p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sans text-[13px] font-semibold tracking-wide">{title}</h2>
          {description && <p className="mt-1 text-xs text-adm-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Info({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div
      className={cx(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed',
        tone === 'info' ? 'border-adm-violet/30 bg-adm-violet/10' : 'border-amber-500/30 bg-amber-500/10',
      )}
    >
      {tone === 'info' ? (
        <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-300" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
      )}
      <div className="text-adm-text/90">{children}</div>
    </div>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>;
}

interface FieldProps {
  label: string;
  required?: boolean;
  counter?: ReactNode;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, required, counter, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-end justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-adm-text">
          {label}
          {required && <span className="text-adm-pink"> *</span>}
        </label>
        {counter !== undefined && <span className="text-[11px] text-adm-dim tabular-nums">{counter}</span>}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-adm-dim">{hint}</p>}
    </div>
  );
}

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  prefix?: string;
  type?: 'text' | 'password';
}

export function TextInput({ label, value, onChange, max, required, placeholder, hint, prefix, type = 'text' }: TextProps) {
  const id = useId();
  return (
    <Field label={label} required={required} counter={`${value.length}/${max}`} hint={hint} htmlFor={id}>
      <div className="flex">
        {prefix && (
          <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-adm-line bg-adm-field px-3 text-sm text-adm-dim">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          maxLength={max}
          placeholder={placeholder ?? label}
          onChange={(e) => onChange(e.target.value)}
          className={cx(fieldClass, prefix && 'rounded-l-none')}
        />
      </div>
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  max,
  required,
  placeholder,
  hint,
  preview,
}: Omit<TextProps, 'prefix' | 'type'> & { preview?: (text: string) => ReactNode }) {
  const id = useId();
  const [previewing, setPreviewing] = useState(false);
  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      htmlFor={id}
      counter={
        <span className="flex items-center gap-3">
          {preview && (
            <button
              type="button"
              className="cursor-pointer font-medium text-violet-300 hover:text-violet-200"
              onClick={() => setPreviewing(!previewing)}
            >
              {previewing ? 'Edit' : 'Preview'}
            </button>
          )}
          {value.length}/{max}
        </span>
      }
    >
      {previewing && preview ? (
        <div className="min-h-32 rounded-lg border border-adm-line bg-black/40 px-4 py-3">{preview(value)}</div>
      ) : (
        <textarea
          id={id}
          value={value}
          maxLength={max}
          placeholder={placeholder ?? label}
          onChange={(e) => onChange(e.target.value)}
          className={cx(fieldClass, 'block h-32 resize-y py-2.5')}
        />
      )}
    </Field>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} required={required} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => {
            const picked = options.find((o) => o.value === e.target.value);
            if (picked) onChange(picked.value);
          }}
          className={cx(fieldClass, 'cursor-pointer appearance-none pr-9')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-adm-dim" />
      </div>
    </Field>
  );
}

/** Two-option select backed by a boolean. */
export function BoolSelect(props: {
  label: string;
  value: boolean;
  off: string;
  on: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <Select
      label={props.label}
      value={props.value ? 'on' : 'off'}
      options={[
        { value: 'off', label: props.off },
        { value: 'on', label: props.on },
      ]}
      onChange={(v) => props.onChange(v === 'on')}
    />
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  unit: 'px' | '%' | 'ms';
}) {
  const id = useId();
  const fill = { '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
  return (
    <Field
      label={label}
      htmlFor={id}
      counter={
        <span className="rounded-md bg-adm-field px-1.5 py-0.5 text-adm-muted">
          {value} {unit}
        </span>
      }
    >
      <div className="flex h-10 items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="fc-range w-full"
          style={fill}
        />
      </div>
    </Field>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Swatch opens the native picker; the hex box accepts typed values. */
export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        <label
          className="relative size-10 shrink-0 cursor-pointer rounded-lg border border-adm-line"
          style={{ backgroundColor: value }}
          title="Pick a color"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={`${label} picker`}
          />
        </label>
        <input
          id={id}
          value={text}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setText(next);
            if (HEX.test(next)) onChange(next.toUpperCase());
          }}
          onBlur={() => setText(value)}
          className={cx(fieldClass, 'font-mono uppercase', !HEX.test(text) && 'border-adm-danger/60')}
        />
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-adm-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors',
          checked ? 'border-transparent bg-linear-to-r from-adm-violet to-adm-pink' : 'border-adm-line bg-adm-field',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

const ACCEPT: Record<UploadKind, { accept: string; hint: string }> = {
  image: { accept: '.png,.jpg,.jpeg,.gif,.webp', hint: 'PNG, JPG, GIF or WebP · up to 100MB' },
  media: { accept: '.png,.jpg,.jpeg,.gif,.webp,.mp4', hint: 'PNG, JPG, GIF, WebP or MP4 · up to 100MB' },
  audio: { accept: '.mp3,.ogg,.wav,.flac,.m4a,.mp4', hint: 'MP3, OGG, WAV, FLAC or M4A · up to 100MB' },
};

/** Click or drag a file; it uploads immediately and hands back its URL. */
export function Upload({
  label,
  kind,
  value,
  onChange,
  required,
}: {
  label: string;
  kind: UploadKind;
  value: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
}) {
  const { upload, notify } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const Icon = kind === 'audio' ? Music : ImagePlus;

  const send = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await upload(file, kind);
      if (url) onChange(url);
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label} required={required} hint={ACCEPT[kind].hint}>
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-adm-line bg-adm-field">
          {kind === 'audio' ? (
            <audio src={value} controls className="h-14 w-full px-2 py-2" />
          ) : (
            <Media src={value} className="h-28 w-full object-cover" />
          )}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <Button tone="secondary" small className="bg-adm-bg/80 backdrop-blur" onClick={() => input.current?.click()}>
              {busy ? 'Uploading…' : 'Replace'}
            </Button>
            <Button tone="danger" small className="bg-adm-bg/80 backdrop-blur" onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void send(e.dataTransfer.files[0]);
          }}
          className={cx(
            'flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition-colors',
            dragging
              ? 'border-adm-violet bg-adm-violet/10 text-adm-text'
              : 'border-adm-line-strong bg-adm-field text-adm-muted hover:border-adm-violet/60 hover:text-adm-text',
          )}
        >
          <span className="grid size-9 place-items-center rounded-full bg-adm-violet/15 text-violet-300">
            <Icon className="size-4" />
          </span>
          {busy ? 'Uploading…' : 'Drop a file or click to browse'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT[kind].accept}
        className="hidden"
        onChange={(e) => {
          void send(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </Field>
  );
}

export function NavRow({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-adm-line bg-adm-field px-4 py-3 text-left transition-colors hover:border-adm-violet/50"
    >
      {icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-adm-violet/15 text-violet-300">{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {description && <span className="mt-0.5 block truncate text-xs text-adm-muted">{description}</span>}
      </span>
      <span className="text-adm-dim transition-transform group-hover:translate-x-0.5 group-hover:text-adm-text">→</span>
    </button>
  );
}
