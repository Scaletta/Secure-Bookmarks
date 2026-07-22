import React, { useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onSetup: (pw: string, confirmPw: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export default function SetupView({ onSetup, error, clearError }: Props) {
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    clearError();
    void onSetup(pw, confirmPw);
  };

  return (
    <div className="p-2">
      <Card className="w-full max-w-sm border-border/70 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-3 pb-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Secure Bookmarks</CardTitle>
            <CardDescription>Create a master password to protect your bookmarks.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-password">Master Password</Label>
            <Input
              id="setup-password"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRef.current?.focus()}
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
              onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit}>
            Create Vault
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
