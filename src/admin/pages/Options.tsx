import { useAdmin } from '../state';
import { Info, PageHeader, Section, TextInput, Toggle } from '../ui';

export function OptionsPage() {
  const { draft, update } = useAdmin();

  return (
    <div className="space-y-6">
      <PageHeader title="Options" description="Choose what shows up on your profile." />

      <Section title="Display">
        <div className="-my-1 divide-y divide-adm-line">
          <div className="pb-4">
            <Toggle
              label="Theme color on icons"
              description="Glow your social icons with your theme color"
              checked={draft.theme.iconGlow}
              onChange={(v) => update((d) => void (d.theme.iconGlow = v))}
            />
          </div>
          <div className="py-4">
            <Toggle
              label="View counter"
              description="Show your total views on the card"
              checked={draft.page.showViews}
              onChange={(v) => update((d) => void (d.page.showViews = v))}
            />
          </div>
          <div className="pt-4">
            <Toggle
              label="Reveal screen"
              description="Ask visitors to click before the page (and music) starts"
              checked={draft.page.reveal.enabled}
              onChange={(v) => update((d) => void (d.page.reveal.enabled = v))}
            />
          </div>
        </div>
      </Section>

      <Section title="Discord">
        <Toggle
          label="Discord presence"
          description="Show your live Discord status under your card"
          checked={draft.discordPresence.enabled}
          onChange={(v) => update((d) => void (d.discordPresence.enabled = v))}
        />
        {draft.discordPresence.enabled && (
          <TextInput
            label="Discord user ID"
            max={20}
            value={draft.discordPresence.userId}
            onChange={(v) => update((d) => void (d.discordPresence.userId = v.replace(/\D/g, '')))}
            placeholder="123456789012345678"
            hint="Discord → Settings → Advanced → Developer Mode → right-click yourself → Copy User ID"
          />
        )}
        {draft.discordPresence.enabled && (
          <Info>
            Uses your own bot: set DISCORD_BOT_TOKEN in .env (steps in .env.example) and add the bot to a server you're in.
            The card stays hidden until the bot can see you.
          </Info>
        )}
      </Section>
    </div>
  );
}
