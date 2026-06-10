'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import DMChatArea from './DMChatArea';
import type { Channel } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import OrgSwitcherModal from './modals/OrgSwitcherModal';
import CreateOrgModal from './modals/CreateOrgModal';
import CreateChannelModal from './modals/CreateChannelModal';
import InviteModal from './modals/InviteModal';
import ChannelMembersModal from './modals/ChannelMembersModal';
import JoinOrgModal from './modals/JoinOrgModal';
import SearchModal from './modals/SearchModal';
import ThreadsModal from './modals/ThreadsModal';
import DraftsModal from './modals/DraftsModal';
import StarredModal from './modals/StarredModal';
import NewDMModal from './modals/NewDMModal';
import DirectoriesModal from './modals/DirectoriesModal';
import ThreadViewModal from './modals/ThreadViewModal';
import PinsModal from './modals/PinsModal';

interface Props {
  onSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onJoinChannel: (ch: Channel) => void;
}

export default function AppShell({ onSend, onTypingStart, onTypingStop, onJoinChannel }: Props) {
  const { state } = useApp();
  const shellRef = useRef<HTMLDivElement>(null);
  const leftRailWidth = 72;
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback(() => setResizing(true), []);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const rect = shellRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = e.clientX - rect.left - leftRailWidth;
      const clamped = Math.max(200, Math.min(360, next));
      setSidebarWidth(clamped);
    };

    const onUp = () => setResizing(false);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  return (
    <div className="h-screen bg-[#1e1f22]">
      <div
        ref={shellRef}
        className="h-full overflow-hidden flex"
      >
        <LeftRail onJoinChannel={onJoinChannel} width={leftRailWidth} />
        <div className="shrink-0 border-r border-[#232428] bg-[#2b2d31]" style={{ width: sidebarWidth }}>
          <Sidebar onJoinChannel={onJoinChannel} />
        </div>
        <button
          type="button"
          onMouseDown={startResize}
          aria-label="Resize sidebar"
          className="w-1 shrink-0 bg-[#232428] hover:bg-[#5865f2] transition-colors cursor-col-resize"
        />
        <main className="min-w-0 flex-1 flex flex-col bg-[#313338]">
          <TopBar />
          <div className="flex-1 min-h-0">
            {state.activeDM ? (
              <DMChatArea />
            ) : state.channel ? (
              <ChatArea onSend={onSend} onTypingStart={onTypingStart} onTypingStop={onTypingStop} />
            ) : (
              <EmptyState />
            )}
          </div>
        </main>
      </div>

      {state.modal === 'org-switcher' && <OrgSwitcherModal onJoinChannel={onJoinChannel} />}
      {state.modal === 'create-org' && <CreateOrgModal onJoinChannel={onJoinChannel} />}
      {state.modal === 'create-channel' && <CreateChannelModal onJoinChannel={onJoinChannel} />}
      {state.modal === 'invite' && <InviteModal />}
      {state.modal === 'channel-members' && <ChannelMembersModal />}
      {state.modal === 'join-org' && <JoinOrgModal onJoinChannel={onJoinChannel} />}
      {state.modal === 'search' && <SearchModal />}
      {state.modal === 'threads' && <ThreadsModal />}
      {state.modal === 'drafts' && <DraftsModal />}
      {state.modal === 'starred' && <StarredModal />}
      {state.modal === 'new-dm' && <NewDMModal />}
      {state.modal === 'directories' && <DirectoriesModal />}
      {state.modal === 'thread-view' && <ThreadViewModal />}
      {state.modal === 'pins' && <PinsModal />}
    </div>
  );
}

function LeftRail({ onJoinChannel, width }: { onJoinChannel: (ch: Channel) => void; width: number }) {
  const { state, actions } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const userLabel = state.user?.display_name || state.user?.username || 'U';

  async function handleSelectOrg(orgId: number) {
    const org = state.orgs.find((o) => o.id === orgId);
    if (!org) return;
    const channels = await actions.selectOrg(org);
    actions.setScreen('app');
    if (channels.length > 0) onJoinChannel(channels[0]);
  }

  return (
    <aside className="relative bg-[#1e1f22] border-r border-[#232428] flex flex-col items-center py-3 gap-2" style={{ width }}>
      <div className="w-full my-2 px-2 space-y-2">
        {state.orgs.map((org) => {
          const selected = state.org?.id === org.id;
          // Show red dot when this is the active org and there are unread messages
          const hasUnread = selected && (state.unreadChannels.length > 0 || state.unreadDMs.length > 0);
          return (
            <div key={org.id} className="relative group flex justify-center">
              {selected && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-white" />}
              <button
                onClick={() => handleSelectOrg(org.id)}
                className={cn(
                  'w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-[11px] font-semibold text-white transition-all',
                  selected ? 'bg-[#5865f2] rounded-2xl' : 'bg-[#313338] hover:bg-[#5865f2] hover:rounded-2xl'
                )}
                title={org.name}
              >
                {initials(org.name)}
              </button>
              {hasUnread && (
                <span className="pointer-events-none absolute bottom-0 right-2 w-3 h-3 rounded-full bg-red-500 border-2 border-[#1e1f22]" />
              )}
              <span
                className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2
                            whitespace-nowrap rounded-md border border-[#232428] bg-[#111214]
                            px-2 py-1 text-[11px] text-slate-100 shadow-lg opacity-0
                            group-hover:opacity-100 transition-opacity z-30"
              >
                {org.name}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex-1" />

      {menuOpen && (
        <div className="absolute bottom-14 left-16 z-20 w-44 rounded-md border border-[#232428] bg-[#111214] shadow-xl p-1">
          <button
            onClick={() => {
              setMenuOpen(false);
              actions.openModal('org-switcher');
            }}
            className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-200 hover:bg-[#2b2d31]"
          >
            Switch workspace
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              actions.logout();
            }}
            className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-200 hover:bg-[#2b2d31]"
          >
            Log out
          </button>
        </div>
      )}

      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="w-10 h-10 mb-1 rounded-full bg-[#f23f43] text-[11px] text-white"
        title={userLabel}
      >
        {initials(userLabel)}
      </button>
    </aside>
  );
}

function TopBar() {
  const { state } = useApp();
  return (
    <header className="h-12 px-4 border-b border-[#232428] bg-[#313338] flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-100">{state.channel?.name || 'general'}</span>
      <div className="text-xs text-slate-400">{state.org?.name || 'Workspace'}</div>
    </header>
  );
}

function EmptyState() {
  return (
    <div className="h-full p-8 bg-[#313338]">
      <div className="max-w-2xl rounded-xl border border-[#232428] bg-[#2b2d31] p-8">
        <h2 className="text-3xl font-bold text-slate-100">Welcome back</h2>
        <p className="text-slate-400 mt-2">Select a channel or DM to jump in.</p>
      </div>
    </div>
  );
}
