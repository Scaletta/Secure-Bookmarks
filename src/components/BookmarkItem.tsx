import React from 'react';
import type { Bookmark } from '../types';

interface Props {
  bookmark: Bookmark;
  onDelete: (id: string) => Promise<void>;
}

export default function BookmarkItem({ bookmark, onDelete }: Props) {
  return (
    <div className="bookmark-item">
      <a
        className="bookmark-link"
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="bookmark-title">{bookmark.title}</span>
        <span className="bookmark-url">{bookmark.url}</span>
      </a>
      <button
        className="btn btn-danger btn-sm btn-delete"
        title="Delete bookmark"
        onClick={() => onDelete(bookmark.id)}
      >
        ✕
      </button>
    </div>
  );
}
