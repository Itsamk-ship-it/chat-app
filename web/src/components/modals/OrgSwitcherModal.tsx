'use client';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';
import type { Channel, Org } from '@/lib/types';

interface Props {
  onJoinChannel: (ch: Channel) => void;
}

export default function OrgSwitcherModal({ onJoinChannel }: Props) {
  const { state, actions } = useApp();
  const { orgs, org: currentOrg } = state;

  async function handleSelectOrg(org: Org) {
    actions.closeModal();
    const channels = await actions.selectOrg(org);
    actions.setScreen('app');
    if (channels.length > 0) {
      onJoinChannel(channels[0]);
    }
  }

  return (
    <ModalWrapper title="Switch Workspace" onClose={actions.closeModal} size="sm">
      <div className="space-y-2">
        {orgs.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSelectOrg(org)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
              currentOrg?.id === org.id
                ? 'bg-accent/15 border border-accent/30'
                : 'hover:bg-canvas-overlay border border-transparent'
            )}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center
                         font-bold text-sm text-white flex-shrink-0"
              style={{ background: avatarColor(org.name) }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="font-semibold text-fg truncate">{org.name}</div>
              <div className="text-xs text-fg-muted">
                {org.role === 'owner' ? 'Owner' : 'Member'}
              </div>
            </div>
            {currentOrg?.id === org.id && (
              <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            )}
          </button>
        ))}

        {orgs.length === 0 && (
          <p className="text-center text-fg-muted text-sm py-4">No workspaces yet</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 pt-4 border-t border-border space-y-2">
        <button
          onClick={() => { actions.closeModal(); actions.openModal('create-org'); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                     bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
        >
          <PlusIcon />
          Create New Workspace
        </button>
        <button
          onClick={() => { actions.closeModal(); actions.openModal('join-org'); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                     bg-canvas-overlay hover:bg-border text-fg-muted hover:text-fg
                     font-medium transition-colors"
        >
          <LinkIcon />
          Join with Invite Code
        </button>
      </div>
    </ModalWrapper>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}
