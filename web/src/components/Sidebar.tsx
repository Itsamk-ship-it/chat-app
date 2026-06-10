'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Channel } from '@/lib/types';
import { getDisplayName } from '@/lib/utils';

interface Props { onJoinChannel: (ch: Channel) => void; }

export default function Sidebar({ onJoinChannel }: Props) {
  const { state, actions } = useApp();
  const { channels, channel, org, user, unreadChannels, unreadDMs } = state;
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const publicChannels = channels.filter((c) => !c.is_private);
  const privateChannels = channels.filter((c) => c.is_private);
  const canManageSelectedChannel = !!channel && !!org && (org.role === 'owner' || channel.created_by === user?.id);

  async function handleRenameSelectedChannel() {
    if (!org || !channel || !canManageSelectedChannel) return;
    const nextName = window.prompt('Rename channel', channel.name);
    if (!nextName || !nextName.trim()) return;
    const nextDesc = window.prompt('Channel description', channel.description ?? '') ?? '';
    const isPrivate = window.confirm('Make this channel private?\n(OK = Private, Cancel = Public)');
    try {
      const updated = await actions.updateChannelById(
        org.id,
        channel.id,
        nextName.trim(),
        nextDesc.trim(),
        isPrivate
      );
      if (!updated) { alert('Failed to update channel'); return; }
    } catch {
      alert('Failed to update channel');
    }
  }

  async function handleDeleteSelectedChannel() {
    if (!org || !channel || !canManageSelectedChannel) return;
    const ok = window.confirm(`Delete channel "${channel.name}"?\nThis cannot be undone.`);
    if (!ok) return;
    try {
      const deleted = await actions.deleteChannelById(org.id, channel.id);
      if (!deleted) alert('Failed to delete channel');
    } catch {
      alert('Failed to delete channel');
    }
  }

  return (
    <aside className="h-full bg-[#2b2d31] p-2">
      <div className="h-10 px-2.5 flex items-center justify-between rounded-md bg-[#1e1f22] border border-[#232428]">
        <span className="text-sm font-semibold text-slate-100">Workspace</span>
        <button onClick={() => actions.openModal('org-switcher')} className={utilityBtn}>
          Switch
        </button>
      </div>

      <div className="pt-2 mt-2 space-y-1 rounded-md bg-[#1e1f22] border border-[#232428] p-1.5">
        <button onClick={() => actions.openModal('search')} className={utilityBtn}>Search</button>
        <button onClick={() => actions.openModal('invite')} className={utilityBtn}>Invite people</button>
        <button onClick={() => actions.openModal('threads')} className={utilityBtn}>Threads</button>
        <button onClick={() => actions.openModal('drafts')} className={utilityBtn}>Drafts</button>
        <button onClick={() => actions.openModal('pins')} className={utilityBtn}>Pins</button>
        <button onClick={() => actions.openModal('directories')} className={utilityBtn}>People Directory</button>
        <button onClick={() => actions.openModal('starred')} className={utilityBtn}>Starred</button>
      </div>

      <div className="mt-2 rounded-md bg-[#1e1f22] border border-[#232428] p-1.5">
        <div className="flex items-center justify-between px-2 py-1">
          <button onClick={() => setChannelsOpen(!channelsOpen)} className="text-left text-[11px] text-slate-400 uppercase tracking-wide">Text Channels</button>
          <div className="flex items-center gap-1">
            <button onClick={() => actions.openModal('create-channel')} className="px-1.5 py-0.5 rounded text-xs text-slate-300 hover:bg-[#35373c]" title="Create channel">+</button>
            <button
              onClick={handleRenameSelectedChannel}
              disabled={!canManageSelectedChannel}
              className="px-1.5 py-0.5 rounded text-xs text-slate-300 hover:bg-[#35373c] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Edit selected channel"
            >
              ✎
            </button>
            <button
              onClick={handleDeleteSelectedChannel}
              disabled={!canManageSelectedChannel}
              className="px-1.5 py-0.5 rounded text-xs text-rose-300 hover:bg-[#3f2a2d] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete selected channel"
            >
              🗑
            </button>
          </div>
        </div>
        {channelsOpen && (
          <div className="space-y-1">
            {publicChannels.map((ch) => (
              <ChannelRow key={ch.id} active={channel?.id === ch.id} unread={unreadChannels.includes(ch.id)} label={`# ${ch.name}`} onClick={() => onJoinChannel(ch)} />
            ))}
            {privateChannels.map((ch) => (
              <ChannelRow key={ch.id} active={channel?.id === ch.id} unread={unreadChannels.includes(ch.id)} label={`🔒 ${ch.name}`} onClick={() => onJoinChannel(ch)} />
            ))}
            <button onClick={() => actions.openModal('create-channel')} className={utilityBtn}>+ Add channel</button>
          </div>
        )}
      </div>

      <div className="mt-2 rounded-md bg-[#1e1f22] border border-[#232428] p-1.5">
        <button onClick={() => setDmsOpen(!dmsOpen)} className="w-full text-left text-[11px] text-slate-400 uppercase tracking-wide px-2 py-1">Direct Messages</button>
        {dmsOpen && (
          <div className="space-y-1">
            {state.dms.map((dm) => {
              const label = dm.other_participants.length > 0
                ? dm.other_participants.map(p => getDisplayName(p.display_name, p.username)).join(', ')
                : dm.participant_names;
              return (
                <ChannelRow
                  key={dm.id}
                  active={state.activeDM?.id === dm.id}
                  unread={unreadDMs.includes(dm.id)}
                  label={label}
                  onClick={() => actions.openDM(dm)}
                />
              );
            })}
            <button onClick={() => actions.openModal('new-dm')} className={utilityBtn}>+ New DM</button>
          </div>
        )}
      </div>
    </aside>
  );
}

function ChannelRow({ label, onClick, active, unread }: { label: string; onClick?: () => void; active?: boolean; unread?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm flex items-center justify-between gap-1 ${active ? 'bg-[#404249] text-white' : unread ? 'text-white hover:bg-[#35373c]' : 'text-slate-300 hover:bg-[#35373c]'}`}
    >
      <span className={unread && !active ? 'font-bold' : ''}>{label}</span>
      {unread && !active && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-red-500" />
      )}
    </button>
  );
}

const utilityBtn = 'w-full text-left px-2.5 py-1.5 rounded-md text-sm text-slate-300 hover:bg-[#35373c]';
