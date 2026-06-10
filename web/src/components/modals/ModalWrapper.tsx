'use client';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function ModalWrapper({ title, onClose, children, size = 'md' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />

      {/* Modal */}
      <div
        ref={ref}
        className={cn(
          'relative w-full rounded-xl bg-white dark:bg-[#1a1d21] shadow-2xl',
          'animate-scale-in border border-[#ddd] dark:border-[#565856]',
          widthClass
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ddd] dark:border-[#565856]">
          <h2 className="text-lg font-bold text-[#1D1C1D] dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#616061] dark:text-[#ababad]
                       hover:text-[#1D1C1D] dark:hover:text-white hover:bg-[#f4f4f4] dark:hover:bg-[#3b3b3d] transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
