'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';
import type { ChannelMember } from '@/lib/types';

export default function ChannelMembersModal() {
  const { state, actions } = useApp();
  const { org, channel, user } = state;

  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = org?.role === 'owner';
  const isChannelCreator = channel?.created_by === user?.id;
  const canManage = isOwner || isChannelCreator;

  useEffect(() => {
    if (!org || !channel) return;
    const currentOrg = org;
    const currentChannel = channel;

    async function load() {
      try {
        const data = await actions.loadChannelMembers(currentOrg.id, currentChannel.id);
        if (data) {
          setIsPrivate(data.is_private);
          setMembers(data.members);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [org, channel, actions]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addUsername.trim() || !org || !channel) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const ok = await actions.addChannelMember(org.id, channel.id, addUsername.trim());
      if (!ok) {
        setError('Failed to add member');
        setAdding(false);
        return;
      }

      setSuccess('Member added');
      setAddUsername('');

      // Reload members
      const membersData = await actions.loadChannelMembers(org.id, channel.id);
      if (membersData) {
        setMembers(membersData.members);
        setIsPrivate(membersData.is_private);
      }
    } catch {
      setError('Network error');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!org || !channel) return;

    try {
      const ok = await actions.removeChannelMember(org.id, channel.id, userId);
      if (ok) {
        setMembers(members.filter((m) => m.id !== userId));
      }
    } catch {}
  }

  if (!channel) return null;

  return (
    <ModalWrapper
      title={`${channel.is_private ? '🔒 ' : '# '}${channel.name}`}
      onClose={actions.closeModal}
      size="md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#4A154B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add member form (only for private channels) */}
          {isPrivate && canManage && (
            <form onSubmit={handleAddMember} className="space-y-3">
              <label className="block text-sm font-medium text-[#1D1C1D] dark:text-white">Add Member</label>
              <div className="flex gap-2">
                <input
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Enter username"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-[#222529]
                             border border-[#ddd] dark:border-[#565856]
                             text-[#1D1C1D] dark:text-white placeholder-[#868686] text-sm
                             focus:border-[#4A154B] focus:ring-2 focus:ring-[#4A154B]/20
                             outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!addUsername.trim() || adding}
                  className="px-4 py-2.5 rounded-lg bg-[#007A5A] hover:bg-[#148567] text-white
                             text-sm font-medium transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? '...' : 'Add'}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-600">{success}</p>
              )}
            </form>
          )}

          {/* Info banner for public channels */}
          {!isPrivate && (
            <div className="px-4 py-3 rounded-lg bg-[#f8f8f8] dark:bg-[#232529] border border-[#ddd] dark:border-[#565856]">
              <p className="text-sm text-[#616061] dark:text-[#ababad]">
                <span className="font-medium text-[#1D1C1D] dark:text-white">Public channel</span> — All workspace members
                can access this channel.
              </p>
            </div>
          )}

          {/* Members list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#1D1C1D] dark:text-white">
                {isPrivate ? 'Channel Members' : 'Workspace Members'}
              </span>
              <span className="text-xs text-[#868686]">{members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {members.map((member) => {
                const displayName = member.display_name || member.username;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center
                                 font-bold text-xs text-white flex-shrink-0"
                      style={{ background: avatarColor(displayName) }}
                    >
                      {initials(displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#1D1C1D] dark:text-white block truncate">{displayName}</span>
                      {member.display_name && member.display_name !== member.username && (
                        <span className="text-xs text-[#868686]">@{member.username}</span>
                      )}
                    </div>

                    {/* Remove button (only for private channels, can't remove self if you're the only admin) */}
                    {isPrivate && canManage && member.id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md
                                   text-[#868686] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                                   transition-all"
                        title="Remove from channel"
                      >
                        <XIcon />
                      </button>
                    )}

                    {member.id === user?.id && (
                      <span className="text-[10px] text-[#868686] bg-[#f4f4f4] dark:bg-[#3b3b3d] px-2 py-0.5 rounded">
                        you
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave channel (for private channels) */}
          {isPrivate && !isChannelCreator && (
            <button
              onClick={() => {
                if (user) handleRemoveMember(user.id);
                actions.closeModal();
                actions.setChannel(null);
              }}
              className="w-full py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500
                         hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
            >
              Leave Channel
            </button>
          )}
        </div>
      )}
    </ModalWrapper>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
