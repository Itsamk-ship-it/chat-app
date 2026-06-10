'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

type Tab = 'username' | 'link';

export default function InviteModal() {
  const { state, actions } = useApp();
  const [tab, setTab] = useState<Tab>('username');
  const [username, setUsername] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const orgId = state.org?.id;

  async function handleInviteByUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !orgId) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const ok = await actions.inviteByUsername(orgId, username.trim());
      if (!ok) {
        setError('Failed to invite user');
        setLoading(false);
        return;
      }

      setSuccess('Invite sent successfully');
      setUsername('');
      actions.loadMembers(orgId);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateLink() {
    if (!orgId) return;

    setLoading(true);
    setError('');

    try {
      const linkOrCode = await actions.generateInviteLink(orgId);
      if (!linkOrCode) {
        setError('Failed to generate link');
        setLoading(false);
        return;
      }
      const fullUrl = linkOrCode.startsWith('http')
        ? linkOrCode
        : `${window.location.origin}/join/${linkOrCode}`;
      setInviteLink(fullUrl);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalWrapper title="Invite People" onClose={actions.closeModal} size="md">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-canvas-overlay mb-6">
        <button
          onClick={() => { setTab('username'); setError(''); setSuccess(''); }}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
            tab === 'username'
              ? 'bg-canvas-base text-fg shadow-sm'
              : 'text-fg-muted hover:text-fg'
          )}
        >
          By Username
        </button>
        <button
          onClick={() => { setTab('link'); setError(''); setSuccess(''); }}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
            tab === 'link'
              ? 'bg-canvas-base text-fg shadow-sm'
              : 'text-fg-muted hover:text-fg'
          )}
        >
          Invite Link
        </button>
      </div>

      {tab === 'username' ? (
        <form onSubmit={handleInviteByUsername} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter their username"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-canvas-overlay border border-border
                         text-fg placeholder-fg-muted
                         focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                         outline-none transition-all"
            />
            <p className="mt-2 text-xs text-fg-muted">
              The user must already have an account on this platform.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={!username.trim() || loading}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white
                       font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Inviting...' : 'Send Invite'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {!inviteLink ? (
            <>
              <p className="text-sm text-fg-muted">
                Generate a shareable invite link. Anyone with this link can join your workspace.
                The link expires in 7 days.
              </p>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-danger-muted border border-danger/20 text-danger text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white
                           font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Invite Link'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-fg mb-2">Invite Link</label>
                <div className="flex gap-2">
                  <input
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl bg-canvas-overlay border border-border
                               text-fg font-mono text-xs
                               outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'px-4 py-3 rounded-xl font-medium transition-all flex-shrink-0',
                      copied
                        ? 'bg-success text-white'
                        : 'bg-accent hover:bg-accent-hover text-white'
                    )}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-fg-muted">
                  Share this link with anyone you want to invite. Expires in 7 days.
                </p>
              </div>

              <button
                onClick={() => setInviteLink(null)}
                className="w-full py-2 text-sm text-fg-muted hover:text-fg transition-colors"
              >
                Generate a new link
              </button>
            </>
          )}
        </div>
      )}
    </ModalWrapper>
  );
}
