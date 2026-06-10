export interface User {
  id: number;
  username: string;
  display_name?: string;
}

export interface Org {
  id: number;
  name: string;
  slug: string;
  created_by: number;
  created_at: string;
  role: 'owner' | 'member';
}

export interface Channel {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  created_at: string;
  created_by: number;
  org_id?: number;
}

export interface OrgMember {
  id: number;
  username: string;
  display_name?: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface ChannelMember {
  id: number;
  username: string;
  display_name?: string;
  joined_at: string;
}

export interface Message {
  id: number;
  content: string;
  created_at: string;
  edited_at?: string;
  username: string;
  display_name?: string;
  user_id: number;
  channel_id: number;
  thread_id?: number;
  reply_count?: number;
}

export interface DirectMessage {
  id: number;
  org_id: number;
  created_at: string;
  other_participants: { id: number; username: string; display_name?: string }[];
  participant_names: string;
  last_message?: string;
  last_message_at?: string;
}

export interface DMMessage {
  id: number;
  content: string;
  created_at: string;
  edited_at?: string;
  user_id: number;
  username: string;
  display_name?: string;
  dm_id?: number;
}

export interface StarredItem {
  id: number;
  item_type: 'channel' | 'message' | 'dm';
  item_id: number;
  created_at: string;
  // Flattened properties from the backend
  name?: string;
  is_private?: boolean;
  content?: string;
  channel_id?: number;
  channel_name?: string;
  dm_id?: number;
  display_name?: string;
  username?: string;
}

export interface Draft {
  id: number;
  content: string;
  channel_id?: number;
  dm_id?: number;
  thread_id?: number;
  updated_at: string;
  channel_name?: string;
  channel_is_private?: boolean;
}

export interface Thread {
  id: number;
  parent_content: string;
  parent_created_at: string;
  reply_count: number;
  channel_id: number;
  channel_name: string;
  parent_author: string;
  last_reply?: {
    content: string;
    created_at: string;
    display_name: string;
  };
}

export interface SearchResult {
  id: number;
  content: string;
  created_at: string;
  channel_id: number;
  thread_id?: number;
  reply_count?: number;
  username: string;
  display_name?: string;
  channel_name: string;
  is_private: boolean;
}

export type ModalType =
  | 'org-switcher'
  | 'create-org'
  | 'create-channel'
  | 'invite'
  | 'channel-members'
  | 'join-org'
  | 'threads'
  | 'drafts'
  | 'starred'
  | 'search'
  | 'new-dm'
  | 'directories'
  | 'dm'
  | 'thread-view'
  | 'pins'
  | null;

export type AppScreen = 'loading' | 'auth' | 'create-org' | 'app';

export type SidebarView = 'home' | 'dms' | 'activity' | 'later' | 'threads' | 'drafts' | 'directories';
