import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowUpDown,
  Download,
  FileDown,
  FileUp,
  ExternalLink,
  Link2,
  Lock,
  PencilLine,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
  Save,
  LogOut,
} from 'lucide-react';

import { useVault } from './hooks/useVault';
import type { Bookmark } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
          bookmark => bookmark.title.toLowerCase().includes(q) || bookmark.url.toLowerCase().includes(q),
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
        // Ignore malformed URLs; save validation handles the user-facing error.
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

      const combined = mode === 'replace' ? importedBookmarks : dedupeBookmarks([...importedBookmarks, ...vault.bookmarks]);

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

  const openOptionsPage = () => {
    clearMessages();
    chrome.runtime.openOptionsPage();
  };

  if (vault.view === 'loading' || vault.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <Card className="border-border/70 bg-card/95 shadow-2xl">
          <CardContent className="flex items-center gap-3 px-6 py-5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span className="text-sm font-medium text-muted-foreground">Decrypting vault...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vault.view === 'setup') {
    return (
      <CenteredAuthShell>
        <AuthSetupForm onSubmit={vault.setupVault} error={vault.error} clearError={vault.clearError} />
      </CenteredAuthShell>
    );
  }

  if (vault.view === 'locked') {
    return (
      <CenteredAuthShell>
        <AuthUnlockForm onSubmit={vault.unlock} error={vault.error} clearError={vault.clearError} />
      </CenteredAuthShell>
    );
  }

  if (vault.view === 'changePassword') {
    return (
      <CenteredAuthShell>
        <ChangePasswordForm
          onSubmit={vault.changePassword}
          onCancel={() => vault.navigateTo('unlocked')}
          error={vault.error}
          clearError={vault.clearError}
        />
      </CenteredAuthShell>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,63,94,0.12),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))] px-4 py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-2xl backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Secure Bookmarks</p>
                <h1 className="text-2xl font-semibold tracking-tight">Vault Control Center</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Search, edit, import, export, and organize every encrypted bookmark in a single shadcn-style workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {vault.bookmarks.length} bookmarks
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {hostCount} unique sites
            </Badge>
            <Button variant="outline" onClick={openChangePassword}>
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <Button variant="outline" onClick={vault.lock}>
              <LogOut className="mr-2 h-4 w-4" />
              Lock Vault
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="border-border/70 bg-card/90 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle>Add Bookmark</CardTitle>
              <CardDescription>Save the current page or add a custom URL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="options-title">Title</Label>
                <Input
                  id="options-title"
                  type="text"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Docs, dashboard, reference..."
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="options-url">URL</Label>
                <Input
                  id="options-url"
                  type="url"
                  value={url}
                  onChange={event => setUrl(event.target.value)}
                  placeholder="https://example.com"
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={fillCurrentTab}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Current Page
                </Button>
                <Button onClick={addBookmark}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>

              {vault.error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {vault.error}
                </div>
              )}
              {notice && (
                <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  {notice}
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                  <p className="text-muted-foreground">Stored</p>
                  <p className="mt-1 text-lg font-semibold">{vault.bookmarks.length}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                  <p className="text-muted-foreground">Hosts</p>
                  <p className="mt-1 text-lg font-semibold">{hostCount}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-3">
                <p className="text-sm font-medium">Data Controls</p>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={exportBookmarks} disabled={vault.bookmarks.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                  <Button variant="outline" onClick={() => handleImportClick('append')}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import and Merge
                  </Button>
                  <Button variant="outline" onClick={() => handleImportClick('replace')}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Replace From Import
                  </Button>
                  <Button variant="destructive" onClick={clearAllBookmarks} disabled={vault.bookmarks.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Everything
                  </Button>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="application/json" onChange={importFromFile} hidden />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-xl backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>All Bookmarks</CardTitle>
                  <CardDescription>Search, sort, edit, or remove entries.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  Manage all saved items
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    className="pl-9"
                    placeholder="Search title or URL"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={event => setSort(event.target.value as SortMode)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title">Title A-Z</option>
                  </select>
                  <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <ScrollArea className="max-h-[68vh] pr-1">
                <div className="space-y-3">
                  {visibleBookmarks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4 py-10 text-center text-sm text-muted-foreground">
                      No bookmarks match your search.
                    </div>
                  ) : (
                    visibleBookmarks.map(bookmark => (
                      <BookmarkRow
                        key={bookmark.id}
                        bookmark={bookmark}
                        editingId={editingId}
                        editTitle={editTitle}
                        editUrl={editUrl}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onDelete={removeBookmark}
                        onEditTitleChange={setEditTitle}
                        onEditUrlChange={setEditUrl}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CenteredAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,63,94,0.12),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))] px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
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
  const confirmRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    clearError();
    void onSubmit(pw, confirmPw);
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">Create Your Vault</CardTitle>
          <CardDescription>Choose a master password to secure your bookmarks.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="setup-password">Master Password</Label>
          <Input
            id="setup-password"
            type="password"
            value={pw}
            onChange={event => setPw(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && confirmRef.current?.focus()}
            placeholder="Choose a strong password"
            autoComplete="new-password"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-confirm">Confirm Password</Label>
          <Input
            id="setup-confirm"
            ref={confirmRef}
            type="password"
            value={confirmPw}
            onChange={event => setConfirmPw(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && submit()}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <Button className="w-full" onClick={submit}>
          Create Vault
        </Button>
      </CardContent>
    </Card>
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
    <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">Vault Locked</CardTitle>
          <CardDescription>Enter your master password to unlock.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="unlock-password">Master Password</Label>
          <Input
            id="unlock-password"
            type="password"
            value={pw}
            onChange={event => setPw(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && submit()}
            placeholder="Enter your password"
            autoComplete="current-password"
            autoFocus
          />
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <Button className="w-full" onClick={submit}>
          Unlock Vault
        </Button>
      </CardContent>
    </Card>
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
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    clearError();
    void onSubmit(oldPw, newPw, confirmPw);
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Re-encrypt your vault with a new master password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <Input
            id="current-password"
            type="password"
            value={oldPw}
            onChange={event => setOldPw(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && newRef.current?.focus()}
            placeholder="Current password"
            autoComplete="current-password"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            ref={newRef}
            type="password"
            value={newPw}
            onChange={event => setNewPw(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && confirmRef.current?.focus()}
            placeholder="New password"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            ref={confirmRef}
            type="password"
            value={confirmPw}
            onChange={event => setConfirmPw(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && submit()}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit}>
            Save Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BookmarkRow({
  bookmark,
  editingId,
  editTitle,
  editUrl,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditTitleChange,
  onEditUrlChange,
}: {
  bookmark: Bookmark;
  editingId: string | null;
  editTitle: string;
  editUrl: string;
  onStartEdit: (bookmark: Bookmark) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditTitleChange: (value: string) => void;
  onEditUrlChange: (value: string) => void;
}) {
  const editing = editingId === bookmark.id;

  return (
    <Card className="border-border/70 bg-background/60 p-4 transition-shadow hover:shadow-lg">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-center">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</p>
          {editing ? (
            <Input value={editTitle} onChange={event => onEditTitleChange(event.target.value)} autoFocus />
          ) : (
            <p className="truncate text-sm font-medium text-foreground">{bookmark.title}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">URL</p>
          {editing ? (
            <Input type="url" value={editUrl} onChange={event => onEditUrlChange(event.target.value)} />
          ) : (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 truncate text-sm text-primary hover:underline"
            >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{bookmark.url}</span>
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={() => void onSaveEdit(bookmark.id)}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onStartEdit(bookmark)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void onDelete(bookmark.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{children}</div>;
}
