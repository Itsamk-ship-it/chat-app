'use client';
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatTime } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

export default function PinsModal() {
  const { state, actions } = useApp();
  const { starred, org } = state;

  useEffect(() => {
    if (org) actions.loadStarred(org.id);
  }, [org]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinnedMessages = starred.filter((s) => s.item_type === 'message' || s.item_type === 'dm');

  return (
    <ModalWrapper title="Pins" onClose={actions.closeModal} size="lg">
      <div className="space-y-2">
        {pinnedMessages.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#616061] dark:text-[#ababad]">
            No pinned messages yet
          </div>
        ) : (
          pinnedMessages.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-[#ddd] dark:border-[#565856] hover:bg-[#f8f8f8] dark:hover:bg-[#232529]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-[#616061] dark:text-[#ababad]">
                  <span className="font-medium text-[#1D1C1D] dark:text-white">
                    {item.display_name || item.username}
                  </span>
                  {item.channel_name && <span> in #{item.channel_name}</span>}
                  {item.item_type === 'dm' && <span> in Direct message</span>}
                </div>
                <span className="text-xs text-[#868686]">{item.created_at ? formatTime(item.created_at) : ''}</span>
              </div>
              <button
                  onClick={() => {
                    if (item.item_type === 'dm' && item.dm_id) {
                      const dm = state.dms.find((d) => d.id === item.dm_id);
                      if (dm) actions.openDM(dm);
                    } else if (item.channel_id) {
                      const channel = state.channels.find((c) => c.id === item.channel_id);
                      if (channel) actions.setChannel(channel);
                    }
                    actions.closeModal();
                  }}
                className="w-full text-left text-[15px] text-[#1D1C1D] dark:text-white"
              >
                {item.content}
              </button>
            </div>
          ))
        )}
      </div>
    </ModalWrapper>
  );
}
