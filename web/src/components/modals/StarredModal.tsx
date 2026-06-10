'use client';
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatTime, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

export default function StarredModal() {
  const { state, actions } = useApp();
  const { starred, org } = state;

  useEffect(() => {
    if (org) actions.loadStarred(org.id);
  }, [org]);

  // Group starred items by type
  const starredChannels = starred.filter(s => s.item_type === 'channel');
  const starredMessages = starred.filter(s => s.item_type === 'message');

  return (
    <ModalWrapper title="Starred items" onClose={actions.closeModal} size="lg">
      <div className="space-y-6">
        {starred.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-[#f4f4f4] dark:bg-[#3b3b3d] flex items-center justify-center mx-auto mb-4">
              <StarIcon className="w-8 h-8 text-[#868686]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1D1C1D] dark:text-white mb-2">Nothing starred yet</h3>
            <p className="text-sm text-[#616061] dark:text-[#ababad] max-w-sm mx-auto">
              Star channels and messages that you want easy access to. They'll show up here.
            </p>
          </div>
        ) : (
          <>
            {/* Starred Channels */}
            {starredChannels.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#616061] dark:text-[#ababad] uppercase tracking-wider mb-2">
                  Channels
                </h4>
                <div className="space-y-1">
                  {starredChannels.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const channel = state.channels.find(c => c.id === item.item_id);
                        if (channel) {
                          actions.setChannel(channel);
                          actions.closeModal();
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors text-left"
                    >
                      <span className="text-lg">{item.is_private ? '🔒' : '#'}</span>
                      <span className="font-medium text-[#1D1C1D] dark:text-white">{item.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          actions.unstarItem(item.item_id, 'channel');
                        }}
                        className="ml-auto text-[#868686] hover:text-[#E01E5A]"
                      >
                        <StarIcon className="w-4 h-4 fill-current" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Starred Messages */}
            {starredMessages.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#616061] dark:text-[#ababad] uppercase tracking-wider mb-2">
                  Messages
                </h4>
                <div className="space-y-2">
                  {starredMessages.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-[#ddd] dark:border-[#565856] 
                                 hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-[#1D1C1D] dark:text-white">
                            {item.display_name || item.username}
                          </span>
                          {item.channel_name && (
                            <>
                              <span className="text-[#868686]">in</span>
                              <span className="text-[#616061] dark:text-[#ababad]">
                                #{item.channel_name}
                              </span>
                            </>
                          )}
                          <span className="text-[#868686] text-xs">
                            {item.created_at && formatTime(item.created_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => actions.unstarItem(item.item_id, 'message')}
                          className="text-[#868686] hover:text-[#E01E5A]"
                        >
                          <StarIcon className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (item.channel_id) {
                            const channel = state.channels.find(c => c.id === item.channel_id);
                            if (channel) actions.setChannel(channel);
                          }
                          actions.closeModal();
                        }}
                        className="w-full text-left"
                      >
                        <p className="text-[15px] text-[#1D1C1D] dark:text-white line-clamp-2">
                          {item.content}
                        </p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalWrapper>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
