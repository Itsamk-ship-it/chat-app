import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Channel, OrgMember } from '@/lib/types';

interface ChannelsState {
  channels: Channel[];
  channel: Channel | null;
  members: OrgMember[];
}

const initialState: ChannelsState = {
  channels: [],
  channel: null,
  members: [],
};

const channelsSlice = createSlice({
  name: 'channels',
  initialState,
  reducers: {
    setChannels(state, action: PayloadAction<Channel[]>) {
      state.channels = action.payload;
    },
    addChannel(state, action: PayloadAction<Channel>) {
      state.channels.push(action.payload);
    },
    updateChannel(state, action: PayloadAction<Channel>) {
      const idx = state.channels.findIndex(c => c.id === action.payload.id);
      if (idx !== -1) state.channels[idx] = action.payload;
      if (state.channel?.id === action.payload.id) state.channel = action.payload;
    },
    removeChannel(state, action: PayloadAction<number>) {
      state.channels = state.channels.filter(c => c.id !== action.payload);
      if (state.channel?.id === action.payload) state.channel = null;
    },
    setChannel(state, action: PayloadAction<Channel | null>) {
      state.channel = action.payload;
    },
    setMembers(state, action: PayloadAction<OrgMember[]>) {
      state.members = action.payload;
    },
    clearChannels(state) {
      state.channels = [];
      state.channel = null;
      state.members = [];
    },
  },
});

export const {
  setChannels, addChannel, updateChannel, removeChannel,
  setChannel, setMembers, clearChannels,
} = channelsSlice.actions;
export default channelsSlice.reducer;
