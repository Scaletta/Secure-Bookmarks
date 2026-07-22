import React, { useRef, useState } from 'react';
import { ChevronDown, Download, ExternalLink, LayoutGrid, Link2, Lock, Plus, Settings2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Bookmark } from '../types';
import BookmarkItem from './BookmarkItem';

interface Props {
  bookmarks: Bookmark[];
  onAdd: (title: string, url: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onLock: () => Promise<void>;
  onChangePassword: () => void;
  error: string | null;
  clearError: () => void;
}

export default function UnlockedView({
  bookmarks,
  onAdd,
  onDelete,
  onLock,
  onChangePassword,
  error,
  clearError,
}: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);
  const [filling, setFilling] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = async () => {
    clearError();
    const ok = await onAdd(title, url);
    if (ok) {
      setTitle('');
      setUrl('');
      setShowAddForm(false);
    }
  };

  const openAddForm = () => {
    setShowAddForm(true);
    queueMicrotask(() => urlRef.current?.focus());
  };

  const addCurrentPage = async () => {
    await fillFromCurrentTab();
    openAddForm();
  };

  const fillFromCurrentTab = async () => {
    setFilling(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) setUrl(tab.url);
      if (tab?.title) setTitle(tab.title);
    } finally {
      setFilling(false);
    }
  };

  const exportBookmarks = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      count: bookmarks.length,
      bookmarks,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const objectUrl = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `secure-bookmarks-export-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="p-2">
      <div className="flex flex-col gap-2">
        <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2 p-4 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Secure Bookmarks</CardTitle>
                  <CardDescription className="text-xs">{bookmarks.length} saved bookmark{bookmarks.length === 1 ? '' : 's'}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openOptionsPage} title="Open options">
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onLock} title="Lock vault">
                  <Lock className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <div>
              <Button className="w-full" variant="outline" onClick={addCurrentPage} disabled={filling}>
                <Plus className="mr-2 h-4 w-4" />
                Add bookmark for current page
              </Button>
            </div>

            {showAddForm && (
              <Card className="border-border/70 bg-secondary/20">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Add bookmark</p>
                      <p className="text-xs text-muted-foreground">Fill this in when you want to save a new site.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} title="Close form">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookmark-title">Title</Label>
                    <Input
                      id="bookmark-title"
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && urlRef.current?.focus()}
                      placeholder="Title"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookmark-url">URL</Label>
                    <Input
                      id="bookmark-url"
                      ref={urlRef}
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder="https://example.com"
                      autoComplete="off"
                    />
                  </div>

                  {error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handleAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <ScrollArea className="max-h-80 pr-1">
              <div className="space-y-2">
                {bookmarks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    No bookmarks yet. Tap Add bookmark to create your first one.
                  </div>
                ) : (
                  bookmarks.map(bm => <BookmarkItem key={bm.id} bookmark={bm} onDelete={onDelete} />)
                )}
              </div>
            </ScrollArea>

            {/*             <Separator />

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={openOptionsPage}>
                <Settings2 className="mr-2 h-4 w-4" />
                Manage
              </Button>
              <Button variant="outline" onClick={exportBookmarks} disabled={bookmarks.length === 0} title="Export bookmarks as JSON">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" onClick={onChangePassword}>
                Change
              </Button>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
