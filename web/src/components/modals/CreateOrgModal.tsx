'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import ModalWrapper from './ModalWrapper';
import type { Channel, Org } from '@/lib/types';

interface Props {
  onJoinChannel: (ch: Channel) => void;
}

export default function CreateOrgModal({ onJoinChannel }: Props) {
  const { actions } = useApp();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const org = await actions.createOrg(name.trim());
      if (!org) {
        setError('Failed to create workspace');
        setLoading(false);
        return;
      }
      const nextOrg: Org = { ...org, role: 'owner' };
      actions.closeModal();

      // Select the new org and join first channel
      const channels = await actions.selectOrg(nextOrg);
      actions.setScreen('app');
      if (channels.length > 0) {
        onJoinChannel(channels[0]);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalWrapper title="Create Workspace" onClose={actions.closeModal} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-fg mb-2">
            Workspace Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-canvas-overlay border border-border
                       text-fg placeholder-fg-muted
                       focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                       outline-none transition-all"
          />
          <p className="mt-2 text-xs text-fg-muted">
            This is the name of your company, team, or organization.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white
                     font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Workspace'}
        </button>
      </form>
    </ModalWrapper>
  );
}
