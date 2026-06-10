'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';

export default function AuthScreen() {
  const { actions } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!username.trim() || !password) { setError('Fill in all fields.'); return; }
    if (tab === 'register' && !displayName.trim()) { setError('Please enter your full name.'); return; }
    setLoading(true);
    try {
      const d = tab === 'login'
        ? await actions.login(username.trim(), password)
        : await actions.register(username.trim(), password, displayName.trim());
      if (!d) { setError(tab === 'login' ? 'Invalid credentials. If this is a new workspace, register first.' : 'Registration failed. Please try another username.'); setLoading(false); return; }

      actions.storeAuth(d.token, d.user);
      actions.setScreen('loading');

      const orgs = await actions.loadOrgs();
      if (orgs.length === 0) {
        actions.setScreen('create-org');
      } else {
        actions.setScreen('app');
        const channels = await actions.selectOrg(orgs[0]);
        if (channels.length) actions.setChannel(channels[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,#2563eb_0,#0f172a_45%,#020617_100%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-300/30 flex items-center justify-center">
            <ShieldIcon className="w-6 h-6 text-blue-200" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Orbit Teams</h1>
            <p className="text-blue-100/70 text-sm">Enterprise Collaboration Platform</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h2 className="text-5xl font-extrabold leading-tight">
            Secure teamwork,
            <br />
            designed for scale.
          </h2>
          <p className="text-blue-100/80 text-lg">
            Channels, threads, direct messaging, search, drafts, starred items, and workspace controls in one unified command center.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {['99.99% uptime', 'SOC-ready controls', 'Zero-friction onboarding'].map((item) => (
              <div key={item} className="rounded-xl bg-white/10 border border-white/20 p-3 text-sm font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-100/60 text-sm">
          © 2026 Orbit Teams. Built for modern enterprises.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/70 p-7">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Orbit Teams</h1>
              <p className="text-xs text-slate-500">Enterprise Collaboration Platform</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {tab === 'login' ? 'Sign in to your workspace' : 'Create your enterprise account'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {tab === 'login' ? 'Access your organization command center.' : 'Start collaborating with your team instantly.'}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`py-2 text-sm font-semibold rounded-lg transition ${tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`py-2 text-sm font-semibold rounded-lg transition ${tab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Register
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {tab === 'register' && (
              <Field label="Full Name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Jane Doe"
                  className={inputClass}
                />
              </Field>
            )}

            <Field label="Username">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="janedoe"
                autoComplete="username"
                className={inputClass}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className={inputClass}
              />
            </Field>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Please wait…' : tab === 'login' ? 'Continue to Workspace' : 'Create Account'}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
    </svg>
  );
}
