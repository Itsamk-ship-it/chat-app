'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';
import type { Channel } from '@/lib/types';

interface Props {
  onJoinChannel: (ch: Channel) => void;
}

export default function CreateChannelModal({ onJoinChannel }: Props) {
  const { state, actions } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const orgId = state.org?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !orgId) return;

    setLoading(true);
    setError('');

    try {
      const channel = await actions.createChannel(orgId, name.trim(), description.trim(), isPrivate);
      if (!channel) {
        setError('Failed to create channel');
        setLoading(false);
        return;
      }
      actions.closeModal();
      onJoinChannel(channel);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalWrapper title="Create a channel" onClose={actions.closeModal} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-[#616061] dark:text-[#ababad] -mt-2">
          Channels are where your team communicates. They're best when organized around a topic — #marketing, for example.
        </p>

        {/* Channel Name */}
        <div>
          <label className="block text-sm font-semibold text-[#1D1C1D] dark:text-white mb-2">Name</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#868686] text-lg">
              {isPrivate ? '🔒' : '#'}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. plan-budget"
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white dark:bg-[#222529]
                         border border-[#ddd] dark:border-[#565856]
                         text-[#1D1C1D] dark:text-white placeholder-[#868686]
                         focus:border-[#1264A3] focus:ring-2 focus:ring-[#1264A3]/20
                         outline-none transition-all"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-[#1D1C1D] dark:text-white mb-2">
            Description <span className="font-normal text-[#868686]">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#222529]
                       border border-[#ddd] dark:border-[#565856]
                       text-[#1D1C1D] dark:text-white placeholder-[#868686]
                       focus:border-[#1264A3] focus:ring-2 focus:ring-[#1264A3]/20
                       outline-none transition-all"
          />
        </div>

        {/* Visibility Toggle */}
        <div className="p-4 rounded-lg bg-[#f8f8f8] dark:bg-[#222529] border border-[#ddd] dark:border-[#565856]">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5',
                isPrivate ? 'bg-[#007A5A]' : 'bg-[#dddddd] dark:bg-[#565856]'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  isPrivate ? 'left-6' : 'left-1'
                )}
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1D1C1D] dark:text-white text-sm">Make private</span>
              </div>
              <p className="text-sm text-[#616061] dark:text-[#ababad] mt-1">
                {isPrivate
                  ? "This can't be undone. A private channel can only be viewed or joined by invitation."
                  : "When a channel is set to private, it can only be viewed or joined by invitation."
                }
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={actions.closeModal}
            className="px-4 py-2.5 rounded-lg text-[#1D1C1D] dark:text-white font-medium
                       border border-[#ddd] dark:border-[#565856]
                       hover:bg-[#f4f4f4] dark:hover:bg-[#3b3b3d] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-4 py-2.5 rounded-lg bg-[#007A5A] hover:bg-[#148567] text-white
                       font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
