import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DirectMessage, DMMessage, SidebarView } from '@/lib/types';

interface DMsState {
  sidebarView: SidebarView;
  dms: DirectMessage[];
  activeDM: DirectMessage | null;
  dmMessages: DMMessage[];
}

const initialState: DMsState = {
  sidebarView: 'home',
  dms: [],
  activeDM: null,
  dmMessages: [],
};

const dmsSlice = createSlice({
  name: 'dms',
  initialState,
  reducers: {
    setSidebarView(state, action: PayloadAction<SidebarView>) {
      state.sidebarView = action.payload;
    },
    setDMs(state, action: PayloadAction<DirectMessage[]>) {
      state.dms = action.payload;
    },
    setActiveDM(state, action: PayloadAction<DirectMessage | null>) {
      state.activeDM = action.payload;
    },
    setDMMessages(state, action: PayloadAction<DMMessage[]>) {
      state.dmMessages = action.payload;
    },
    appendDMMessage(state, action: PayloadAction<DMMessage>) {
      const msg = action.payload;
      // Deduplicate by id
      if (!state.dmMessages.find(m => m.id === msg.id)) {
        state.dmMessages.push(msg);
      }
    },
    updateDMMessage(state, action: PayloadAction<DMMessage>) {
      const next = action.payload;
      const idx = state.dmMessages.findIndex((m) => m.id === next.id);
      if (idx !== -1) state.dmMessages[idx] = { ...state.dmMessages[idx], ...next };
    },
    deleteDMMessage(state, action: PayloadAction<number>) {
      state.dmMessages = state.dmMessages.filter((m) => m.id !== action.payload);
    },
    clearDMs(state) {
      state.dms = [];
      state.activeDM = null;
      state.dmMessages = [];
    },
  },
});

export const {
  setSidebarView, setDMs, setActiveDM,
  setDMMessages, appendDMMessage, updateDMMessage, deleteDMMessage, clearDMs,
} = dmsSlice.actions;
export default dmsSlice.reducer;
