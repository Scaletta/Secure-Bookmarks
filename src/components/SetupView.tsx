import React, { useState, type KeyboardEvent } from 'react';

interface Props {
  onSetup: (pw: string, confirmPw: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export default function SetupView({ onSetup, error, clearError }: Props) {
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const confirmRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    clearError();
    onSetup(pw, confirmPw);
  };

  return (
    <div className="view">
      <div className="view-header">
        <span className="shield-icon">🔐</span>
        <h1>Secure Bookmarks</h1>
        <p className="subtitle">Create a master password to protect your bookmarks.</p>
      </div>

      <div className="form-group">
        <label>Master Password</label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && confirmRef.current?.focus()}
          placeholder="Choose a strong password"
          autoComplete="new-password"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>Confirm Password</label>
        <input
          ref={confirmRef}
          type="password"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && handleSubmit()}
          placeholder="Repeat your password"
          autoComplete="new-password"
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button className="btn btn-primary btn-full" onClick={handleSubmit}>
        Create Vault
      </button>
    </div>
  );
}
