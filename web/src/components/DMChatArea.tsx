'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, formatTime, cn, getDisplayName } from '@/lib/utils';
import type { DMMessage } from '@/lib/types';
import RichMessageInput from './RichMessageInput';

function sanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/<br\s*\/?>\s*(<\/(div|p|li|blockquote)>)/gi, '$1')
    .replace(/(<(div|p)>\s*<\/(div|p)>)+\s*$/gi, '')
    .trim();
}

export default function DMChatArea() {
  const { state, actions } = useApp();
  const { activeDM, dmMessages, user } = state;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  if (!activeDM) return null;

  const otherUser = activeDM.other_participants[0];
  const displayName = otherUser ? getDisplayName(otherUser.display_name, otherUser.username) : 'Unknown';

  const handleSend = async (content: string) => {
    if (!content.trim() || !activeDM) return;
    await actions.sendDMMessage(activeDM.id, content.trim());
  };

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      <header className="h-[52px] flex items-center justify-between px-4 border-b border-[#232428] bg-[#313338]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: avatarColor(displayName) }}
            >
              {initials(displayName)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#313338] rounded-full" />
          </div>
          <div>
            <h2 className="font-bold text-[15px] text-slate-100">
              {displayName}
            </h2>
            <span className="text-xs text-slate-400">Active</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => actions.openDM(null)}
            className="p-2 rounded-md hover:bg-[#404249] transition-colors"
            title="Close"
          >
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#313338]">
        <div className="text-center py-8 mb-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3"
            style={{ background: avatarColor(displayName) }}
          >
            {initials(displayName)}
          </div>
            <h3 className="text-xl font-bold text-slate-100 mb-1">
              {displayName}
            </h3>
            <p className="text-sm text-slate-400">
              This is the start of your conversation with {displayName}
            </p>
          </div>

        {/* Messages */}
        {dmMessages.map((msg, i) => {
          const showAvatar = i === 0 || dmMessages[i - 1]?.user_id !== msg.user_id;
          return (
            <DMMessageRow
              key={msg.id}
              msg={msg}
              showAvatar={showAvatar}
              isMe={msg.user_id === user?.id}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-[#232428] bg-[#313338]">
        <RichMessageInput
          placeholder={`Message ${displayName}`}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}

function DMMessageRow({ msg, showAvatar, isMe }: { msg: DMMessage; showAvatar: boolean; isMe: boolean }) {
  const { actions } = useApp();
  const msgUser = getDisplayName(msg.display_name, msg.username);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);

  useEffect(() => {
    setDraft(msg.content);
  }, [msg.content]);

  async function saveEdit() {
    const next = draft.trim();
    if (!next || next === msg.content) {
      setEditing(false);
      return;
    }
    await actions.editDMMessage(msg.id, next);
    setEditing(false);
  }

  async function removeMessage() {
    const ok = window.confirm('Delete this message?');
    if (!ok) return;
    await actions.deleteDMMessage(msg.id);
    setMenuOpen(false);
  }

  async function pinMessage() {
    await actions.starItem('dm', msg.id);
    setMenuOpen(false);
  }

  return (
    <div
      className={cn(
        'group relative flex gap-2 hover:bg-[#2e3035] -mx-4 px-4 py-0.5 rounded transition-colors',
        showAvatar && 'mt-4 pt-2'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      {showAvatar ? (
        <div
          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs text-white mt-1"
          style={{ background: avatarColor(msgUser) }}
        >
          {initials(msgUser)}
        </div>
      ) : (
        <div className="w-9 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-bold text-[15px] text-slate-100">
              {msgUser}
            </span>
            <span className="text-xs text-slate-400">
              {formatTime(msg.created_at)}
            </span>
          </div>
        )}
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded bg-[#383a40] border border-[#4e5058] px-3 py-2 text-sm text-slate-100 outline-none"
              rows={3}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                className="px-2 py-1 rounded bg-[#5865f2] text-white text-xs hover:bg-[#4752c4]"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setDraft(msg.content); }}
                className="px-2 py-1 rounded bg-[#4e5058] text-slate-100 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="text-[15px] text-slate-200 leading-normal break-words message-content"
              dangerouslySetInnerHTML={{ __html: sanitize(msg.content) }}
            />
            {msg.edited_at && (
              <span className="text-[11px] text-slate-400">(edited)</span>
            )}
          </>
        )}
      </div>

      <div className="relative w-24 flex-shrink-0 flex justify-end">
        <div className={cn('flex items-center gap-1 transition-opacity', hovered || menuOpen ? 'opacity-100' : 'opacity-0')}>
          <button
            onClick={pinMessage}
            className="h-7 w-7 rounded bg-[#1f2229] border border-[#3a3d45] hover:bg-[#2b2d31] text-slate-200 flex items-center justify-center"
            title="Pin message"
          >
            <PinGlyph />
          </button>
          {isMe && (
            <button
              onClick={() => { setEditing(true); setMenuOpen(false); }}
              className="h-7 w-7 rounded bg-[#1f2229] border border-[#3a3d45] hover:bg-[#2b2d31] text-slate-200 flex items-center justify-center"
              title="Edit message"
            >
              <EditGlyph />
            </button>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-7 w-7 rounded bg-[#1f2229] border border-[#3a3d45] hover:bg-slate-800 text-slate-200 flex items-center justify-center"
            title="More actions"
          >
            <MoreHIcon className="w-4 h-4" />
          </button>
        </div>
        {menuOpen && (
          <div className="absolute right-0 top-7 w-40 rounded border border-[#232428] bg-[#1e1f22] shadow-lg z-20">
            <button
              onClick={pinMessage}
              className="w-full text-left px-3 py-2 text-xs text-slate-100 hover:bg-[#2b2d31]"
            >
              Pin message
            </button>
            {isMe && (
              <button
                onClick={() => { setEditing(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-100 hover:bg-[#2b2d31]"
              >
                Edit message
              </button>
            )}
            {isMe && (
              <button
                onClick={removeMessage}
                className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-[#2b2d31]"
              >
                Delete message
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 9V4l3-2H7l3 2v5l-4 4v2h5v7l2-1v-6h5v-2l-4-4z" />
    </svg>
  );
}

function EditGlyph() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MoreHIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
