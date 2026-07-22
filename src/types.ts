export interface Bookmark {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface VaultData {
  bookmarks: Bookmark[];
}

export type AppView = 'loading' | 'setup' | 'locked' | 'unlocked' | 'changePassword';
