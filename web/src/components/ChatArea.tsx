'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { avatarColor, initials, formatTime, formatDate, isSameDay, cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import RichMessageInput from './RichMessageInput';

function sanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    // Strip browser-injected trailing <br> inside block elements
    .replace(/<br\s*\/?>\s*(<\/(div|p|li|blockquote)>)/gi, '$1')
    // Strip trailing empty block elements the browser appends
    .replace(/(<(div|p)>\s*<\/(div|p)>)+\s*$/gi, '')
    .trim();
}

interface Props {
  onSend:        (content: string) => void;
  onTypingStart: () => void;
  onTypingStop:  () => void;
}

export default function ChatArea({ onSend, onTypingStart, onTypingStop }: Props) {
  const { state, actions } = useApp();
  const { channel, user, org, messagesByChannel, typingByChannel, members } = state;

  const messages   = channel ? (messagesByChannel[channel.id] ?? []) : [];
  const typingUsers = channel ? (typingByChannel[channel.id] ?? []).filter(u => u !== user?.username) : [];

  const msgsEndRef = useRef<HTMLDivElement>(null);

  const isOwner      = org?.role === 'owner';
  const canManageMembers = isOwner || channel?.created_by === user?.id;
  const memberCount = members.length;

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function typingText() {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing`;
    return 'Several people are typing';
  }

  if (!channel) return null;

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      <header className="border-b border-[#232428] flex-shrink-0 bg-[#313338]">
        <div className="h-14 flex items-center gap-3 px-5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {channel.is_private ? (
              <LockIcon className="w-[18px] h-[18px] text-slate-300" />
            ) : (
              <HashIcon className="w-[18px] h-[18px] text-slate-300" />
            )}
            <span className="font-semibold text-slate-100 text-[16px]">#{channel.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => actions.openModal('channel-members')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-300 hover:bg-[#404249]
                         transition-colors"
            >
              <UsersIcon className="w-4 h-4" />
              <span>{memberCount}</span>
            </button>
            <button className="p-1.5 rounded-md text-slate-300 hover:bg-[#404249] transition-colors">
              <MoreHIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <ChannelEmpty channel={channel} />
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prev = messages[idx - 1];
              const isNewGroup = !prev || prev.user_id !== msg.user_id ||
                (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60 * 1000;
              const isNewDay = !prev || !isSameDay(prev.created_at, msg.created_at);

              return (
                <div key={msg.id}>
                  {isNewDay && <DateDivider date={msg.created_at} />}
                  <MessageRow msg={msg} isNewGroup={isNewGroup} isMe={msg.user_id === user?.id} />
                </div>
              );
            })}
          </>
        )}
        <div ref={msgsEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="px-6 h-6 flex items-center">
        {typingUsers.length > 0 && (
          <p className="text-xs text-slate-400 italic flex items-center gap-1.5 animate-fade-in">
            <TypingDots />
            <span>{typingText()}</span>
          </p>
        )}
      </div>

      <div className="px-4 pb-4 flex-shrink-0">
        <RichMessageInput
          placeholder={`Message #${channel.name}`}
          onSend={onSend}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      </div>
    </div>
  );
}

function MessageRow({ msg, isNewGroup, isMe }: { msg: Message; isNewGroup: boolean; isMe: boolean }) {
  const { actions } = useApp();
  const displayName = msg.display_name || msg.username;
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
    await actions.editMessage(msg.id, next);
    setEditing(false);
  }

  async function removeMessage() {
    const ok = window.confirm('Delete this message?');
    if (!ok) return;
    await actions.deleteMessage(msg.id);
    setMenuOpen(false);
  }

  async function pinMessage() {
    await actions.starItem('message', msg.id);
    setMenuOpen(false);
  }
  
  return (
    <div className={cn(
      'relative flex gap-3 px-3 py-[1px] -mx-3 rounded hover:bg-[#2e3035] transition-colors',
      isNewGroup ? 'mt-2 pt-1' : 'mt-0'
    )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      {isNewGroup ? (
        <div
          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center
                     font-bold text-xs text-white"
          style={{ background: avatarColor(displayName) }}
        >
          {initials(displayName)}
        </div>
      ) : (
        <div className="w-9 flex-shrink-0 flex items-center justify-center">
           <span className={cn(
             'text-[11px] text-slate-500 transition-opacity',
             hovered ? 'opacity-100' : 'opacity-0'
           )}>
             {formatTime(msg.created_at)}
           </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {isNewGroup && (
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-[15px] text-slate-100 hover:underline cursor-pointer">
              {displayName}
            </span>
            <span className="text-xs text-slate-400">{formatTime(msg.created_at)}</span>
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

      {/* Inline hover actions */}
      <div className="relative w-24 flex-shrink-0 flex justify-end">
        <div
          className={cn(
            'flex items-center gap-1 transition-opacity',
            hovered || menuOpen ? 'opacity-100' : 'opacity-0'
          )}
        >
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

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-4 my-6 relative">
      <div className="flex-1 h-px bg-[#232428]" />
      <button className="text-[13px] font-semibold text-slate-200 px-4 py-1 rounded-full border border-slate-700 bg-slate-900/50 hover:bg-slate-800 transition-colors shadow-sm">
        {formatDate(date)}
      </button>
      <div className="flex-1 h-px bg-[#232428]" />
    </div>
  );
}

function ChannelEmpty({ channel }: { channel: { name: string; is_private: boolean } }) {
  return (
    <div className="flex flex-col items-start pt-8 pb-4">
      <div className="w-[72px] h-[72px] rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        {channel.is_private ? (
          <LockIcon className="w-9 h-9 text-violet-300" />
        ) : (
          <HashIcon className="w-9 h-9 text-indigo-300" />
        )}
      </div>
      <h3 className="text-[22px] font-bold text-slate-100 mb-2">
        {channel.is_private ? '🔒' : '#'} {channel.name}
      </h3>
      <p className="text-slate-400 text-[15px] max-w-lg mb-4">
        {channel.is_private
          ? 'This is the very beginning of this private channel. Only members you add can see it.'
          : `This is the very beginning of the #${channel.name} channel.`
        }
      </p>
      <button className="text-indigo-400 text-[15px] hover:underline font-medium">
        Edit description
      </button>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-0.5 items-center">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
        />
      ))}
    </span>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────
function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function MoreHIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );
}
function PinGlyph() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 5-3 3 2 7-7-2-3 3-5-5 3-3-2-7 7 2 3-3z" />
    </svg>
  );
}
function EditGlyph() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L12 14l-4 1 1-4 7.5-7.5z" />
    </svg>
  );
}
function BoldIcon() {
  return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h6a4 4 0 012.76 6.88A4 4 0 0111 17H4a1 1 0 01-1-1V4zm3 6h4a2 2 0 100-4H6v4zm0 2v4h5a2 2 0 100-4H6z"/></svg>;
}
function ItalicIcon() {
  return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h6a1 1 0 110 2h-2.276l-3.448 12H12a1 1 0 110 2H5a1 1 0 110-2h2.276l3.448-12H8a1 1 0 01-1-1z"/></svg>;
}
function StrikeIcon() {
  return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a1 1 0 011 1v3h5a1 1 0 110 2h-5v2h5a1 1 0 110 2h-5v3a1 1 0 11-2 0v-3H4a1 1 0 110-2h5V9H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>;
}
function LinkIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
}
function ListOLIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h2m0 0v4m0-4l-2 0m8 0h8M10 12h10M4 16l2-2v4m-2 0h2m4 0h10" /></svg>;
}
function ListULIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" /></svg>;
}
function BlockquoteIcon() {
  return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H5v2a2 2 0 002 2h1a1 1 0 110 2H6a4 4 0 01-4-4V5h1zm10 0a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2v2a2 2 0 002 2h1a1 1 0 110 2h-1a4 4 0 01-4-4V5h1z"/></svg>;
}
function CodeIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
}
function CodeBlockIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>;
}
function AttachIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
}
function VideoIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
}
function MicIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
}
function EmojiIcon({ className }: { className?: string }) {
  return <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function MentionIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-4 4m4-4a4 4 0 01-4 4m0-4v1m8 0a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>;
}
function ScheduleIcon({ className }: { className?: string }) {
  return <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function SendIcon({ className }: { className?: string }) {
  return <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
}
function ThreadIcon({ className }: { className?: string }) {
  return <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}
