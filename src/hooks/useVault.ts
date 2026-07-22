import { useState, useEffect, useCallback } from 'react';
import type { AppView, Bookmark, VaultData } from '../types';
import { generateSalt, encryptData, decryptData, reEncryptData } from '../lib/crypto';

// ── Chrome storage helpers ────────────────────────────────────────────────────

function localGet(keys: string[]): Promise<Record<string, unknown>> {
  return new Promise(resolve =>
    chrome.storage.local.get(keys, resolve as (items: Record<string, unknown>) => void),
  );
}

function localSet(items: Record<string, unknown>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(items, resolve));
}

function sessionGet(keys: string[]): Promise<Record<string, unknown>> {
  return new Promise(resolve =>
    chrome.storage.session.get(keys, resolve as (items: Record<string, unknown>) => void),
  );
}

function sessionSet(items: Record<string, unknown>): Promise<void> {
  return new Promise(resolve => chrome.storage.session.set(items, resolve));
}

function sessionRemove(keys: string[]): Promise<void> {
  return new Promise(resolve => chrome.storage.session.remove(keys, resolve));
}

function setActionIcon(state: 'locked' | 'unlocked'): void {
  const base = state === 'locked' ? 'icons/icon' : 'icons/icon-unlocked';
  chrome.action.setIcon({
    path: {
      16: `${base}16.png`,
      48: `${base}48.png`,
      128: `${base}128.png`,
    },
  });
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return 'https://' + trimmed;
  return trimmed;
}

function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface VaultActions {
  view: AppView;
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  navigateTo: (view: Extract<AppView, 'unlocked' | 'changePassword'>) => void;
  setupVault: (pw: string, confirmPw: string) => Promise<boolean>;
  unlock: (pw: string) => Promise<boolean>;
  lock: () => Promise<void>;
  addBookmark: (title: string, url: string) => Promise<boolean>;
  saveBookmarks: (next: Bookmark[]) => Promise<boolean>;
  deleteBookmark: (id: string) => Promise<void>;
  changePassword: (oldPw: string, newPw: string, confirmPw: string) => Promise<boolean>;
}

export function useVault(): VaultActions {
  const [view, setView] = useState<AppView>('loading');
  const [password, setPassword] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Re-encrypt and persist bookmarks
  const persistBookmarks = useCallback(async (bms: Bookmark[], pw: string): Promise<void> => {
    const stored = await localGet(['vault_salt']);
    const encrypted = await encryptData(
      { bookmarks: bms } satisfies VaultData,
      pw,
      stored.vault_salt as number[],
    );
    await localSet({ vault_data: encrypted });
  }, []);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const stored = await localGet(['vault_salt']);
      const salt = stored.vault_salt as number[] | undefined;

      if (!salt) {
        setActionIcon('locked');
        setView('setup');
        return;
      }

      // Reuse password from current browser session if available
      const session = await sessionGet(['session_password']);
      const sessionPw = session.session_password as string | undefined;

      if (sessionPw) {
        try {
          const data = await localGet(['vault_data']);
          const plaintext = await decryptData<VaultData>(data.vault_data as number[], sessionPw, salt);
          setPassword(sessionPw);
          setBookmarks(plaintext.bookmarks ?? []);
          setActionIcon('unlocked');
          setView('unlocked');
          return;
        } catch {
          // Session password stale — fall through to lock screen
          await sessionRemove(['session_password']);
        }
      }

      setActionIcon('locked');
      setView('locked');
    })();
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const setupVault = async (pw: string, confirmPw: string): Promise<boolean> => {
    setError(null);
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return false; }
    if (pw !== confirmPw) { setError('Passwords do not match.'); return false; }

    setIsLoading(true);
    try {
      const salt = generateSalt();
      const encrypted = await encryptData({ bookmarks: [] } satisfies VaultData, pw, salt);
      await localSet({ vault_salt: salt, vault_data: encrypted });
      await sessionSet({ session_password: pw });
      setPassword(pw);
      setBookmarks([]);
      setActionIcon('unlocked');
      setView('unlocked');
      return true;
    } catch (e) {
      setError(`Failed to create vault: ${(e as Error).message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = async (pw: string): Promise<boolean> => {
    setError(null);
    if (!pw) { setError('Please enter your password.'); return false; }

    setIsLoading(true);
    try {
      const stored = await localGet(['vault_salt', 'vault_data']);
      const plaintext = await decryptData<VaultData>(
        stored.vault_data as number[],
        pw,
        stored.vault_salt as number[],
      );
      setPassword(pw);
      setBookmarks(plaintext.bookmarks ?? []);
      await sessionSet({ session_password: pw });
      setActionIcon('unlocked');
      setView('unlocked');
      return true;
    } catch {
      setError('Incorrect password. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const lock = async (): Promise<void> => {
    setPassword(null);
    setBookmarks([]);
    await sessionRemove(['session_password']);
    setActionIcon('locked');
    setView('locked');
  };

  const addBookmark = async (title: string, url: string): Promise<boolean> => {
    setError(null);
    if (!title.trim()) { setError('Please enter a title.'); return false; }
    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) { setError('Please enter a valid URL.'); return false; }
    if (!password) return false;

    setIsLoading(true);
    const bm: Bookmark = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: normalized,
      createdAt: Date.now(),
    };
    const updated = [bm, ...bookmarks];
    try {
      await persistBookmarks(updated, password);
      setBookmarks(updated);
      return true;
    } catch (e) {
      setError(`Failed to save: ${(e as Error).message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveBookmarks = async (next: Bookmark[]): Promise<boolean> => {
    setError(null);
    if (!password) return false;

    const now = Date.now();
    const normalized: Bookmark[] = [];

    for (let i = 0; i < next.length; i += 1) {
      const source = next[i];
      const cleanTitle = source.title.trim();
      const cleanUrl = normalizeUrl(source.url);

      if (!cleanTitle) {
        setError(`Bookmark ${i + 1} is missing a title.`);
        return false;
      }
      if (!isValidUrl(cleanUrl)) {
        setError(`Bookmark ${i + 1} has an invalid URL.`);
        return false;
      }

      normalized.push({
        id: source.id || crypto.randomUUID(),
        title: cleanTitle,
        url: cleanUrl,
        createdAt: Number.isFinite(source.createdAt) ? source.createdAt : now - i,
      });
    }

    setIsLoading(true);
    try {
      await persistBookmarks(normalized, password);
      setBookmarks(normalized);
      return true;
    } catch (e) {
      setError(`Failed to save: ${(e as Error).message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBookmark = async (id: string): Promise<void> => {
    if (!password) return;
    const updated = bookmarks.filter(b => b.id !== id);
    setIsLoading(true);
    try {
      await persistBookmarks(updated, password);
      setBookmarks(updated);
    } catch (e) {
      setError(`Failed to delete: ${(e as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (oldPw: string, newPw: string, confirmPw: string): Promise<boolean> => {
    setError(null);
    if (!oldPw) { setError('Enter your current password.'); return false; }
    if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return false; }
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return false; }

    setIsLoading(true);
    try {
      const stored = await localGet(['vault_salt', 'vault_data']);
      const { newSalt, newEncrypted } = await reEncryptData(
        stored.vault_data as number[],
        oldPw,
        newPw,
        stored.vault_salt as number[],
      );
      await localSet({ vault_salt: newSalt, vault_data: newEncrypted });
      setPassword(newPw);
      await sessionSet({ session_password: newPw });
      setActionIcon('unlocked');
      setView('unlocked');
      return true;
    } catch {
      setError('Current password is incorrect.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (v: Extract<AppView, 'unlocked' | 'changePassword'>): void => {
    setError(null);
    setView(v);
  };

  return {
    view,
    bookmarks,
    isLoading,
    error,
    clearError,
    navigateTo,
    setupVault,
    unlock,
    lock,
    addBookmark,
    saveBookmarks,
    deleteBookmark,
    changePassword,
  };
}
