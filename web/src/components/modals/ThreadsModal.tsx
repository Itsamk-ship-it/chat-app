'use client';
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, formatTime, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

export default function ThreadsModal() {
  const { state, actions } = useApp();
  const { threads, org } = state;

  useEffect(() => {
    if (org) actions.loadThreads(org.id);
  }, [org]);

  return (
    <ModalWrapper title="Threads" onClose={actions.closeModal} size="lg">
      <div className="space-y-2">
        <p className="text-sm text-[#616061] dark:text-[#ababad] -mt-2 mb-4">
          Threads you've participated in
        </p>

        {threads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-[#f4f4f4] dark:bg-[#3b3b3d] flex items-center justify-center mx-auto mb-4">
              <ThreadIcon className="w-8 h-8 text-[#868686]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1D1C1D] dark:text-white mb-2">No threads yet</h3>
            <p className="text-sm text-[#616061] dark:text-[#ababad] max-w-sm mx-auto">
              When you reply to a message, it creates a thread. Your threads will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => {
                    // Navigate to channel and open thread
                    const channel = state.channels.find(c => c.id === thread.channel_id);
                    if (channel) {
                      actions.setChannel(channel);
                      actions.setActiveThread({
                        id: thread.id,
                        content: thread.parent_content,
                        created_at: thread.parent_created_at,
                        username: thread.parent_author,
                        display_name: thread.parent_author,
                        user_id: 0,
                        channel_id: thread.channel_id,
                        reply_count: thread.reply_count,
                      });
                      actions.closeModal();
                    }
                  }}
                className="w-full p-4 rounded-lg border border-[#ddd] dark:border-[#565856] 
                           hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2 text-sm text-[#616061] dark:text-[#ababad]">
                  <span>#{thread.channel_name}</span>
                  <span>·</span>
                  <span>{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
                </div>
                <p className="text-[15px] text-[#1D1C1D] dark:text-white line-clamp-2 mb-2">
                  {thread.parent_content}
                </p>
                {thread.last_reply && (
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: avatarColor(thread.last_reply.display_name) }}
                    >
                      {initials(thread.last_reply.display_name)}
                    </div>
                    <span className="text-[#1D1C1D] dark:text-white font-medium">
                      {thread.last_reply.display_name}
                    </span>
                    <span className="text-[#616061] dark:text-[#ababad] truncate flex-1">
                      {thread.last_reply.content}
                    </span>
                    <span className="text-[#868686] text-xs">
                      {formatTime(thread.last_reply.created_at)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

function ThreadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
