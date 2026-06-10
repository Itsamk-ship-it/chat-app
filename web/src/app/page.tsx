'use client';
import { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import useSocket from '@/hooks/useSocket';
import AuthScreen from '@/components/AuthScreen';
import CreateOrgScreen from '@/components/CreateOrgScreen';
import AppShell from '@/components/AppShell';

export default function Page() {
  const { state, actions } = useApp();
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Keep latest channel ID in a ref so the socket onConnected callback always
  // has the current value even during the async boot sequence.
  const channelIdRef = useRef<number | null>(null);
  channelIdRef.current = state.channel?.id ?? null;

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const pendingCode = sessionStorage.getItem('pendingJoinCode');
      if (pendingCode) {
        sessionStorage.removeItem('pendingJoinCode');
        actions.setPendingCode(pendingCode);
      }

      const hasSession = await actions.boot();
      if (!hasSession) return;

      const orgs = await actions.loadOrgs();

      // Handle pending invite code
      const code = state.pendingJoinCode || pendingCode;
      if (code) {
        try {
          const joinedResult = await actions.joinByCode(code);
          if (joinedResult.ok) {
            const fresh = await actions.loadOrgs();
            const joined = fresh.find(o => o.id === joinedResult.org_id);
            if (joined) {
              actions.setScreen('app');
              const channels = await actions.selectOrg(joined);
              if (channels.length) actions.setChannel(channels[0]);
              return;
            }
          }
        } catch {}
        actions.setPendingCode(null);
      }

      if (orgs.length === 0) {
        actions.setScreen('create-org');
      } else {
        actions.setScreen('app');

        // Read saved nav BEFORE selecting an org so we can open the right one
        let savedNav: { orgId?: number; channelId?: number; dmId?: number } = {};
        try {
          const raw = localStorage.getItem('ca_nav');
          if (raw) savedNav = JSON.parse(raw);
        } catch {}

        // Select the saved org if it exists, otherwise fall back to orgs[0]
        const targetOrg = orgs.find(o => o.id === savedNav.orgId) ?? orgs[0];
        const channels = await actions.selectOrg(targetOrg);

        // Restore channel or DM within that org
        let navRestored = false;
        if (savedNav.orgId === targetOrg.id) {
          if (savedNav.channelId) {
            const ch = channels.find(c => c.id === savedNav.channelId);
            if (ch) { actions.setChannel(ch); navRestored = true; }
          } else if (savedNav.dmId) {
            const dms = await actions.loadDMs(targetOrg.id);
            const dm = dms.find(d => d.id === savedNav.dmId);
            if (dm) { actions.openDM(dm); navRestored = true; }
          }
        }

        if (!navRestored && channels.length) actions.setChannel(channels[0]);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket ───────────────────────────────────────────────────────────────
  const { joinChannel, sendMessage, startTyping, stopTyping } = useSocket(state.token, {
    onConnected: () => {
      // Use the ref so we always have the latest channel ID, even if the
      // socket connects before state.channel is set during the boot sequence.
      if (channelIdRef.current) joinChannel(channelIdRef.current);
    },
    onDisconnected: () => {},
    onAuthError: () => actions.logout(),
    onMessageHistory: (channelId, messages) => {
      actions.setMessages(channelId, messages);
    },
    onNewMessage: (msg) => {
      actions.appendMessage(msg);
      // If the message is not for the current channel, mark that channel unread
      if (state.channel?.id !== msg.channel_id) {
        actions.markChannelUnread(msg.channel_id);
      }
    },
    onMessageUpdated: (msg) => {
      actions.applyMessageUpdated(msg);
    },
    onMessageDeleted: (channelId, messageId) => {
      actions.applyMessageDeleted(channelId, messageId);
    },
    onNewDMMessage: (msg) => {
      actions.handleIncomingDMMessage(msg);
    },
    onDMMessageUpdated: (msg) => {
      actions.handleDMMessageUpdated(msg);
    },
    onDMMessageDeleted: (messageId) => {
      actions.handleDMMessageDeleted(messageId);
    },
    onTypingStart: (username, channelId) => {
      const current = state.typingByChannel[channelId] ?? [];
      if (!current.includes(username))
        actions.setTyping(channelId, [...current, username]);
    },
    onTypingStop: (username, channelId) => {
      const current = state.typingByChannel[channelId] ?? [];
      actions.setTyping(channelId, current.filter(u => u !== username));
    },
  });

  // Join socket room when channel changes
  useEffect(() => {
    if (state.channel) joinChannel(state.channel.id);
  }, [state.channel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist navigation to localStorage after every state change so refresh
  // restores the same org + channel/DM. Using useEffect ensures we read
  // fully-committed state (not stale via getState() inside an action).
  useEffect(() => {
    if (!state.org || state.screen !== 'app') return;
    try {
      if (state.channel) {
        localStorage.setItem('ca_nav', JSON.stringify({ orgId: state.org.id, channelId: state.channel.id }));
      } else if (state.activeDM) {
        localStorage.setItem('ca_nav', JSON.stringify({ orgId: state.org.id, dmId: state.activeDM.id }));
      }
    } catch {}
  }, [state.org?.id, state.channel?.id, state.activeDM?.id, state.screen]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSend(content: string) {
    if (!state.channel) return;
    sendMessage(state.channel.id, content);
  }

  function handleTypingStart() {
    if (!state.channel) return;
    startTyping(state.channel.id);
  }

  function handleTypingStop() {
    if (!state.channel) return;
    stopTyping(state.channel.id);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (state.screen === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas-base">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-lg animate-pulse">
            C
          </div>
          <p className="text-fg-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (state.screen === 'auth') return <AuthScreen />;
  if (state.screen === 'create-org') return <CreateOrgScreen />;

  return (
    <AppShell
      onSend={handleSend}
      onTypingStart={handleTypingStart}
      onTypingStop={handleTypingStop}
      onJoinChannel={(ch) => {
        actions.setChannel(ch);
        joinChannel(ch.id);
      }}
    />
  );
}
