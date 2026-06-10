'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

interface OrgUser {
  id: number;
  username: string;
  display_name?: string;
}

export default function NewDMModal() {
  const { state, actions } = useApp();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.org) return;
    let mounted = true;
    (async () => {
      const members = await actions.loadMembers(state.org!.id);
      if (!mounted) return;
      setUsers(members.filter((u: OrgUser) => u.id !== state.user?.id));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [state.org, state.user, actions]);

  const filteredUsers = users.filter(u => 
    (u.display_name || u.username).toLowerCase().includes(search.toLowerCase())
  );

  const handleStartDM = async (userId: number) => {
    if (!state.org) return;
    await actions.startDM(state.org.id, [userId]);
    actions.closeModal();
  };

  return (
    <ModalWrapper title="New direct message" onClose={actions.closeModal} size="md">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#868686]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a member..."
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#222529]
                       border border-[#ddd] dark:border-[#565856]
                       text-[#1D1C1D] dark:text-white placeholder-[#868686]
                       focus:border-[#1264A3] focus:ring-2 focus:ring-[#1264A3]/20
                       outline-none transition-all text-[15px]"
          />
        </div>

        {/* User List */}
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#1264A3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-[#616061] dark:text-[#ababad]">
              {search ? 'No members found' : 'No other members in this workspace'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleStartDM(user.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors text-left"
                >
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                      style={{ background: avatarColor(user.display_name || user.username) }}
                    >
                      {initials(user.display_name || user.username)}
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#007A5A] border-2 border-white dark:border-[#1a1d21] rounded-full" />
                  </div>
                  <div>
                    <div className="font-medium text-[15px] text-[#1D1C1D] dark:text-white">
                      {user.display_name || user.username}
                    </div>
                    <div className="text-sm text-[#616061] dark:text-[#ababad]">
                      @{user.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
