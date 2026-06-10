'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message, DMMessage } from '@/lib/types';

/** Same localhost-detection logic as api.ts – if the env URL points to
 *  localhost but we're deployed, connect to the current page origin instead. */
function getSocketUrl(): string | undefined {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env) {
    const envIsLocal = env.includes('localhost') || env.includes('127.0.0.1');
    if (envIsLocal && typeof window !== 'undefined') {
      const host = window.location.hostname;
      const pageIsLocal = host === 'localhost' || host === '127.0.0.1';
      if (!pageIsLocal) return undefined; // socket.io defaults to current origin
    }
    return env;
  }
  return process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001';
}

interface Callbacks {
  onMessageHistory: (channelId: number, messages: Message[]) => void;
  onNewMessage:     (msg: Message) => void;
  onMessageUpdated: (msg: Message) => void;
  onMessageDeleted: (channelId: number, messageId: number) => void;
  onTypingStart:    (username: string, channelId: number) => void;
  onTypingStop:     (username: string, channelId: number) => void;
  onNewDMMessage:   (msg: DMMessage) => void;
  onDMMessageUpdated: (msg: DMMessage) => void;
  onDMMessageDeleted: (messageId: number) => void;
  onConnected:      () => void;
  onDisconnected:   () => void;
  onAuthError:      () => void;
}

export default function useSocket(token: string | null, callbacks: Callbacks) {
  const socketRef = useRef<Socket | null>(null);
  const cbRef     = useRef(callbacks);
  const joinedChannelRef = useRef<number | null>(null);
  cbRef.current   = callbacks;

  useEffect(() => {
    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/api/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => cbRef.current.onConnected());
    socket.on('disconnect', () => cbRef.current.onDisconnected());
    socket.on('connect_error', (e) => {
      if (e.message === 'Authentication required' || e.message === 'Invalid token')
        cbRef.current.onAuthError();
    });

    socket.on('message_history', ({ channelId, messages }: { channelId: number; messages: Message[] }) =>
      cbRef.current.onMessageHistory(channelId, messages)
    );
    socket.on('new_message', (msg: Message) =>
      cbRef.current.onNewMessage(msg)
    );
    socket.on('message_updated', (msg: Message) =>
      cbRef.current.onMessageUpdated(msg)
    );
    socket.on('message_deleted', ({ channel_id, id }: { channel_id: number; id: number }) =>
      cbRef.current.onMessageDeleted(channel_id, id)
    );
    socket.on('user_typing', ({ username, channelId }: { username: string; channelId: number }) =>
      cbRef.current.onTypingStart(username, channelId)
    );
    socket.on('user_stop_typing', ({ username, channelId }: { username: string; channelId: number }) =>
      cbRef.current.onTypingStop(username, channelId)
    );
    socket.on('new_dm_message', (msg: DMMessage) =>
      cbRef.current.onNewDMMessage(msg)
    );
    socket.on('dm_message_updated', (msg: DMMessage) =>
      cbRef.current.onDMMessageUpdated(msg)
    );
    socket.on('dm_message_deleted', ({ id }: { id: number }) =>
      cbRef.current.onDMMessageDeleted(id)
    );

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const joinChannel = useCallback((channelId: number) => {
    joinedChannelRef.current = channelId;
    socketRef.current?.emit('join_channel', { channelId });
  }, []);

  const sendMessage = useCallback((channelId: number, content: string) => {
    // Ensure we're joined before sending so sender also receives realtime events.
    if (joinedChannelRef.current !== channelId) {
      joinedChannelRef.current = channelId;
      socketRef.current?.emit('join_channel', { channelId });
    }
    socketRef.current?.emit('send_message', { channelId, content });
  }, []);

  const startTyping = useCallback((channelId: number) => {
    socketRef.current?.emit('typing_start', { channelId });
  }, []);

  const stopTyping = useCallback((channelId: number) => {
    socketRef.current?.emit('typing_stop', { channelId });
  }, []);

  return { joinChannel, sendMessage, startTyping, stopTyping };
}
