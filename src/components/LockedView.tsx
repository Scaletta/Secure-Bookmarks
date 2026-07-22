import React, { useState } from 'react';
import { LockKeyhole } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onUnlock: (pw: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export default function LockedView({ onUnlock, error, clearError }: Props) {
  const [pw, setPw] = useState('');

  const handleSubmit = () => {
    clearError();
    void onUnlock(pw);
  };

  return (
    <div className="p-2">
      <Card className="w-full max-w-sm border-border/70 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-3 pb-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Secure Bookmarks</CardTitle>
            <CardDescription>Enter your master password to unlock.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-password">Master Password</Label>
            <Input
              id="unlock-password"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter your password"
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit}>
            Unlock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
