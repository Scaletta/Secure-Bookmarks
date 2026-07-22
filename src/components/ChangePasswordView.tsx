import React, { useState, type KeyboardEvent } from 'react';

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
  const newRef     = React.useRef<HTMLInputElement>(null);
  const confirmRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    clearError();
    onSave(oldPw, newPw, confirmPw);
  };

  return (
    <div className="view">
      <div className="view-header">
        <h1>Change Password</h1>
      </div>

      <div className="form-group">
        <label>Current Password</label>
        <input
          type="password"
          value={oldPw}
          onChange={e => setOldPw(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && newRef.current?.focus()}
          placeholder="Current password"
          autoComplete="current-password"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>New Password</label>
        <input
          ref={newRef}
          type="password"
          value={newPw}
          onChange={e => setNewPw(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && confirmRef.current?.focus()}
          placeholder="New password"
          autoComplete="new-password"
        />
      </div>

      <div className="form-group">
        <label>Confirm New Password</label>
        <input
          ref={confirmRef}
          type="password"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && handleSave()}
          placeholder="Confirm new password"
          autoComplete="new-password"
        />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="button-row">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary"   onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
