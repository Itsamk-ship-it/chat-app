/** Resolve the API base URL at call-time.
 *  If NEXT_PUBLIC_API_URL points to localhost but the page is served from a
 *  non-localhost origin (deployed), fall back to '' so requests hit the same
 *  host as the frontend (assumes a reverse-proxy forwards /api/* to backend).
 */
function getBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env) {
    const envIsLocal = env.includes('localhost') || env.includes('127.0.0.1');
    if (envIsLocal && typeof window !== 'undefined') {
      const host = window.location.hostname;
      const pageIsLocal = host === 'localhost' || host === '127.0.0.1';
      if (!pageIsLocal) return '';
    }
    return env;
  }
  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
}

let _token: string | null = null;
export function setApiToken(t: string | null) { _token = t; }

async function req(path: string, opts: RequestInit = {}) {
  return fetch(`${getBase()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body,
  });
}

export const api = {
  // Auth
  login:    (username: string, password: string) =>
    req('/api/auth/login',    { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string, displayName: string) =>
    req('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, displayName }) }),

  // Orgs
  getOrgs:       () => req('/api/orgs'),
  createOrg:     (name: string) => req('/api/orgs', { method: 'POST', body: JSON.stringify({ name }) }),
  getOrgMembers: (orgId: number) => req(`/api/orgs/${orgId}/members`),

  inviteByUsername: (orgId: number, username: string) =>
    req(`/api/orgs/${orgId}/invite/username`, { method: 'POST', body: JSON.stringify({ username }) }),
  generateLink: (orgId: number) =>
    req(`/api/orgs/${orgId}/invite/link`, { method: 'POST' }),
  joinByCode: (code: string) =>
    req(`/api/orgs/join/${code}`, { method: 'POST' }),

  // Channels
  getChannels:   (orgId: number) => req(`/api/orgs/${orgId}/channels`),
  createChannel: (orgId: number, name: string, description: string, is_private: boolean) =>
    req(`/api/orgs/${orgId}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name, description, is_private }),
    }),
  updateChannel: (orgId: number, channelId: number, name: string, description: string, is_private: boolean) =>
    req(`/api/orgs/${orgId}/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description, is_private }),
    }),
  deleteChannel: (orgId: number, channelId: number) =>
    req(`/api/orgs/${orgId}/channels/${channelId}`, { method: 'DELETE' }),

  // Channel members
  getChannelMembers: (orgId: number, channelId: number) =>
    req(`/api/orgs/${orgId}/channels/${channelId}/members`),
  addChannelMember: (orgId: number, channelId: number, username: string) =>
    req(`/api/orgs/${orgId}/channels/${channelId}/members`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  removeChannelMember: (orgId: number, channelId: number, userId: number) =>
    req(`/api/orgs/${orgId}/channels/${channelId}/members/${userId}`, { method: 'DELETE' }),

  // Direct Messages
  getDMs: (orgId: number) => req(`/api/dms/org/${orgId}`),
  startDM: (orgId: number, targetUserId: number) =>
    req('/api/dms/start', { method: 'POST', body: JSON.stringify({ orgId, targetUserId }) }),
  getDMMessages: (dmId: number) => req(`/api/dms/${dmId}/messages`),
  sendDMMessage: (dmId: number, content: string) =>
    req(`/api/dms/${dmId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  editDMMessage: (messageId: number, content: string) =>
    req(`/api/dms/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteDMMessage: (messageId: number) =>
    req(`/api/dms/messages/${messageId}`, { method: 'DELETE' }),

  // Starred Items
  getStarred: (orgId: number) => req(`/api/starred/org/${orgId}`),
  starItem: (orgId: number, itemType: string, itemId: number) =>
    req('/api/starred', { method: 'POST', body: JSON.stringify({ orgId, itemType, itemId }) }),
  unstarItem: (itemType: string, itemId: number) =>
    req(`/api/starred/${itemType}/${itemId}`, { method: 'DELETE' }),
  checkStarred: (itemType: string, itemId: number) =>
    req(`/api/starred/check/${itemType}/${itemId}`),

  // Drafts
  getDrafts: (orgId: number) => req(`/api/drafts/org/${orgId}`),
  saveDraft: (content: string, channelId?: number, dmId?: number, threadId?: number) =>
    req('/api/drafts', { method: 'POST', body: JSON.stringify({ content, channelId, dmId, threadId }) }),
  getDraft: (channelId: number) => req(`/api/drafts/channel/${channelId}`),
  deleteDraft: (draftId: number) => req(`/api/drafts/${draftId}`, { method: 'DELETE' }),

  // Threads
  getThreadReplies: (messageId: number) => req(`/api/threads/${messageId}`),
  getUserThreads: (orgId: number) => req(`/api/threads/user/all?orgId=${orgId}`),
  replyToThread: (messageId: number, content: string) =>
    req(`/api/threads/${messageId}/reply`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Messages
  editMessage: (messageId: number, content: string) =>
    req(`/api/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteMessage: (messageId: number) =>
    req(`/api/messages/${messageId}`, { method: 'DELETE' }),

  // Search
  searchMessages: (orgId: number, query: string, channelId?: number) =>
    req(`/api/search?orgId=${orgId}&q=${encodeURIComponent(query)}${channelId ? `&channelId=${channelId}` : ''}`),
  searchChannels: (orgId: number, query: string) =>
    req(`/api/search/channels?orgId=${orgId}&q=${encodeURIComponent(query)}`),
  searchUsers: (orgId: number, query: string) =>
    req(`/api/search/users?orgId=${orgId}&q=${encodeURIComponent(query)}`),
};
