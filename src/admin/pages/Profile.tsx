import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Description } from '../../components/ProfileCard';
import { errorMessage, useAdmin } from '../state';
import { Button, PageHeader, Section, TextArea, TextInput } from '../ui';

/** Avatar with a change button; saves immediately since there's nothing to preview first. */
function AvatarField() {
  const { draft, upload, commit, notify } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const change = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await upload(file, 'image');
      if (url && (await commit((d) => void (d.user.avatarUrl = url)))) notify('Avatar updated');
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        title="Change avatar"
        className="group relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-adm-accent/50 ring-offset-4 ring-offset-adm-panel"
      >
        <img src={draft.user.avatarUrl} alt="Avatar" className="size-full object-cover" />
        <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-5" />
        </span>
      </button>
      <div>
        <Button tone="secondary" small disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : 'Change avatar'}
        </Button>
        <p className="mt-2 text-xs text-adm-dim">PNG, JPG, GIF or WebP. Square works best.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(e) => {
          void change(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function ProfilePage() {
  const { draft, update } = useAdmin();
  const { user } = draft;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Who you are and what visitors read first." />

      <Section title="Identity">
        <AvatarField />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Username"
            required
            max={25}
            value={user.username}
            onChange={(v) => update((d) => void (d.user.username = v))}
          />
          <TextInput
            label="Location"
            max={50}
            value={user.location}
            onChange={(v) => update((d) => void (d.user.location = v))}
          />
        </div>
      </Section>

      <Section title="Bio">
        <TextArea
          label="Description"
          max={2000}
          value={user.description}
          onChange={(v) => update((d) => void (d.user.description = v))}
          hint="One paragraph per line. A line with only [hr-theme] becomes a divider."
          preview={(text) => (
            <div className="flex flex-col items-center pb-2 text-center">
              <Description text={text} theme={draft.theme} />
            </div>
          )}
        />
      </Section>
    </div>
  );
}
