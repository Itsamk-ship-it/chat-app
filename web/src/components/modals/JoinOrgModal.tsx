'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import ModalWrapper from './ModalWrapper';
import type { Channel } from '@/lib/types';

interface Props {
  onJoinChannel: (ch: Channel) => void;
}

export default function JoinOrgModal({ onJoinChannel }: Props) {
  const { actions, state } = useApp();
  const [code, setCode] = useState(state.pendingJoinCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const joined = await actions.joinByCode(code.trim());
      if (!joined.ok || !joined.org_id) {
        setError('Invalid or expired invite code');
        setLoading(false);
        return;
      }

      // Reload orgs and select the new one
      const orgs = await actions.loadOrgs();
      const newOrg = orgs.find((o) => o.id === joined.org_id);

      if (newOrg) {
        actions.closeModal();
        actions.setPendingCode(null);
        const channels = await actions.selectOrg(newOrg);
        actions.setScreen('app');
        if (channels.length > 0) {
          onJoinChannel(channels[0]);
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalWrapper title="Join Workspace" onClose={actions.closeModal} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-fg mb-2">
            Invite Code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your invite code here"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-canvas-overlay border border-border
                       text-fg placeholder-fg-muted font-mono text-sm
                       focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                       outline-none transition-all"
          />
          <p className="mt-2 text-xs text-fg-muted">
            Ask your team admin for an invite code to join their workspace.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : 'Join Workspace'}
        </button>
      </form>
    </ModalWrapper>
  );
}
