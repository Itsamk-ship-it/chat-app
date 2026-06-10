'use client';
/**
 * Redux-backed drop-in replacement for the old Context + useReducer pattern.
 *
 * All components continue to call `useApp()` and get the same `{ state, actions }`
 * shape — nothing in the component tree needs to change.
 */
import React from 'react';
import { Provider } from 'react-redux';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { store } from '@/store/store';
import type { AppDispatch, RootState } from '@/store/store';
import * as T from '@/store/thunks';
import { setScreen } from '@/store/slices/authSlice';
import { setOrgs, addOrg as addOrgAction, setPendingCode } from '@/store/slices/workspaceSlice';
import {
  addChannel, updateChannel, removeChannel, setChannel,
} from '@/store/slices/channelsSlice';
import { setMessages, appendMessage, setTyping } from '@/store/slices/messagesSlice';
import { setSidebarView, setDMs, appendDMMessage } from '@/store/slices/dmsSlice';
import { setModal } from '@/store/slices/uiSlice';
import {
  markChannelUnread, markChannelRead, markDMUnread, markDMRead,
} from '@/store/slices/notificationsSlice';
import { setActiveThread } from '@/store/slices/contentSlice';
import type {
  User, Org, Channel, OrgMember, Message, ModalType, AppScreen,
  DirectMessage, DMMessage, StarredItem, Draft, Thread, SidebarView,
} from '@/lib/types';

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

// ── Compatibility hook ────────────────────────────────────────────────────────
// Gives components the exact same `{ state, dispatch, actions }` API they
// already use, backed by Redux under the hood.

export function useApp() {
  const dispatch = useDispatch<AppDispatch>();

  // Combine all slices into one state object (shallowEqual prevents extra renders)
  const state = useSelector((s: RootState) => ({
    // auth
    screen:            s.auth.screen as AppScreen,
    token:             s.auth.token,
    user:              s.auth.user,
    // workspace
    orgs:              s.workspace.orgs,
    org:               s.workspace.org,
    pendingJoinCode:   s.workspace.pendingJoinCode,
    // channels
    channels:          s.channels.channels,
    channel:           s.channels.channel,
    members:           s.channels.members,
    // messages
    messagesByChannel: s.messages.messagesByChannel,
    typingByChannel:   s.messages.typingByChannel,
    // dms
    sidebarView:       s.dms.sidebarView as SidebarView,
    dms:               s.dms.dms,
    activeDM:          s.dms.activeDM,
    dmMessages:        s.dms.dmMessages,
    // ui
    modal:             s.ui.modal as ModalType,
    // notifications
    unreadChannels:    s.notifications.unreadChannels,
    unreadDMs:         s.notifications.unreadDMs,
    // content
    starred:           s.content.starred,
    drafts:            s.content.drafts,
    threads:           s.content.threads,
    activeThread:      s.content.activeThread,
    threadReplies:     s.content.threadReplies,
  }), shallowEqual);

  const actions = React.useMemo(() => ({
    // ── Auth ────────────────────────────────────────────────────────────
    async boot(): Promise<boolean> {
      return dispatch(T.boot());
    },
    storeAuth(token: string, user: User) {
      dispatch(T.storeAuth(token, user));
    },
    logout() {
      dispatch(T.logout());
    },
    setScreen(screen: AppScreen) {
      dispatch(setScreen(screen));
    },

    // ── Orgs ─────────────────────────────────────────────────────────────
    async loadOrgs(): Promise<Org[]> {
      return dispatch(T.loadOrgs());
    },
    async createOrg(name: string): Promise<Org | null> {
      return dispatch(T.createOrg(name));
    },
    addOrg(org: Org) {
      dispatch(addOrgAction(org));
    },
    async selectOrg(org: Org): Promise<Channel[]> {
      return dispatch(T.selectOrg(org));
    },
    setPendingCode(code: string | null) {
      dispatch(setPendingCode(code));
    },

    // ── Channels ──────────────────────────────────────────────────────────
    addChannel(channel: Channel) {
      dispatch(addChannel(channel));
    },
    updateChannel(channel: Channel) {
      dispatch(updateChannel(channel));
    },
    removeChannel(channelId: number) {
      dispatch(removeChannel(channelId));
    },
    setChannel(channel: Channel | null) {
      dispatch(T.selectChannel(channel));
    },

    // ── Messages ──────────────────────────────────────────────────────────
    setMessages(channelId: number, messages: Message[]) {
      dispatch(setMessages({ channelId, messages }));
    },
    appendMessage(message: Message) {
      dispatch(appendMessage(message));
    },
    async editMessage(messageId: number, content: string): Promise<Message | null> {
      return dispatch(T.editMessageThunk(messageId, content));
    },
    async deleteMessage(messageId: number): Promise<{ channel_id: number; id: number } | null> {
      return dispatch(T.deleteMessageThunk(messageId));
    },
    applyMessageUpdated(message: Message) {
      dispatch(T.handleMessageUpdated(message));
    },
    applyMessageDeleted(channelId: number, messageId: number) {
      dispatch(T.handleMessageDeleted(channelId, messageId));
    },
    setTyping(channelId: number, users: string[]) {
      dispatch(setTyping({ channelId, users }));
    },

    // ── Modal ─────────────────────────────────────────────────────────────
    openModal(modal: ModalType) {
      dispatch(setModal(modal));
    },
    closeModal() {
      dispatch(setModal(null));
    },

    // ── Sidebar ───────────────────────────────────────────────────────────
    setSidebarView(view: SidebarView) {
      dispatch(setSidebarView(view));
    },

    // ── Direct Messages ───────────────────────────────────────────────────
    async loadDMs(orgId: number): Promise<DirectMessage[]> {
      return dispatch(T.loadDMs(orgId));
    },
    async startDM(orgId: number, targetUserIds: number[]): Promise<DirectMessage | null> {
      return dispatch(T.startDM(orgId, targetUserIds));
    },
    openDM(dm: DirectMessage | null) {
      dispatch(T.openDM(dm));
    },
    async loadDMMessages(dmId: number): Promise<DMMessage[]> {
      return dispatch(T.loadDMMessages(dmId));
    },
    async sendDMMessage(dmId: number, content: string): Promise<DMMessage | null> {
      return dispatch(T.sendDMMessage(dmId, content));
    },
    async editDMMessage(messageId: number, content: string): Promise<DMMessage | null> {
      return dispatch(T.editDMMessageThunk(messageId, content));
    },
    async deleteDMMessage(messageId: number): Promise<{ id: number; dm_id: number } | null> {
      return dispatch(T.deleteDMMessageThunk(messageId));
    },
    handleIncomingDMMessage(msg: DMMessage) {
      dispatch(T.handleIncomingDMMessage(msg));
    },
    handleDMMessageUpdated(msg: DMMessage) {
      dispatch(T.handleDMMessageUpdated(msg));
    },
    handleDMMessageDeleted(messageId: number) {
      dispatch(T.handleDMMessageDeleted(messageId));
    },

    // ── Notifications ─────────────────────────────────────────────────────
    markChannelUnread(channelId: number) {
      dispatch(markChannelUnread(channelId));
    },
    markChannelRead(channelId: number) {
      dispatch(markChannelRead(channelId));
    },
    markDMUnread(dmId: number) {
      dispatch(markDMUnread(dmId));
    },
    markDMRead(dmId: number) {
      dispatch(markDMRead(dmId));
    },

    // ── Starred ───────────────────────────────────────────────────────────
    async loadStarred(orgId: number): Promise<StarredItem[]> {
      return dispatch(T.loadStarred(orgId));
    },
    async starItem(itemType: string, itemId: number) {
      dispatch(T.starItem(itemType, itemId));
    },
    async unstarItem(itemId: number, itemType: string) {
      dispatch(T.unstarItem(itemId, itemType));
    },

    // ── Drafts ────────────────────────────────────────────────────────────
    async loadDrafts(orgId: number): Promise<Draft[]> {
      return dispatch(T.loadDrafts(orgId));
    },
    async saveDraft(content: string, channelId?: number, dmId?: number, threadId?: number) {
      dispatch(T.saveDraft(content, channelId, dmId, threadId));
    },

    // ── Threads ───────────────────────────────────────────────────────────
    async loadThreads(orgId: number): Promise<Thread[]> {
      return dispatch(T.loadThreads(orgId));
    },
    async loadMembers(orgId: number): Promise<OrgMember[]> {
      return dispatch(T.loadMembers(orgId));
    },
    async loadChannelMembers(
      orgId: number, channelId: number
    ): Promise<{ is_private: boolean; members: OrgMember[] } | null> {
      return dispatch(T.loadChannelMembers(orgId, channelId));
    },
    setActiveThread(thread: Message | null) {
      dispatch(T.setActiveThreadThunk(thread));
    },
    async loadThreadReplies(messageId: number): Promise<Message[]> {
      return dispatch(T.loadThreadReplies(messageId));
    },
    async replyToThread(messageId: number, content: string): Promise<Message | null> {
      return dispatch(T.replyToThread(messageId, content));
    },
    async createChannel(
      orgId: number, name: string, description: string, isPrivate: boolean
    ): Promise<Channel | null> {
      return dispatch(T.createChannel(orgId, name, description, isPrivate));
    },
    async updateChannelById(
      orgId: number, channelId: number, name: string, description: string, isPrivate: boolean
    ): Promise<Channel | null> {
      return dispatch(T.updateChannelThunk(orgId, channelId, name, description, isPrivate));
    },
    async deleteChannelById(orgId: number, channelId: number): Promise<boolean> {
      return dispatch(T.deleteChannelThunk(orgId, channelId));
    },
    async inviteByUsername(orgId: number, username: string): Promise<boolean> {
      return dispatch(T.inviteByUsername(orgId, username));
    },
    async generateInviteLink(orgId: number): Promise<string | null> {
      return dispatch(T.generateInviteLink(orgId));
    },
    async joinByCode(code: string): Promise<{ ok: boolean; org_id?: number }> {
      return dispatch(T.joinByCode(code));
    },
    async addChannelMember(orgId: number, channelId: number, username: string): Promise<boolean> {
      return dispatch(T.addChannelMember(orgId, channelId, username));
    },
    async removeChannelMember(orgId: number, channelId: number, userId: number): Promise<boolean> {
      return dispatch(T.removeChannelMember(orgId, channelId, userId));
    },
    async login(username: string, password: string): Promise<{ token: string; user: User } | null> {
      return dispatch(T.login(username, password));
    },
    async register(
      username: string, password: string, displayName: string
    ): Promise<{ token: string; user: User } | null> {
      return dispatch(T.register(username, password, displayName));
    },
    async searchMessages(orgId: number, query: string, channelId?: number): Promise<any[]> {
      return dispatch(T.searchMessages(orgId, query, channelId));
    },
    async searchChannels(orgId: number, query: string): Promise<any[]> {
      return dispatch(T.searchChannels(orgId, query));
    },
    async searchUsers(orgId: number, query: string): Promise<any[]> {
      return dispatch(T.searchUsers(orgId, query));
    },
  }), [dispatch]);

  return { state, dispatch, actions };
}
