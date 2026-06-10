'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, formatTime, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

export default function SearchModal() {
  const { state, actions } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'channels' | 'people'>('messages');

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (!state.org) return;
      setLoading(true);
      try {
        const data =
          activeTab === 'messages'
            ? await actions.searchMessages(state.org.id, query)
            : activeTab === 'channels'
              ? await actions.searchChannels(state.org.id, query)
              : await actions.searchUsers(state.org.id, query);
        setResults(data);
      } catch {}
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, state.org, activeTab, actions]);

  return (
    <ModalWrapper title="Search" onClose={actions.closeModal} size="lg">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#868686]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, files, and more..."
            autoFocus
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white dark:bg-[#222529]
                       border border-[#ddd] dark:border-[#565856]
                       text-[#1D1C1D] dark:text-white placeholder-[#868686]
                       focus:border-[#1264A3] focus:ring-2 focus:ring-[#1264A3]/20
                       outline-none transition-all text-[15px]"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#ddd] dark:border-[#565856]">
          {(['messages', 'channels', 'people'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'text-[#1264A3] border-[#1264A3]'
                  : 'text-[#616061] border-transparent hover:text-[#1D1C1D] dark:hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#1264A3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-[#616061] dark:text-[#ababad]">
              {query.length < 2 ? 'Enter at least 2 characters to search' : 'No results found'}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result) => (
                <button
                  key={`${activeTab}-${result.id}`}
                  onClick={() => {
                    if (activeTab === 'messages') {
                      const channel = state.channels.find(c => c.id === result.channel_id);
                      if (channel) {
                        actions.setChannel(channel);
                        actions.closeModal();
                      }
                    } else if (activeTab === 'channels') {
                      const channel = state.channels.find(c => c.id === result.id);
                      if (channel) {
                        actions.setChannel(channel);
                        actions.closeModal();
                      }
                    } else if (state.org && result.id !== state.user?.id) {
                      actions.startDM(state.org.id, [result.id]);
                      actions.closeModal();
                    }
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors text-left"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs text-white"
                    style={{ background: avatarColor(result.display_name || result.username || result.name) }}
                  >
                    {initials(result.display_name || result.username || result.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {activeTab === 'messages' && (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-[15px] text-[#1D1C1D] dark:text-white">
                            {result.display_name || result.username}
                          </span>
                          <span className="text-xs text-[#616061] dark:text-[#ababad]">
                            in #{result.channel_name}
                          </span>
                          <span className="text-xs text-[#868686]">
                            {formatTime(result.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-[#616061] dark:text-[#ababad] line-clamp-2">
                          {result.content}
                        </p>
                      </>
                    )}

                    {activeTab === 'channels' && (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-[15px] text-[#1D1C1D] dark:text-white">
                            {result.is_private ? '🔒' : '#'}{result.name}
                          </span>
                          <span className="text-xs text-[#616061] dark:text-[#ababad]">
                            {result.member_count} members
                          </span>
                        </div>
                        <p className="text-sm text-[#616061] dark:text-[#ababad] line-clamp-2">
                          {result.description || 'No description'}
                        </p>
                      </>
                    )}

                    {activeTab === 'people' && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[15px] text-[#1D1C1D] dark:text-white">
                          {result.display_name || result.username}
                        </span>
                        <span className="text-xs text-[#616061] dark:text-[#ababad]">
                          @{result.username}
                        </span>
                      </div>
                    )}
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
