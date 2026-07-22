import React, { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onSave: (oldPw: string, newPw: string, confirmPw: string) => Promise<boolean>;
  onCancel: () => void;
  error: string | null;
  clearError: () => void;
}

export default function ChangePasswordView({ onSave, onCancel, error, clearError }: Props) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    clearError();
    void onSave(oldPw, newPw, confirmPw);
  };

  return (
    <div className="p-2">
      <Card className="w-full max-w-sm border-border/70 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Change Password</CardTitle>
          <CardDescription>Re-encrypt your vault with a new master password.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={oldPw}
              onChange={e => setOldPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newRef.current?.focus()}
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
              onChange={e => setNewPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRef.current?.focus()}
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
              onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
