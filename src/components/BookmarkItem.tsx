import React from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Bookmark } from '../types';

interface Props {
  bookmark: Bookmark;
  onDelete: (id: string) => Promise<void>;
}

export default function BookmarkItem({ bookmark, onDelete }: Props) {
  return (
    <Card className="group flex items-center gap-4 border-border/70 bg-card/80 px-4 py-3 transition-shadow hover:shadow-lg">
      <a
        className="min-w-0 flex-1 space-y-1 text-left no-underline"
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">{bookmark.title}</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="truncate text-xs text-muted-foreground">{bookmark.url}</p>
      </a>
{/*       <Button
        variant="ghost"
        size="icon"
        title="Delete bookmark"
        onClick={() => onDelete(bookmark.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button> */}
    </Card>
  );
}
