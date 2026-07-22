import React, { useState, type KeyboardEvent } from 'react';
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
  const urlRef = React.useRef<HTMLInputElement>(null);
  const [filling, setFilling] = useState(false);

  const handleAdd = async () => {
    clearError();
    const ok = await onAdd(title, url);
    if (ok) {
      setTitle('');
      setUrl('');
    }
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
    <div className="view">
      <div className="toolbar">
        <span className="toolbar-title">🔓 Secure Bookmarks</span>
        <button className="btn btn-icon" onClick={onLock} title="Lock vault">
          Lock
        </button>
      </div>

      <div className="add-section">
        <div className="form-group">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && urlRef.current?.focus()}
            placeholder="Title"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <input
            ref={urlRef}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && handleAdd()}
            placeholder="https://example.com"
            autoComplete="off"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="add-actions">
          <button
            className="btn btn-secondary btn-fill-page"
            onClick={fillFromCurrentTab}
            disabled={filling}
            title="Pre-fill with the current tab's title and URL"
          >
            📋 Current Page
          </button>
          <button className="btn btn-primary btn-add-bookmark" onClick={handleAdd}>
            + Add Bookmark
          </button>
        </div>
      </div>

      <hr className="divider" />

      <div className="bookmark-list">
        {bookmarks.length === 0 ? (
          <p className="empty-msg">No bookmarks yet. Add one above!</p>
        ) : (
          bookmarks.map(bm => (
            <BookmarkItem key={bm.id} bookmark={bm} onDelete={onDelete} />
          ))
        )}
      </div>

      <div className="footer-actions">
        <button className="btn btn-secondary btn-sm" onClick={openOptionsPage}>
          Manage All
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={exportBookmarks}
          disabled={bookmarks.length === 0}
          title="Export bookmarks as JSON"
        >
          Export
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onChangePassword}>
          Change Password
        </button>
      </div>
    </div>
  );
}
