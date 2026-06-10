'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';

export default function CreateOrgScreen() {
  const { actions } = useApp();
  const [name, setName]         = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<'create' | 'join'>('create');

  async function handleCreate() {
    setError('');
    if (!name.trim()) { setError('Workspace name is required.'); return; }
    setLoading(true);
    try {
      const d = await actions.createOrg(name.trim());
      if (!d) { setError('Failed'); return; }
      actions.addOrg(d);
      actions.setScreen('app');
      const channels = await actions.selectOrg(d);
      if (channels.length) actions.setChannel(channels[0]);
    } catch {
      setError('Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setError('');
    let raw = joinCode.trim();
    const m = raw.match(/\/join\/([a-f0-9]+)/i);
    const code = m ? m[1] : raw;
    if (!code) { setError('Enter a code or URL.'); return; }
    setLoading(true);
    try {
      const d = await actions.joinByCode(code);
      if (!d.ok) { setError('Invalid invite'); return; }
      const orgs = await actions.loadOrgs();
      const joined = orgs.find(o => o.id === d.org_id);
      if (joined) {
        actions.setScreen('app');
        const channels = await actions.selectOrg(joined);
        if (channels.length) actions.setChannel(channels[0]);
      }
    } catch {
      setError('Failed to join workspace.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-canvas-base"
         style={{ background: 'radial-gradient(ellipse at center top, #1a1b4b 0%, #0D1117 60%)' }}>
      <div className="w-full max-w-md mx-4 animate-scale-up text-center">
        <div className="text-5xl mb-6">🏢</div>
        <h1 className="text-3xl font-bold text-fg mb-2">Set up your workspace</h1>
        <p className="text-fg-muted text-sm mb-8">
          Workspaces bring your team together around channels and conversations.
        </p>

        <div className="bg-canvas-overlay rounded-2xl border border-border p-8 shadow-2xl text-left">
          {/* Tabs */}
          <div className="flex bg-canvas-subtle rounded-xl p-1 mb-6">
            {(['create', 'join'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t ? 'bg-accent text-white' : 'text-fg-muted hover:text-fg'
                }`}>
                {t === 'create' ? '✦ Create New' : '🔗 Join via Link'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <>
              <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                Workspace Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Acme Corp, My Team"
                className="w-full bg-canvas-subtle border border-border rounded-lg px-4 py-2.5
                           text-fg placeholder-fg-muted text-sm
                           focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 mb-1"
              />
              <p className="text-xs text-fg-subtle mb-4">
                This will create #general and #random channels automatically.
              </p>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                Invite Code or URL
              </label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Paste invite link or code here"
                className="w-full bg-canvas-subtle border border-border rounded-lg px-4 py-2.5
                           text-fg placeholder-fg-muted text-sm
                           focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 mb-4"
              />
            </>
          )}

          {error && <p className="text-danger text-sm mb-4 animate-fade-in">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold
                       py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><Spinner />{tab === 'create' ? 'Creating…' : 'Joining…'}</>
              : tab === 'create' ? 'Create Workspace' : 'Join Workspace'}
          </button>
        </div>

        <button onClick={actions.logout}
          className="mt-4 text-fg-muted text-xs hover:text-fg transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}
