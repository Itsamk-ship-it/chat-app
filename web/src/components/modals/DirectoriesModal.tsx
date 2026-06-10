'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

interface OrgUser {
  id: number;
  username: string;
  display_name?: string;
  role: string;
}

export default function DirectoriesModal() {
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
      setUsers(members as OrgUser[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [state.org, actions]);

  const filteredUsers = users.filter(u => 
    (u.display_name || u.username).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModalWrapper title="People" onClose={actions.closeModal} size="lg">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#868686]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#222529]
                       border border-[#ddd] dark:border-[#565856]
                       text-[#1D1C1D] dark:text-white placeholder-[#868686]
                       focus:border-[#1264A3] focus:ring-2 focus:ring-[#1264A3]/20
                       outline-none transition-all text-[15px]"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-[#616061] dark:text-[#ababad] py-2 border-b border-[#ddd] dark:border-[#565856]">
          <span>{users.length} {users.length === 1 ? 'member' : 'members'}</span>
        </div>

        {/* User List */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#1264A3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-[#616061] dark:text-[#ababad]">
              No members found
            </div>
          ) : (
            <div className="divide-y divide-[#ddd] dark:divide-[#565856]">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 py-4 hover:bg-[#f8f8f8] dark:hover:bg-[#232529] -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                      style={{ background: avatarColor(user.display_name || user.username) }}
                    >
                      {initials(user.display_name || user.username)}
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#007A5A] border-2 border-white dark:border-[#1a1d21] rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] text-[#1D1C1D] dark:text-white">
                        {user.display_name || user.username}
                      </span>
                      {user.id === state.user?.id && (
                        <span className="text-xs text-[#868686]">(you)</span>
                      )}
                      {user.role === 'owner' && (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-[#1264A3] bg-[#1264A3]/10 px-1.5 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-[#E01E5A] bg-[#E01E5A]/10 px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[#616061] dark:text-[#ababad]">
                      @{user.username}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (user.id !== state.user?.id && state.org) {
                          actions.startDM(state.org.id, [user.id]);
                          actions.closeModal();
                        }
                      }}
                      disabled={user.id === state.user?.id}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        user.id === state.user?.id
                          ? "text-[#ccc] dark:text-[#565856] cursor-not-allowed"
                          : "text-[#868686] hover:bg-[#1264A3]/10 hover:text-[#1264A3]"
                      )}
                    >
                      <MessageIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
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

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
