import { useState } from 'react';
import { Music, Pencil, Trash2 } from 'lucide-react';
import { Media } from '../../components/Media';
import { Icon } from '../../components/SocialLinks';
import { PLATFORMS, type Platform, type Showcase, type SocialLink } from '../../types';
import { useAdmin } from '../state';
import { Button, ColorInput, Field, Grid, Info, PageHeader, Section, Select, TextArea, TextInput, Upload, cx } from '../ui';

// ---- Profile Embed ----

export function EmbedPage() {
  const { draft, saved, update } = useAdmin();
  const { embed, user } = draft;
  const time = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  // The generated card is drawn from the saved profile; this cache-buster refetches it after each save.
  const cardVersion = [...JSON.stringify(saved)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0);
  const image = embed.image ?? `/api/og.png?v=${cardVersion}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile Embed" description="How your link looks when shared on Discord and other apps." />

      <Section title="Preview">
        {/* Discord's own dark-mode colors, so the preview matches what people will see */}
        <div className="flex gap-3 rounded-xl bg-[#313338] p-4 text-[#dbdee1]">
          <img src={user.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {user.username} <span className="ml-1 text-[11px] font-normal text-[#949ba4]">Today at {time}</span>
            </p>
            <p className="truncate text-sm text-[#00a8fc]">{embed.siteUrl}</p>
            <div className="mt-2 max-w-[520px] rounded border-l-4 bg-[#2b2d31] p-3" style={{ borderColor: embed.color }}>
              {embed.siteName && <p className="text-[11px] text-[#b5bac1]">{embed.siteName}</p>}
              <p className="text-sm font-semibold text-[#00a8fc]">{embed.title}</p>
              {embed.description && <p className="mt-1 text-xs whitespace-pre-line">{embed.description}</p>}
              <img src={image} alt="" className="mt-3 aspect-[1200/630] w-full rounded bg-black/30 object-cover" />
            </div>
          </div>
        </div>
        <Info>
          Without a Large Image, a card is generated from your saved profile (avatar, name, bio, colors and background).
          Discord caches previews, so changes can take a while to show up there.
        </Info>
      </Section>

      <Section title="Details">
        <Grid>
          <TextInput label="Title" required max={100} value={embed.title} onChange={(v) => update((d) => void (d.embed.title = v))} />
          <TextInput label="Site Name" max={50} value={embed.siteName} onChange={(v) => update((d) => void (d.embed.siteName = v))} />
        </Grid>
        <TextArea label="Description" max={250} value={embed.description} onChange={(v) => update((d) => void (d.embed.description = v))} />
        <Grid>
          <ColorInput label="Accent Color" value={embed.color} onChange={(v) => update((d) => void (d.embed.color = v))} />
          <TextInput
            label="Site URL"
            required
            max={250}
            value={embed.siteUrl}
            onChange={(v) => update((d) => void (d.embed.siteUrl = v))}
            hint="Your public address, e.g. https://tagged.dev"
          />
        </Grid>
        <Upload label="Large Image" kind="image" value={embed.image} onChange={(v) => update((d) => void (d.embed.image = v))} />
      </Section>
    </div>
  );
}

// ---- Links ----

const PLATFORM_LABELS: Record<Platform, string> = {
  website: 'Website',
  steam: 'Steam',
  youtube: 'YouTube',
  discord: 'Discord',
  github: 'GitHub',
  x: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  spotify: 'Spotify',
  twitch: 'Twitch',
  telegram: 'Telegram',
};
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }));

type LinkForm = { platform: Platform; title: string; type: 'url' | 'copy'; value: string };
const EMPTY_LINK: LinkForm = { platform: 'website', title: '', type: 'url', value: '' };

const toForm = (l: SocialLink): LinkForm => ({
  platform: l.platform,
  title: l.title,
  type: l.action.type,
  value: l.action.type === 'url' ? l.action.href : l.action.value,
});

const toLink = (f: LinkForm): SocialLink => ({
  platform: f.platform,
  title: f.title.trim() || PLATFORM_LABELS[f.platform],
  action: f.type === 'url' ? { type: 'url', href: f.value.trim() } : { type: 'copy', value: f.value },
});

/** Which row is being edited, its form, and a commit that notifies and resets the form on success. */
function useListEditor<F>(empty: F) {
  const { commit, notify } = useAdmin();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<F>(empty);
  const [busy, setBusy] = useState(false);
  const cancel = () => {
    setEditing(null);
    setForm(empty);
  };
  return {
    editing,
    form,
    busy,
    cancel,
    set: (patch: Partial<F>) => setForm((f) => ({ ...f, ...patch })),
    edit: (i: number, value: F) => {
      setEditing(i);
      setForm(value);
    },
    run: async (recipe: Parameters<typeof commit>[0], done: string) => {
      setBusy(true);
      if (await commit(recipe)) {
        notify(done);
        cancel();
      }
      setBusy(false);
    },
  };
}

/** Edit and delete buttons at the end of a list row. */
function RowActions({ label, busy, onEdit, onDelete }: { label: string; busy: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <Button tone="ghost" small aria-label={`Edit ${label}`} onClick={onEdit}>
        <Pencil className="size-3.5" />
      </Button>
      <Button tone="ghost" small aria-label={`Delete ${label}`} disabled={busy} className="hover:text-adm-danger" onClick={onDelete}>
        <Trash2 className="size-3.5" />
      </Button>
    </>
  );
}

export function LinksPage() {
  const { draft, notify } = useAdmin();
  const { editing, form, busy, set, edit, cancel, run } = useListEditor(EMPTY_LINK);

  const submit = () => {
    if (!form.value.trim()) return notify(form.type === 'url' ? 'URL is required.' : 'Text is required.', 'error');
    const link = toLink(form);
    void run((d) => {
      if (editing === null) d.links.push(link);
      else d.links[editing] = link;
    }, editing === null ? 'Link added' : 'Link updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Links" description={`${draft.links.length} of 50 used · shown as icons on your card`} />

      <Section title="Your links">
        {draft.links.length === 0 ? (
          <p className="text-sm text-adm-muted">No links yet. Add your first one below.</p>
        ) : (
          <ul className="-my-2 divide-y divide-adm-line">
            {draft.links.map((link, i) => (
              <li key={`${link.title}-${i}`} className={cx('flex items-center gap-3 py-3', editing === i && 'opacity-60')}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-adm-field">
                  <Icon platform={link.platform} color="#ece9f7" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{link.title}</p>
                  <p className="truncate text-xs text-adm-muted">
                    {link.action.type === 'url' ? link.action.href : `Copies “${link.action.value}”`}
                  </p>
                </div>
                <RowActions
                  label={link.title}
                  busy={busy}
                  onEdit={() => edit(i, toForm(link))}
                  onDelete={() => void run((d) => void d.links.splice(i, 1), 'Link deleted')}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={editing === null ? 'Add a link' : 'Edit link'}>
        <Grid>
          <Select label="Icon" value={form.platform} options={PLATFORM_OPTIONS} onChange={(platform) => set({ platform })} />
          <TextInput label="Title" max={75} value={form.title} onChange={(title) => set({ title })} placeholder={PLATFORM_LABELS[form.platform]} />
        </Grid>
        <Grid>
          <Select
            label="On click"
            value={form.type}
            options={[
              { value: 'url', label: 'Open a URL' },
              { value: 'copy', label: 'Copy text' },
            ]}
            onChange={(type) => set({ type })}
          />
          <TextInput
            label={form.type === 'url' ? 'URL' : 'Text to copy'}
            required
            max={250}
            value={form.value}
            onChange={(value) => set({ value })}
            placeholder={form.type === 'url' ? 'https://' : 'e.g. your Discord tag'}
          />
        </Grid>
        <div className="flex justify-end gap-2">
          {editing !== null && (
            <Button tone="ghost" onClick={cancel}>
              Cancel
            </Button>
          )}
          <Button disabled={busy || (editing === null && draft.links.length >= 50)} onClick={submit}>
            {editing === null ? 'Add link' : 'Save link'}
          </Button>
        </div>
      </Section>
    </div>
  );
}

// ---- Showcases ----

type ShowcaseForm = { title: string; description: string; image: string | null; href: string };
const EMPTY_SHOWCASE: ShowcaseForm = { title: '', description: '', image: null, href: '' };

export function ShowcasesPage() {
  const { draft, notify } = useAdmin();
  const { editing, form, busy, set, edit, cancel, run } = useListEditor(EMPTY_SHOWCASE);

  const submit = () => {
    const { image } = form;
    if (!form.title.trim()) return notify('Title is required.', 'error');
    if (!image) return notify('Upload an image first.', 'error');
    const item: Showcase = { title: form.title.trim(), description: form.description, image, href: form.href.trim() || null };
    void run((d) => {
      if (editing === null) d.showcases.push(item);
      else d.showcases[editing] = item;
    }, editing === null ? 'Showcase added' : 'Showcase updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Showcases" description={`${draft.showcases.length} of 12 used · a Showcases button on your card opens them in a popup`} />

      <Section title="Your showcases">
        {draft.showcases.length === 0 ? (
          <p className="text-sm text-adm-muted">No showcases yet. Add your first one below.</p>
        ) : (
          <ul className="-my-2 divide-y divide-adm-line">
            {draft.showcases.map((item, i) => (
              <li key={`${item.title}-${i}`} className={cx('flex items-center gap-3 py-3', editing === i && 'opacity-60')}>
                <Media src={item.image} className="aspect-video w-20 shrink-0 rounded-lg bg-adm-field object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-adm-muted">{item.href ?? 'No link'}</p>
                </div>
                <RowActions
                  label={item.title}
                  busy={busy}
                  onEdit={() => edit(i, { ...item, href: item.href ?? '' })}
                  onDelete={() => void run((d) => void d.showcases.splice(i, 1), 'Showcase deleted')}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={editing === null ? 'Add a showcase' : 'Edit showcase'}>
        <Grid>
          <TextInput label="Title" required max={75} value={form.title} onChange={(title) => set({ title })} />
          <TextInput
            label="Link"
            max={250}
            value={form.href}
            onChange={(href) => set({ href })}
            placeholder="https://"
            hint="Optional. Opens in a new tab."
          />
        </Grid>
        <TextArea label="Description" max={250} value={form.description} onChange={(description) => set({ description })} />
        <Upload label="Image" required kind="media" value={form.image} onChange={(image) => set({ image })} />
        <div className="flex justify-end gap-2">
          {editing !== null && (
            <Button tone="ghost" onClick={cancel}>
              Cancel
            </Button>
          )}
          <Button disabled={busy || (editing === null && draft.showcases.length >= 12)} onClick={submit}>
            {editing === null ? 'Add showcase' : 'Save showcase'}
          </Button>
        </div>
      </Section>
    </div>
  );
}

// ---- Tracks ----

export function TracksPage() {
  const { draft, commit, notify } = useAdmin();
  const { audio } = draft;
  const [form, setForm] = useState({ src: audio.src, cover: audio.cover, title: audio.title });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.src) return notify('Upload an audio file first.', 'error');
    setBusy(true);
    const ok = await commit((d) => {
      d.audio.src = form.src;
      d.audio.cover = form.cover;
      d.audio.title = form.title;
    });
    setBusy(false);
    if (ok) notify('Track saved');
  };

  const remove = async () => {
    if (await commit((d) => void Object.assign(d.audio, { src: null, cover: null }))) {
      setForm({ src: null, cover: null, title: '' });
      notify('Track removed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tracks" description="The song that plays after visitors click to reveal." />

      <Section title="Now playing">
        {audio.src ? (
          <div className="flex items-center gap-4">
            {audio.cover ? (
              <img src={audio.cover} alt="" className="size-14 rounded-xl object-cover" />
            ) : (
              <span className="grid size-14 place-items-center rounded-xl bg-linear-to-br from-adm-violet to-adm-pink">
                <Music className="size-6 text-white" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{audio.title || 'Untitled'}</p>
              <p className="text-xs text-adm-muted">Plays on your profile</p>
            </div>
            <Button tone="danger" small onClick={() => void remove()}>
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-sm text-adm-muted">No track yet.</p>
        )}
      </Section>

      <Section title={audio.src ? 'Replace track' : 'Add a track'}>
        <Field label="Name" htmlFor="track-name">
          <input
            id="track-name"
            value={form.title}
            maxLength={100}
            placeholder="Song name"
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="h-10 w-full rounded-lg border border-adm-line bg-adm-field px-3 text-sm outline-none placeholder:text-adm-dim focus:border-adm-violet focus:ring-2 focus:ring-adm-violet/25"
          />
        </Field>
        <Grid>
          <Upload label="Audio" required kind="audio" value={form.src} onChange={(src) => setForm((f) => ({ ...f, src }))} />
          <Upload label="Cover" kind="image" value={form.cover} onChange={(cover) => setForm((f) => ({ ...f, cover }))} />
        </Grid>
        <div className="flex justify-end">
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save track'}
          </Button>
        </div>
      </Section>
    </div>
  );
}
