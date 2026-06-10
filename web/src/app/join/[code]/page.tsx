'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Redirect to root with the code stored in sessionStorage
export default function JoinPage() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (code) sessionStorage.setItem('pendingJoinCode', code);
    router.replace('/');
  }, [code, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-canvas-base">
      <div className="text-fg-muted text-sm">Redirecting…</div>
    </div>
  );
}
