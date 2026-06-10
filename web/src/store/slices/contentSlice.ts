import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { StarredItem, Draft, Thread, Message } from '@/lib/types';

interface ContentState {
  starred: StarredItem[];
  drafts: Draft[];
  threads: Thread[];
  activeThread: Message | null;
  threadReplies: Message[];
}

const initialState: ContentState = {
  starred: [],
  drafts: [],
  threads: [],
  activeThread: null,
  threadReplies: [],
};

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    setStarred(state, action: PayloadAction<StarredItem[]>) {
      state.starred = action.payload;
    },
    addStarred(state, action: PayloadAction<StarredItem>) {
      state.starred.unshift(action.payload);
    },
    removeStarred(state, action: PayloadAction<{ itemType: string; itemId: number }>) {
      state.starred = state.starred.filter(
        i => !(i.item_type === action.payload.itemType && i.item_id === action.payload.itemId)
      );
    },
    setDrafts(state, action: PayloadAction<Draft[]>) {
      state.drafts = action.payload;
    },
    setThreads(state, action: PayloadAction<Thread[]>) {
      state.threads = action.payload;
    },
    setActiveThread(state, action: PayloadAction<Message | null>) {
      state.activeThread = action.payload;
    },
    setThreadReplies(state, action: PayloadAction<Message[]>) {
      state.threadReplies = action.payload;
    },
    appendThreadReply(state, action: PayloadAction<Message>) {
      state.threadReplies.push(action.payload);
    },
    clearContent(state) {
      state.starred = [];
      state.drafts = [];
      state.threads = [];
      state.activeThread = null;
      state.threadReplies = [];
    },
  },
});

export const {
  setStarred, addStarred, removeStarred,
  setDrafts, setThreads, setActiveThread,
  setThreadReplies, appendThreadReply, clearContent,
} = contentSlice.actions;
export default contentSlice.reducer;
