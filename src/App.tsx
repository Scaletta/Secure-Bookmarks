import React from 'react';
import { useVault } from './hooks/useVault';
import SetupView from './components/SetupView';
import LockedView from './components/LockedView';
import UnlockedView from './components/UnlockedView';
import ChangePasswordView from './components/ChangePasswordView';
import LoadingOverlay from './components/LoadingOverlay';

export default function App() {
  const vault = useVault();

  return (
    <div className="app">
      {vault.view === 'setup' && (
        <SetupView
          onSetup={vault.setupVault}
          error={vault.error}
          clearError={vault.clearError}
        />
      )}

      {vault.view === 'locked' && (
        <LockedView
          onUnlock={vault.unlock}
          error={vault.error}
          clearError={vault.clearError}
        />
      )}

      {vault.view === 'unlocked' && (
        <UnlockedView
          bookmarks={vault.bookmarks}
          onAdd={vault.addBookmark}
          onDelete={vault.deleteBookmark}
          onLock={vault.lock}
          onChangePassword={() => vault.navigateTo('changePassword')}
          error={vault.error}
          clearError={vault.clearError}
        />
      )}

      {vault.view === 'changePassword' && (
        <ChangePasswordView
          onSave={vault.changePassword}
          onCancel={() => vault.navigateTo('unlocked')}
          error={vault.error}
          clearError={vault.clearError}
        />
      )}

      {(vault.isLoading || vault.view === 'loading') && <LoadingOverlay />}
    </div>
  );
}
