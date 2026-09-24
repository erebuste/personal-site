import { createContext, useContext } from 'react';
import type { ProfileConfig } from '../types';

export type Page = 'dashboard' | 'profile' | 'options' | 'appearance' | 'embed' | 'links' | 'showcases' | 'tracks';
export type UploadKind = 'image' | 'media' | 'audio';

export interface AdminState {
  saved: ProfileConfig;
  draft: ProfileConfig;
  dirty: boolean;
  page: Page;
  /** Edit the draft; nothing is persisted until save(). */
  update: (recipe: (d: ProfileConfig) => void) => void;
  /** Edit the draft and persist immediately (links, tracks, avatar). */
  commit: (recipe: (d: ProfileConfig) => void) => Promise<boolean>;
  save: () => Promise<boolean>;
  reset: () => void;
  upload: (file: File, kind: UploadKind) => Promise<string | null>;
  notify: (message: string, tone?: 'ok' | 'error') => void;
  go: (page: Page) => void;
}

export const AdminContext = createContext<AdminState | null>(null);

export function useAdmin(): AdminState {
  const state = useContext(AdminContext);
  if (!state) throw new Error('useAdmin() used outside <Admin>');
  return state;
}

/** fetch + JSON with the server's `{ error }` message surfaced as the thrown Error. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = init.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers };
  const res = await fetch(path, { ...init, headers });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
