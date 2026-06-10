'use client';
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatTime, cn } from '@/lib/utils';
import ModalWrapper from './ModalWrapper';

export default function DraftsModal() {
  const { state, actions } = useApp();
  const { drafts, org } = state;

  useEffect(() => {
    if (org) actions.loadDrafts(org.id);
  }, [org]);

  return (
    <ModalWrapper title="Drafts & sent" onClose={actions.closeModal} size="lg">
      <div className="space-y-2">
        <p className="text-sm text-[#616061] dark:text-[#ababad] -mt-2 mb-4">
          Messages you started but haven't sent
        </p>

        {drafts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-[#f4f4f4] dark:bg-[#3b3b3d] flex items-center justify-center mx-auto mb-4">
              <DraftIcon className="w-8 h-8 text-[#868686]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1D1C1D] dark:text-white mb-2">No drafts</h3>
            <p className="text-sm text-[#616061] dark:text-[#ababad] max-w-sm mx-auto">
              When you start typing a message but don't send it, it'll be saved here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {drafts.map(draft => (
              <div
                key={draft.id}
                className="p-4 rounded-lg border border-[#ddd] dark:border-[#565856] 
                           hover:bg-[#f8f8f8] dark:hover:bg-[#232529] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-[#616061] dark:text-[#ababad]">
                    {draft.channel_name && (
                      <>
                        <span>{draft.channel_is_private ? '🔒' : '#'}{draft.channel_name}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{formatTime(draft.updated_at)}</span>
                  </div>
                  <button
                    onClick={async () => {
                      await actions.saveDraft('', draft.channel_id, draft.dm_id, draft.thread_id);
                    }}
                    className="text-[#E01E5A] hover:text-[#c11d4e] text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-[15px] text-[#1D1C1D] dark:text-white line-clamp-3">
                  {draft.content}
                </p>
                {draft.channel_id && (
                  <button
                    onClick={() => {
                      const channel = state.channels.find(c => c.id === draft.channel_id);
                      if (channel) {
                        actions.setChannel(channel);
                        actions.closeModal();
                      }
                    }}
                    className="mt-2 text-sm text-[#1264A3] hover:underline"
                  >
                    Continue editing →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

function DraftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
