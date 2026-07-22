import React, { useState, type KeyboardEvent } from 'react';

interface Props {
  onUnlock: (pw: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export default function LockedView({ onUnlock, error, clearError }: Props) {
  const [pw, setPw] = useState('');

  const handleSubmit = () => {
    clearError();
    onUnlock(pw);
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="shield-icon">🔒</span>
        <h1>Secure Bookmarks</h1>
        <p className="subtitle">Enter your master password to unlock.</p>
      </div>

      <div className="form-group">
        <label>Master Password</label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter your password"
          autoComplete="current-password"
          autoFocus
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button className="btn btn-primary btn-full" onClick={handleSubmit}>
        Unlock
      </button>
    </div>
  );
}
