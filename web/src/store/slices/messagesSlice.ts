import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '@/lib/types';

interface MessagesState {
  messagesByChannel: Record<number, Message[]>;
  typingByChannel: Record<number, string[]>;
}

const initialState: MessagesState = {
  messagesByChannel: {},
  typingByChannel: {},
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<{ channelId: number; messages: Message[] }>) {
      state.messagesByChannel[action.payload.channelId] = action.payload.messages;
    },
    appendMessage(state, action: PayloadAction<Message>) {
      const msg = action.payload;
      const existing = state.messagesByChannel[msg.channel_id] ?? [];
      // Deduplicate by id in case of double delivery
      if (!existing.find(m => m.id === msg.id)) {
        state.messagesByChannel[msg.channel_id] = [...existing, msg];
      }
    },
    updateMessage(state, action: PayloadAction<Message>) {
      const msg = action.payload;
      const existing = state.messagesByChannel[msg.channel_id] ?? [];
      state.messagesByChannel[msg.channel_id] = existing.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
    },
    deleteMessage(state, action: PayloadAction<{ channelId: number; messageId: number }>) {
      const { channelId, messageId } = action.payload;
      const existing = state.messagesByChannel[channelId] ?? [];
      state.messagesByChannel[channelId] = existing.filter((m) => m.id !== messageId);
    },
    setTyping(state, action: PayloadAction<{ channelId: number; users: string[] }>) {
      state.typingByChannel[action.payload.channelId] = action.payload.users;
    },
    clearMessages(state) {
      state.messagesByChannel = {};
      state.typingByChannel = {};
    },
  },
});

export const {
  setMessages, appendMessage, updateMessage, deleteMessage, setTyping, clearMessages,
} = messagesSlice.actions;
export default messagesSlice.reducer;
