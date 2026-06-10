/**
 * All async thunks for the chat app.
 * Each thunk dispatches slice actions and returns data to callers.
 */
import { api, setApiToken } from '@/lib/api';
import type { AppDispatch, RootState } from './store';
import type {
  Org, Channel, DirectMessage, DMMessage,
  OrgMember, Message, StarredItem, Draft, Thread, User,
} from '@/lib/types';

import { setScreen, setAuth, noSession, logout as logoutAction } from './slices/authSlice';
import { setOrgs, addOrg, setOrg, setPendingCode } from './slices/workspaceSlice';
import {
  setChannels, addChannel, updateChannel as updateChannelAction,
  removeChannel as removeChannelAction, setChannel, setMembers, clearChannels,
} from './slices/channelsSlice';
import {
  setMessages, appendMessage, updateMessage, deleteMessage, setTyping, clearMessages,
} from './slices/messagesSlice';
import {
  setDMs, setActiveDM, setDMMessages, appendDMMessage, updateDMMessage, deleteDMMessage, clearDMs,
} from './slices/dmsSlice';
import { setModal } from './slices/uiSlice';
import {
  markChannelRead, markDMRead, markDMUnread, clearNotifications,
} from './slices/notificationsSlice';
import {
  setStarred, removeStarred, setDrafts,
  setThreads, setActiveThread, setThreadReplies, appendThreadReply, clearContent,
} from './slices/contentSlice';

type ThunkAction<R = void> = (dispatch: AppDispatch, getState: () => RootState) => Promise<R>;

// ── Auth ──────────────────────────────────────────────────────────────────────

export const boot = (): ThunkAction<boolean> => async (dispatch) => {
  try {
    const token = localStorage.getItem('ca_token');
    const rawUser = localStorage.getItem('ca_user');
    const user = rawUser ? (JSON.parse(rawUser) as User | null) : null;
    if (token && user) {
      setApiToken(token);
      dispatch(setAuth({ token, user }));
      return true;
    }
  } catch {
    localStorage.removeItem('ca_token');
    localStorage.removeItem('ca_user');
    setApiToken(null);
  }
  dispatch(noSession());
  return false;
};

export const storeAuth = (token: string, user: User): ThunkAction => async (dispatch) => {
  localStorage.setItem('ca_token', token);
  localStorage.setItem('ca_user', JSON.stringify(user));
  setApiToken(token);
  dispatch(setAuth({ token, user }));
};

export const logout = (): ThunkAction => async (dispatch) => {
  localStorage.removeItem('ca_token');
  localStorage.removeItem('ca_user');
  localStorage.removeItem('ca_nav');
  setApiToken(null);
  dispatch(logoutAction());
  dispatch(clearChannels());
  dispatch(clearMessages());
  dispatch(clearDMs());
  dispatch(clearContent());
  dispatch(clearNotifications());
};

// ── Orgs ──────────────────────────────────────────────────────────────────────

export const loadOrgs = (): ThunkAction<Org[]> => async (dispatch) => {
  try {
    const r = await api.getOrgs();
    if (!r.ok) return [];
    const data = await r.json();
    const orgs: Org[] = Array.isArray(data) ? data : [];
    dispatch(setOrgs(orgs));
    return orgs;
  } catch { return []; }
};

export const createOrg = (name: string): ThunkAction<Org | null> => async (dispatch) => {
  try {
    const r = await api.createOrg(name);
    if (r.ok) {
      const org: Org = await r.json();
      dispatch(addOrg(org));
      return org;
    }
  } catch {}
  return null;
};

export const selectOrg = (org: Org): ThunkAction<Channel[]> => async (dispatch) => {
  dispatch(setOrg(org));
  dispatch(clearChannels());
  dispatch(clearMessages());
  dispatch(clearDMs());
  dispatch(clearContent());
  dispatch(clearNotifications());

  const [channels] = await Promise.all([
    dispatch(loadChannels(org.id)),
    dispatch(loadMembers(org.id)),
  ]);

  // Load secondary data in background (no await)
  dispatch(loadDMs(org.id));
  dispatch(loadStarred(org.id));
  dispatch(loadDrafts(org.id));
  dispatch(loadThreads(org.id));

  return channels;
};

// ── Channels ──────────────────────────────────────────────────────────────────

export const loadChannels = (orgId: number): ThunkAction<Channel[]> => async (dispatch) => {
  try {
    const r = await api.getChannels(orgId);
    if (!r.ok) return [];
    const data = await r.json();
    const channels: Channel[] = Array.isArray(data) ? data : [];
    dispatch(setChannels(channels));
    return channels;
  } catch { return []; }
};

export const loadMembers = (orgId: number): ThunkAction<OrgMember[]> => async (dispatch) => {
  try {
    const r = await api.getOrgMembers(orgId);
    if (!r.ok) return [];
    const data = await r.json();
    const members: OrgMember[] = Array.isArray(data) ? data : [];
    dispatch(setMembers(members));
    return members;
  } catch { return []; }
};

export const selectChannel = (channel: Channel | null): ThunkAction => async (dispatch) => {
  dispatch(setChannel(channel));
  if (channel) {
    dispatch(setActiveDM(null)); // Close any open DM when switching to a channel
    dispatch(markChannelRead(channel.id));
  }
};

export const createChannel = (
  orgId: number, name: string, description: string, is_private: boolean
): ThunkAction<Channel | null> => async (dispatch) => {
  try {
    const r = await api.createChannel(orgId, name, description, is_private);
    if (r.ok) {
      const ch: Channel = await r.json();
      dispatch(addChannel(ch));
      return ch;
    }
  } catch {}
  return null;
};

export const updateChannelThunk = (
  orgId: number, channelId: number, name: string, description: string, is_private: boolean
): ThunkAction<Channel | null> => async (dispatch) => {
  try {
    const r = await api.updateChannel(orgId, channelId, name, description, is_private);
    if (r.ok) {
      const ch: Channel = await r.json();
      dispatch(updateChannelAction(ch));
      return ch;
    }
    const data = await r.json();
    return null;
  } catch { return null; }
};

export const deleteChannelThunk = (
  orgId: number, channelId: number
): ThunkAction<boolean> => async (dispatch) => {
  try {
    const r = await api.deleteChannel(orgId, channelId);
    if (r.ok) {
      dispatch(removeChannelAction(channelId));
      return true;
    }
  } catch {}
  return false;
};

// ── Direct Messages ───────────────────────────────────────────────────────────

export const loadDMs = (orgId: number): ThunkAction<DirectMessage[]> => async (dispatch) => {
  try {
    const r = await api.getDMs(orgId);
    if (r.ok) {
      const dms: DirectMessage[] = await r.json();
      dispatch(setDMs(dms));
      return dms;
    }
  } catch {}
  return [];
};

export const startDM = (
  orgId: number, targetUserIds: number[]
): ThunkAction<DirectMessage | null> => async (dispatch, getState) => {
  try {
    const r = await api.startDM(orgId, targetUserIds[0]);
    if (r.ok) {
      const { id } = await r.json();
      const dms = await dispatch(loadDMs(orgId));
      const dm = dms.find(d => d.id === id);
      if (dm) { dispatch(openDM(dm)); return dm; }
    }
  } catch {}
  return null;
};

export const openDM = (dm: DirectMessage | null): ThunkAction => async (dispatch) => {
  dispatch(setChannel(null));
  dispatch(setActiveDM(dm));
  if (dm) {
    dispatch(markDMRead(dm.id));
    dispatch(loadDMMessages(dm.id));
  }
};

export const loadDMMessages = (dmId: number): ThunkAction<DMMessage[]> => async (dispatch) => {
  try {
    const r = await api.getDMMessages(dmId);
    if (r.ok) {
      const messages: DMMessage[] = await r.json();
      dispatch(setDMMessages(messages));
      return messages;
    }
  } catch {}
  return [];
};

export const sendDMMessage = (
  dmId: number, content: string
): ThunkAction<DMMessage | null> => async (dispatch) => {
  try {
    const r = await api.sendDMMessage(dmId, content);
    if (r.ok) {
      const msg: DMMessage = await r.json();
      dispatch(appendDMMessage(msg));
      return msg;
    }
  } catch {}
  return null;
};

export const editDMMessageThunk = (
  messageId: number, content: string
): ThunkAction<DMMessage | null> => async (dispatch) => {
  try {
    const r = await api.editDMMessage(messageId, content);
    if (r.ok) {
      const msg: DMMessage = await r.json();
      dispatch(updateDMMessage(msg));
      return msg;
    }
  } catch {}
  return null;
};

export const deleteDMMessageThunk = (
  messageId: number
): ThunkAction<{ id: number; dm_id: number } | null> => async (dispatch) => {
  try {
    const r = await api.deleteDMMessage(messageId);
    if (r.ok) {
      const data: { id: number; dm_id: number } = await r.json();
      dispatch(deleteDMMessage(data.id));
      dispatch(removeStarred({ itemType: 'dm', itemId: data.id }));
      return data;
    }
  } catch {}
  return null;
};

export const handleIncomingDMMessage = (msg: DMMessage): ThunkAction => async (dispatch, getState) => {
  const { dms: { activeDM }, auth: { user } } = getState();
  if (msg.dm_id !== undefined && activeDM?.id === msg.dm_id) {
    // Don't re-add sender's own messages (already added via REST)
    if (msg.user_id !== user?.id) {
      dispatch(appendDMMessage(msg));
    }
  } else if (msg.dm_id !== undefined) {
    dispatch(markDMUnread(msg.dm_id));
  }
};

export const handleDMMessageUpdated = (msg: DMMessage): ThunkAction => async (dispatch) => {
  dispatch(updateDMMessage(msg));
};

export const handleDMMessageDeleted = (messageId: number): ThunkAction => async (dispatch) => {
  dispatch(deleteDMMessage(messageId));
  dispatch(removeStarred({ itemType: 'dm', itemId: messageId }));
};

// ── Messages ─────────────────────────────────────────────────────────────────

export const setMessagesThunk = (channelId: number, messages: Message[]): ThunkAction =>
  async (dispatch) => { dispatch(setMessages({ channelId, messages })); };

export const appendMessageThunk = (message: Message): ThunkAction =>
  async (dispatch) => { dispatch(appendMessage(message)); };

export const setTypingThunk = (channelId: number, users: string[]): ThunkAction =>
  async (dispatch) => { dispatch(setTyping({ channelId, users })); };

export const editMessageThunk = (
  messageId: number, content: string
): ThunkAction<Message | null> => async (dispatch) => {
  try {
    const r = await api.editMessage(messageId, content);
    if (r.ok) {
      const msg: Message = await r.json();
      dispatch(updateMessage(msg));
      return msg;
    }
  } catch {}
  return null;
};

export const deleteMessageThunk = (
  messageId: number
): ThunkAction<{ channel_id: number; id: number } | null> => async (dispatch) => {
  try {
    const r = await api.deleteMessage(messageId);
    if (r.ok) {
      const data: { channel_id: number; id: number } = await r.json();
      dispatch(deleteMessage({ channelId: data.channel_id, messageId: data.id }));
      dispatch(removeStarred({ itemType: 'message', itemId: data.id }));
      return data;
    }
  } catch {}
  return null;
};

export const handleMessageUpdated = (msg: Message): ThunkAction =>
  async (dispatch) => { dispatch(updateMessage(msg)); };

export const handleMessageDeleted = (
  channelId: number, messageId: number
): ThunkAction => async (dispatch) => {
  dispatch(deleteMessage({ channelId, messageId }));
  dispatch(removeStarred({ itemType: 'message', itemId: messageId }));
};

// ── Starred ───────────────────────────────────────────────────────────────────

export const loadStarred = (orgId: number): ThunkAction<StarredItem[]> => async (dispatch) => {
  try {
    const r = await api.getStarred(orgId);
    if (r.ok) {
      const starred: StarredItem[] = await r.json();
      dispatch(setStarred(starred));
      return starred;
    }
  } catch {}
  return [];
};

export const starItem = (
  itemType: string, itemId: number
): ThunkAction => async (dispatch, getState) => {
  const { workspace: { org } } = getState();
  if (!org) return;
  try {
    const r = await api.starItem(org.id, itemType, itemId);
    if (r.ok) dispatch(loadStarred(org.id));
  } catch {}
};

export const unstarItem = (
  itemId: number, itemType: string
): ThunkAction => async (dispatch) => {
  try {
    const r = await api.unstarItem(itemType, itemId);
    if (r.ok) dispatch(removeStarred({ itemType, itemId }));
  } catch {}
};

// ── Drafts ────────────────────────────────────────────────────────────────────

export const loadDrafts = (orgId: number): ThunkAction<Draft[]> => async (dispatch) => {
  try {
    const r = await api.getDrafts(orgId);
    if (r.ok) {
      const drafts: Draft[] = await r.json();
      dispatch(setDrafts(drafts));
      return drafts;
    }
  } catch {}
  return [];
};

export const saveDraft = (
  content: string, channelId?: number, dmId?: number, threadId?: number
): ThunkAction => async (dispatch, getState) => {
  try {
    await api.saveDraft(content, channelId, dmId, threadId);
    const { workspace: { org } } = getState();
    if (org) dispatch(loadDrafts(org.id));
  } catch {}
};

// ── Threads ───────────────────────────────────────────────────────────────────

export const loadThreads = (orgId: number): ThunkAction<Thread[]> => async (dispatch) => {
  try {
    const r = await api.getUserThreads(orgId);
    if (r.ok) {
      const threads: Thread[] = await r.json();
      dispatch(setThreads(threads));
      return threads;
    }
  } catch {}
  return [];
};

export const setActiveThreadThunk = (thread: Message | null): ThunkAction =>
  async (dispatch) => {
    dispatch(setActiveThread(thread));
    if (thread) {
      dispatch(loadThreadReplies(thread.id));
      dispatch(setModal('thread-view'));
    }
  };

export const loadThreadReplies = (messageId: number): ThunkAction<Message[]> => async (dispatch) => {
  try {
    const r = await api.getThreadReplies(messageId);
    if (r.ok) {
      const replies: Message[] = await r.json();
      dispatch(setThreadReplies(replies));
      return replies;
    }
  } catch {}
  return [];
};

export const replyToThread = (
  messageId: number, content: string
): ThunkAction<Message | null> => async (dispatch) => {
  try {
    const r = await api.replyToThread(messageId, content);
    if (r.ok) {
      const reply: Message = await r.json();
      dispatch(appendThreadReply(reply));
      return reply;
    }
  } catch {}
  return null;
};

// ── UI ────────────────────────────────────────────────────────────────────────

export const openModal = (modal: import('@/lib/types').ModalType): ThunkAction =>
  async (dispatch) => { dispatch(setModal(modal)); };

export const closeModal = (): ThunkAction =>
  async (dispatch) => { dispatch(setModal(null)); };

export const markChannelUnreadThunk = (channelId: number): ThunkAction =>
  async (dispatch) => { dispatch({ type: 'notifications/markChannelUnread', payload: channelId }); };

// ── Invite / Join ─────────────────────────────────────────────────────────────

export const inviteByUsername = (orgId: number, username: string): ThunkAction<boolean> =>
  async () => {
    try {
      const r = await api.inviteByUsername(orgId, username);
      return r.ok;
    } catch { return false; }
  };

export const generateInviteLink = (orgId: number): ThunkAction<string | null> =>
  async () => {
    try {
      const r = await api.generateLink(orgId);
      if (r.ok) {
        const d = await r.json();
        return d.link ?? d.code ?? null;
      }
    } catch {}
    return null;
  };

export const joinByCode = (code: string): ThunkAction<{ ok: boolean; org_id?: number }> =>
  async () => {
    try {
      const r = await api.joinByCode(code);
      if (r.ok) {
        const d = await r.json();
        return { ok: true, org_id: d.org_id };
      }
    } catch {}
    return { ok: false };
  };

export const login = (
  username: string, password: string
): ThunkAction<{ token: string; user: User } | null> => async () => {
  try {
    const r = await api.login(username, password);
    if (r.ok) return (await r.json()) as { token: string; user: User };

    let message = 'Login failed';
    try {
      const data = await r.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  } catch (err) {
    throw err instanceof Error ? err : new Error('Cannot connect to server.');
  }
};

export const register = (
  username: string, password: string, displayName: string
): ThunkAction<{ token: string; user: User } | null> => async () => {
  try {
    const r = await api.register(username, password, displayName);
    if (r.ok) return (await r.json()) as { token: string; user: User };

    let message = 'Registration failed';
    try {
      const data = await r.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  } catch (err) {
    throw err instanceof Error ? err : new Error('Cannot connect to server.');
  }
};

// ── Channel Members ───────────────────────────────────────────────────────────

export const addChannelMember = (
  orgId: number, channelId: number, username: string
): ThunkAction<boolean> => async () => {
  try {
    const r = await api.addChannelMember(orgId, channelId, username);
    return r.ok;
  } catch { return false; }
};

export const removeChannelMember = (
  orgId: number, channelId: number, userId: number
): ThunkAction<boolean> => async () => {
  try {
    const r = await api.removeChannelMember(orgId, channelId, userId);
    return r.ok;
  } catch { return false; }
};

export const loadChannelMembers = (
  orgId: number, channelId: number
): ThunkAction<{ is_private: boolean; members: OrgMember[] } | null> => async () => {
  try {
    const r = await api.getChannelMembers(orgId, channelId);
    if (r.ok) return (await r.json()) as { is_private: boolean; members: OrgMember[] };
  } catch {}
  return null;
};

export const getChannelMembers = (orgId: number, channelId: number) =>
  async () => {
    try {
      const r = await api.getChannelMembers(orgId, channelId);
      if (r.ok) return (await r.json()) as OrgMember[];
    } catch {}
    return [];
  };

// ── Search ────────────────────────────────────────────────────────────────────

export const searchMessages = (
  orgId: number, query: string, channelId?: number
): ThunkAction<any[]> => async () => {
  try {
    const r = await api.searchMessages(orgId, query, channelId);
    if (r.ok) return await r.json();
  } catch {}
  return [];
};

export const searchChannels = (orgId: number, query: string): ThunkAction<any[]> => async () => {
  try {
    const r = await api.searchChannels(orgId, query);
    if (r.ok) return await r.json();
  } catch {}
  return [];
};

export const searchUsers = (orgId: number, query: string): ThunkAction<any[]> => async () => {
  try {
    const r = await api.searchUsers(orgId, query);
    if (r.ok) return await r.json();
  } catch {}
  return [];
};
