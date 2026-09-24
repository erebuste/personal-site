import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { defaultProfile } from './config/profile';
import type { PublicProfileResponse } from './types';
import './index.css';

// Admin is its own chunk so visitors never download it.
const Admin = lazy(() => import('./admin/Admin'));

async function loadProfile(): Promise<PublicProfileResponse> {
  try {
    const res = await fetch('/api/profile');
    if (res.ok) return (await res.json()) as PublicProfileResponse;
    console.warn(`/api/profile returned ${res.status}; using bundled defaults`);
  } catch (e) {
    console.warn('API unreachable; using bundled defaults', e);
  }
  return { profile: defaultProfile };
}

const el = document.getElementById('root');
if (!el) throw new Error('#root element missing from index.html');
const root = createRoot(el);

if (location.pathname.startsWith('/admin')) {
  root.render(
    <StrictMode>
      <Suspense>
        <Admin />
      </Suspense>
    </StrictMode>,
  );
} else {
  const { profile, views } = await loadProfile();
  root.render(
    <StrictMode>
      <App profile={profile} views={views} />
    </StrictMode>,
  );
}
