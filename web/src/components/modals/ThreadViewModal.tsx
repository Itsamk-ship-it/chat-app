'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, formatTime, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

export default function ThreadViewModal() {
  const { state, actions } = useApp();
  const { activeThread, threadReplies } = state;
  const [input, setInput] = useState('');

  if (!activeThread) return null;

  async function sendReply() {
    const text = input.trim();
    if (!text || !activeThread) return;
    await actions.replyToThread(activeThread.id, text);
    setInput('');
  }

  return (
    <ModalWrapper title="Thread" onClose={actions.closeModal} size="lg">
      <div className="space-y-4">
        <ThreadMessage
          name={activeThread.display_name || activeThread.username}
          content={activeThread.content}
          createdAt={activeThread.created_at}
        />

        <div className="text-xs font-semibold uppercase tracking-wide text-[#616061] dark:text-[#ababad]">
          {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {threadReplies.map((reply) => (
            <ThreadMessage
              key={reply.id}
              name={reply.display_name || reply.username}
              content={reply.content}
              createdAt={reply.created_at}
            />
          ))}
        </div>

        <div className="pt-2 border-t border-[#ddd] dark:border-[#565856]">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendReply();
                }
              }}
              placeholder="Reply in thread"
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#222529] border border-[#ddd] dark:border-[#565856] text-[#1D1C1D] dark:text-white outline-none focus:border-[#1264A3]"
            />
            <button
              onClick={sendReply}
              disabled={!input.trim()}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                input.trim()
                  ? 'bg-[#007A5A] text-white hover:bg-[#148567]'
                  : 'bg-[#ddd] dark:bg-[#3b3b3d] text-[#868686]'
              )}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

function ThreadMessage({ name, content, createdAt }: { name: string; content: string; createdAt: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg border border-[#ddd] dark:border-[#565856]">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
        style={{ background: avatarColor(name) }}
      >
        {initials(name)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-[#1D1C1D] dark:text-white">{name}</span>
          <span className="text-xs text-[#616061] dark:text-[#ababad]">{formatTime(createdAt)}</span>
        </div>
        <p className="text-sm text-[#1D1C1D] dark:text-[#d1d2d3]">{content}</p>
      </div>
    </div>
  );
}
