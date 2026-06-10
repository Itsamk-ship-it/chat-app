import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationsState {
  unreadChannels: number[];
  unreadDMs: number[];
}

const initialState: NotificationsState = {
  unreadChannels: [],
  unreadDMs: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    markChannelUnread(state, action: PayloadAction<number>) {
      if (!state.unreadChannels.includes(action.payload)) {
        state.unreadChannels.push(action.payload);
      }
    },
    markChannelRead(state, action: PayloadAction<number>) {
      state.unreadChannels = state.unreadChannels.filter(id => id !== action.payload);
    },
    markDMUnread(state, action: PayloadAction<number>) {
      if (!state.unreadDMs.includes(action.payload)) {
        state.unreadDMs.push(action.payload);
      }
    },
    markDMRead(state, action: PayloadAction<number>) {
      state.unreadDMs = state.unreadDMs.filter(id => id !== action.payload);
    },
    clearNotifications(state) {
      state.unreadChannels = [];
      state.unreadDMs = [];
    },
  },
});

export const {
  markChannelUnread, markChannelRead,
  markDMUnread, markDMRead, clearNotifications,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
