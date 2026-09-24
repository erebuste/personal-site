import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ExternalLink,
  Images,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Music,
  Palette,
  Share2,
  SlidersHorizontal,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ProfileConfig, PublicProfileResponse } from '../types';
import { AppearancePage } from './pages/Appearance';
import { DashboardPage } from './pages/Dashboard';
import { EmbedPage, LinksPage, ShowcasesPage, TracksPage } from './pages/Extras';
import { OptionsPage } from './pages/Options';
import { ProfilePage } from './pages/Profile';
import { AdminContext, ApiError, api, errorMessage, type AdminState, type Page } from './state';
import { Button, Field, Info, Logo, cx } from './ui';

const NAV: { title: string; items: { page: Page; label: string; icon: LucideIcon }[] }[] = [
  { title: 'Overview', items: [{ page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Profile',
    items: [
      { page: 'profile', label: 'Profile', icon: UserRound },
      { page: 'options', label: 'Options', icon: SlidersHorizontal },
      { page: 'appearance', label: 'Appearance', icon: Palette },
    ],
  },
  {
    title: 'Extras',
    items: [
      { page: 'embed', label: 'Profile Embed', icon: Share2 },
      { page: 'links', label: 'Links', icon: Link2 },
      { page: 'showcases', label: 'Showcases', icon: Images },
      { page: 'tracks', label: 'Tracks', icon: Music },
    ],
  },
];

const PAGES: Record<Page, () => ReactNode> = {
  dashboard: DashboardPage,
  profile: ProfilePage,
  options: OptionsPage,
  appearance: AppearancePage,
  embed: EmbedPage,
  links: LinksPage,
  showcases: ShowcasesPage,
  tracks: TracksPage,
};

const isPage = (s: string): s is Page => Object.hasOwn(PAGES, s);
const pageFromPath = (): Page => {
  const segment = location.pathname.split('/')[2] ?? '';
  return isPage(segment) ? segment : 'dashboard';
};

type Session = { authed: boolean; enabled: boolean };
type Toast = { message: string; tone: 'ok' | 'error' };

/** Page background with a faint violet/pink glow in opposite corners. */
function Backdrop({ children }: { children: ReactNode }) {
  return (
    <div className="adm relative min-h-dvh bg-adm-bg font-ui text-adm-text">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_85%_-10%,rgb(139_92_246/0.14),transparent),radial-gradient(45rem_30rem_at_-5%_110%,rgb(236_72_153/0.08),transparent)]"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Admin';
    api<Session>('/api/session').then(setSession, (e: unknown) => setError(errorMessage(e)));
  }, []);

  if (error)
    return (
      <Backdrop>
        <div className="grid min-h-dvh place-items-center px-4">
          <Info tone="warn">Can&apos;t reach the API ({error}). Is the server running?</Info>
        </div>
      </Backdrop>
    );
  if (!session) return <Backdrop>{null}</Backdrop>;
  if (!session.authed) return <Login enabled={session.enabled} onLogin={() => setSession({ ...session, authed: true })} />;
  return <Shell onLogout={() => setSession({ ...session, authed: false })} />;
}

function Login({ enabled, onLogin }: { enabled: boolean; onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
      onLogin();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Backdrop>
      <div className="grid min-h-dvh place-items-center px-4">
        <form
          onSubmit={submit}
          className="w-full max-w-sm space-y-6 rounded-2xl border border-adm-line bg-adm-panel/80 p-8 shadow-2xl shadow-adm-violet/10 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center text-center">
            <Logo className="size-12" />
            <h1 className="mt-5 font-sans text-xl font-bold">Welcome back</h1>
            <p className="mt-1.5 text-sm text-adm-muted">Sign in to edit your profile.</p>
          </div>
          {!enabled && <Info tone="warn">Set ADMIN_PASSWORD on the server to enable the dashboard.</Info>}
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-adm-line bg-adm-field px-3 text-sm outline-none focus:border-adm-violet focus:ring-2 focus:ring-adm-violet/25"
            />
          </Field>
          {error && <p className="text-sm text-adm-danger">{error}</p>}
          <Button type="submit" disabled={busy || !enabled || !password} className="h-11 w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </Backdrop>
  );
}

const produce = (base: ProfileConfig, recipe: (d: ProfileConfig) => void): ProfileConfig => {
  const next = structuredClone(base);
  recipe(next);
  return next;
};

function Shell({ onLogout }: { onLogout: () => void }) {
  const [saved, setSaved] = useState<ProfileConfig | null>(null);
  const [draft, setDraft] = useState<ProfileConfig | null>(null);
  const [page, setPage] = useState<Page>(pageFromPath);
  const [toast, setToast] = useState<Toast | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'ok') => setToast({ message, tone }), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.tone === 'error' ? 6000 : 2200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    api<PublicProfileResponse>('/api/profile').then(
      ({ profile }) => {
        setSaved(profile);
        setDraft(profile);
      },
      (e: unknown) => notify(errorMessage(e), 'error'),
    );
  }, [notify]);

  useEffect(() => {
    const onPop = () => setPage(pageFromPath());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const dirty = saved !== null && draft !== null && JSON.stringify(saved) !== JSON.stringify(draft);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  const toastEl = toast && (
    <div
      role="status"
      className={cx(
        'animate-fade-in fixed top-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm whitespace-pre-line shadow-xl backdrop-blur-xl',
        toast.tone === 'ok'
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
          : 'border-adm-danger/40 bg-adm-danger/15 text-rose-100',
      )}
    >
      {toast.message}
    </div>
  );

  if (!saved || !draft) return <Backdrop>{toastEl}</Backdrop>;

  const persist = async (next: ProfileConfig): Promise<ProfileConfig | null> => {
    try {
      const stored = await api<ProfileConfig>('/api/admin/profile', { method: 'PUT', body: JSON.stringify(next) });
      setSaved(stored);
      return stored;
    } catch (e) {
      notify(errorMessage(e), 'error');
      if (e instanceof ApiError && e.status === 401) onLogout();
      return null;
    }
  };

  const state: AdminState = {
    saved,
    draft,
    dirty,
    page,
    update: (recipe) => setDraft((prev) => prev && produce(prev, recipe)),
    // Built from `saved`, not `draft`: adding a link mustn't also publish unrelated unsaved edits.
    // Pending edits stay in the draft (and the "Unsaved changes" bar) with the committed change applied on top.
    commit: async (recipe) => {
      const stored = await persist(produce(saved, recipe));
      if (stored) setDraft((prev) => (prev && dirty ? produce(prev, recipe) : stored));
      return stored !== null;
    },
    save: async () => {
      const stored = await persist(draft);
      if (stored) {
        setDraft(stored);
        notify('Changes saved');
      }
      return stored !== null;
    },
    reset: () => setDraft(saved),
    upload: async (file, kind) => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('file', file);
      const { url } = await api<{ url: string }>('/api/admin/upload', { method: 'POST', body: form });
      return url;
    },
    notify,
    go: (next) => {
      history.pushState(null, '', next === 'dashboard' ? '/admin' : `/admin/${next}`);
      setPage(next);
      setMenuOpen(false);
      scrollTo(0, 0);
    },
  };

  const CurrentPage = PAGES[page];
  const host = URL.canParse(saved.embed.siteUrl) ? new URL(saved.embed.siteUrl).host : saved.embed.siteUrl;
  const logout = () => void api('/api/logout', { method: 'POST' }).finally(onLogout);

  return (
    <AdminContext.Provider value={state}>
      <Backdrop>
        {/* Sidebar: fixed on desktop, slide-out drawer on mobile */}
        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-adm-line bg-adm-bg/95 backdrop-blur-xl transition-transform duration-200 md:translate-x-0',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <button type="button" onClick={() => state.go('dashboard')} className="flex cursor-pointer items-center gap-2.5">
              <Logo className="size-8" />
              <span className="font-sans text-[15px] font-bold tracking-tight">{saved.user.username}</span>
              <span className="rounded-md bg-adm-violet/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">admin</span>
            </button>
            <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="text-adm-muted md:hidden">
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {NAV.map((group) => (
              <div key={group.title}>
                <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-adm-dim uppercase">{group.title}</p>
                {group.items.map(({ page: target, label, icon: Icon }) => {
                  const active = page === target;
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => state.go(target)}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'relative mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        active ? 'bg-adm-violet/12 text-adm-text' : 'text-adm-muted hover:bg-white/[0.04] hover:text-adm-text',
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-linear-to-b from-adm-violet to-adm-pink" />
                      )}
                      <Icon className={cx('size-4', active && 'text-violet-300')} />
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-adm-line p-3">
            <div className="flex items-center gap-3 rounded-xl p-2">
              <img src={saved.user.avatarUrl} alt="" className="size-9 rounded-full object-cover ring-2 ring-adm-violet/40" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{saved.user.username}</p>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1 truncate text-xs text-adm-muted hover:text-adm-text"
                >
                  <span className="truncate">{host}</span> <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
              <button
                type="button"
                aria-label="Log out"
                title="Log out"
                onClick={logout}
                className="cursor-pointer rounded-lg p-2 text-adm-muted transition-colors hover:bg-white/5 hover:text-adm-danger"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>
        {menuOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMenuOpen(false)} />}

        <div className="md:pl-64">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-adm-line bg-adm-bg/80 px-4 backdrop-blur-xl md:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="text-adm-muted">
              <Menu className="size-5" />
            </button>
            <Logo className="size-7" />
            <a href="/" target="_blank" rel="noopener" aria-label="View profile" className="text-adm-muted">
              <ExternalLink className="size-4" />
            </a>
          </header>

          <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-32 sm:px-8 md:pt-12">
            <CurrentPage />
          </main>
        </div>

        {dirty && (
          <div className="animate-fade-in pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-5 md:pl-64">
            <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-adm-line-strong bg-adm-panel/90 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:mx-8">
              <p className="flex items-center gap-2 text-sm text-adm-muted">
                <span className="size-2 animate-pulse rounded-full bg-adm-pink" /> Unsaved changes
              </p>
              <div className="flex gap-2">
                <Button tone="ghost" onClick={state.reset} disabled={saving}>
                  Discard
                </Button>
                <Button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    await state.save();
                    setSaving(false);
                  }}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {toastEl}
      </Backdrop>
    </AdminContext.Provider>
  );
}
