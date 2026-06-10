const PALETTE = [
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F59E0B', '#10B981', '#3B82F6', '#EF4444',
];

export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

export function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Returns a human-friendly display name, extracting the local part if name looks like an email. */
export function getDisplayName(displayName: string | undefined, username: string): string {
  const dn = displayName?.trim();
  if (dn) {
    // If display_name itself looks like an email (e.g. set to username at registration), extract local part
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dn) ? dn.split('@')[0] : dn;
  }
  if (username.includes('@')) return username.split('@')[0];
  return username;
}
