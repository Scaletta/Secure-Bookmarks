import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useVault } from './hooks/useVault';
import type { Bookmark } from './types';

type ImportMode = 'append' | 'replace';
type SortMode = 'newest' | 'oldest' | 'title';

function parseImportedBookmarks(raw: string): Array<Pick<Bookmark, 'title' | 'url'>> {
  const parsed: unknown = JSON.parse(raw);
  const data = (parsed as { bookmarks?: unknown[] }).bookmarks;
  const source = Array.isArray(data) ? data : Array.isArray(parsed) ? parsed : [];

  return source
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const title = (item as { title?: unknown }).title;
      const url = (item as { url?: unknown }).url;
      if (typeof title !== 'string' || typeof url !== 'string') return null;
      return { title, url };
    })
    .filter((item): item is Pick<Bookmark, 'title' | 'url'> => item !== null);
}

function dedupeBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  const seen = new Set<string>();
  const unique: Bookmark[] = [];

  for (const bookmark of bookmarks) {
    const key = `${bookmark.title.trim().toLowerCase()}::${bookmark.url.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(bookmark);
  }

  return unique;
}

export default function OptionsApp() {
  const vault = useVault();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleBookmarks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? vault.bookmarks
      : vault.bookmarks.filter(
          bookmark =>
            bookmark.title.toLowerCase().includes(q) || bookmark.url.toLowerCase().includes(q),
        );

    const sorted = [...filtered];
    if (sort === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => a.createdAt - b.createdAt);
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
  }, [vault.bookmarks, search, sort]);

  const hostCount = useMemo(() => {
    const hosts = new Set<string>();
    for (const bookmark of vault.bookmarks) {
      try {
        hosts.add(new URL(bookmark.url).hostname.replace(/^www\./i, ''));
      } catch {
        // Ignore malformed URLs here; save validation handles user-facing errors.
      }
    }
    return hosts.size;
  }, [vault.bookmarks]);

  const clearMessages = () => {
    setNotice(null);
    vault.clearError();
  };

  const addBookmark = async () => {
    clearMessages();
    const ok = await vault.addBookmark(title, url);
    if (!ok) return;

    setTitle('');
    setUrl('');
    setNotice('Bookmark added.');
  };

  const fillCurrentTab = async () => {
    clearMessages();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.title) setTitle(tab.title);
    if (tab?.url) setUrl(tab.url);
  };

  const startEdit = (bookmark: Bookmark) => {
    clearMessages();
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditUrl('');
  };

  const saveEdit = async (id: string) => {
    clearMessages();
    const updated = vault.bookmarks.map(bookmark =>
      bookmark.id === id ? { ...bookmark, title: editTitle, url: editUrl } : bookmark,
    );
    const ok = await vault.saveBookmarks(updated);
    if (!ok) return;

    cancelEdit();
    setNotice('Bookmark updated.');
  };

  const removeBookmark = async (id: string) => {
    clearMessages();
    await vault.deleteBookmark(id);
    setNotice('Bookmark deleted.');
  };

  const exportBookmarks = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      count: vault.bookmarks.length,
      bookmarks: vault.bookmarks,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `secure-bookmarks-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleImportClick = (mode: ImportMode) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.mode = mode;
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const importFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    const file = event.target.files?.[0];
    if (!file) return;

    const mode = (event.target.dataset.mode as ImportMode | undefined) ?? 'append';

    try {
      const text = await file.text();
      const importedRaw = parseImportedBookmarks(text);
      if (importedRaw.length === 0) {
        setNotice('No valid bookmark entries found in the selected file.');
        return;
      }

      const importedBookmarks: Bookmark[] = importedRaw.map((bookmark, index) => ({
        id: crypto.randomUUID(),
        title: bookmark.title,
        url: bookmark.url,
        createdAt: Date.now() - index,
      }));

      const combined = mode === 'replace'
        ? importedBookmarks
        : dedupeBookmarks([...importedBookmarks, ...vault.bookmarks]);

      const ok = await vault.saveBookmarks(combined);
      if (!ok) return;

      setNotice(
        mode === 'replace'
          ? `Replaced vault with ${combined.length} bookmarks.`
          : `Imported ${importedBookmarks.length} bookmarks. Vault now has ${combined.length}.`,
      );
    } catch {
      vault.clearError();
      setNotice('Invalid JSON file. Please choose a valid export file.');
    }
  };

  const clearAllBookmarks = async () => {
    clearMessages();
    if (!window.confirm('Delete all bookmarks from this vault? This cannot be undone.')) return;

    const ok = await vault.saveBookmarks([]);
    if (ok) setNotice('All bookmarks removed.');
  };

  const openChangePassword = () => {
    clearMessages();
    vault.navigateTo('changePassword');
  };

  if (vault.view === 'loading' || vault.isLoading) {
    return (
      <div className="options-shell">
        <div className="loading-card">Decrypting vault...</div>
      </div>
    );
  }

  if (vault.view === 'setup') {
    return (
      <div className="options-shell">
        <section className="auth-card">
          <h1>Create Your Secure Vault</h1>
          <p className="auth-subtitle">Create a master password to start using Secure Bookmarks.</p>
          <AuthSetupForm onSubmit={vault.setupVault} error={vault.error} clearError={vault.clearError} />
        </section>
      </div>
    );
  }

  if (vault.view === 'locked') {
    return (
      <div className="options-shell">
        <section className="auth-card">
          <h1>Vault Locked</h1>
          <p className="auth-subtitle">Enter your master password to manage your bookmarks.</p>
          <AuthUnlockForm onSubmit={vault.unlock} error={vault.error} clearError={vault.clearError} />
        </section>
      </div>
    );
  }

  if (vault.view === 'changePassword') {
    return (
      <div className="options-shell">
        <section className="auth-card">
          <h1>Change Master Password</h1>
          <p className="auth-subtitle">Your vault will be re-encrypted with the new password.</p>
          <ChangePasswordForm
            onSubmit={vault.changePassword}
            onCancel={() => vault.navigateTo('unlocked')}
            error={vault.error}
            clearError={vault.clearError}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="options-shell">
      <div className="backdrop" aria-hidden="true" />
      <header className="hero">
        <div>
          <p className="hero-kicker">Secure Bookmarks</p>
          <h1>Vault Control Center</h1>
          <p>Search, edit, import, and organize every encrypted bookmark in one place.</p>
        </div>
        <div className="hero-actions">
          <button className="btn ghost" onClick={openChangePassword}>Change Password</button>
          <button className="btn danger" onClick={vault.lock}>Lock Vault</button>
        </div>
      </header>

      <main className="layout">
        <aside className="panel side-panel">
          <h2>Add Bookmark</h2>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Docs, dashboard, reference..."
              autoComplete="off"
            />
          </label>
          <label>
            URL
            <input
              type="url"
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://example.com"
              autoComplete="off"
            />
          </label>
          <div className="btn-row">
            <button className="btn secondary" onClick={fillCurrentTab}>Use Current Tab</button>
            <button className="btn primary" onClick={addBookmark}>Add</button>
          </div>

          <section className="mini-stats">
            <p><strong>{vault.bookmarks.length}</strong> bookmarks stored</p>
            <p><strong>{hostCount}</strong> unique sites</p>
          </section>

          <section className="import-export">
            <h3>Data Controls</h3>
            <div className="stacked-actions">
              <button className="btn secondary" onClick={exportBookmarks} disabled={vault.bookmarks.length === 0}>
                Export JSON
              </button>
              <button className="btn secondary" onClick={() => handleImportClick('append')}>
                Import and Merge
              </button>
              <button className="btn ghost" onClick={() => handleImportClick('replace')}>
                Replace From Import
              </button>
              <button className="btn danger subtle" onClick={clearAllBookmarks} disabled={vault.bookmarks.length === 0}>
                Delete Everything
              </button>
            </div>
          </section>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={importFromFile}
            hidden
          />
        </aside>

        <section className="panel table-panel">
          <div className="table-toolbar">
            <input
              type="search"
              placeholder="Search title or URL"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <select value={sort} onChange={event => setSort(event.target.value as SortMode)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          {vault.error && <p className="message error">{vault.error}</p>}
          {notice && <p className="message notice">{notice}</p>}

          <div className="bookmark-table" role="table" aria-label="Bookmark list">
            <div className="table-head" role="rowgroup">
              <div role="row">
                <span role="columnheader">Title</span>
                <span role="columnheader">URL</span>
                <span role="columnheader">Added</span>
                <span role="columnheader">Actions</span>
              </div>
            </div>

            <div className="table-body" role="rowgroup">
              {visibleBookmarks.length === 0 ? (
                <p className="empty-state">No bookmarks match your filter.</p>
              ) : (
                visibleBookmarks.map(bookmark => {
                  const editing = editingId === bookmark.id;
                  return (
                    <div className="table-row" role="row" key={bookmark.id}>
                      <div role="cell">
                        {editing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={event => setEditTitle(event.target.value)}
                            autoFocus
                          />
                        ) : (
                          <p className="bookmark-title">{bookmark.title}</p>
                        )}
                      </div>
                      <div role="cell">
                        {editing ? (
                          <input
                            type="url"
                            value={editUrl}
                            onChange={event => setEditUrl(event.target.value)}
                          />
                        ) : (
                          <a href={bookmark.url} target="_blank" rel="noreferrer" className="bookmark-url">
                            {bookmark.url}
                          </a>
                        )}
                      </div>
                      <div role="cell" className="muted">
                        {new Date(bookmark.createdAt).toLocaleDateString()}
                      </div>
                      <div role="cell" className="actions-cell">
                        {editing ? (
                          <>
                            <button className="btn secondary tiny" onClick={cancelEdit}>Cancel</button>
                            <button className="btn primary tiny" onClick={() => saveEdit(bookmark.id)}>
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn ghost tiny" onClick={() => startEdit(bookmark)}>Edit</button>
                            <button className="btn danger tiny" onClick={() => removeBookmark(bookmark.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AuthSetupForm({
  onSubmit,
  error,
  clearError,
}: {
  onSubmit: (pw: string, confirmPw: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}) {
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const submit = () => {
    clearError();
    void onSubmit(pw, confirmPw);
  };

  return (
    <div className="auth-form">
      <label>
        Master password
        <input
          type="password"
          value={pw}
          onChange={event => setPw(event.target.value)}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          value={confirmPw}
          onChange={event => setConfirmPw(event.target.value)}
          autoComplete="new-password"
          placeholder="Type it again"
        />
      </label>
      {error && <p className="message error">{error}</p>}
      <button className="btn primary" onClick={submit}>Create Vault</button>
    </div>
  );
}

function AuthUnlockForm({
  onSubmit,
  error,
  clearError,
}: {
  onSubmit: (pw: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}) {
  const [pw, setPw] = useState('');

  const submit = () => {
    clearError();
    void onSubmit(pw);
  };

  return (
    <div className="auth-form">
      <label>
        Master password
        <input
          type="password"
          value={pw}
          onChange={event => setPw(event.target.value)}
          autoComplete="current-password"
          placeholder="Enter your password"
          autoFocus
        />
      </label>
      {error && <p className="message error">{error}</p>}
      <button className="btn primary" onClick={submit}>Unlock Vault</button>
    </div>
  );
}

function ChangePasswordForm({
  onSubmit,
  onCancel,
  error,
  clearError,
}: {
  onSubmit: (oldPw: string, newPw: string, confirmPw: string) => Promise<boolean>;
  onCancel: () => void;
  error: string | null;
  clearError: () => void;
}) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const submit = () => {
    clearError();
    void onSubmit(oldPw, newPw, confirmPw);
  };

  return (
    <div className="auth-form">
      <label>
        Current password
        <input
          type="password"
          value={oldPw}
          onChange={event => setOldPw(event.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label>
        New password
        <input
          type="password"
          value={newPw}
          onChange={event => setNewPw(event.target.value)}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          value={confirmPw}
          onChange={event => setConfirmPw(event.target.value)}
          autoComplete="new-password"
        />
      </label>
      {error && <p className="message error">{error}</p>}
      <div className="btn-row">
        <button className="btn secondary" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={submit}>Save Password</button>
      </div>
    </div>
  );
}
