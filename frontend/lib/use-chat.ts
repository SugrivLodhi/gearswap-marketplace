import { useState, useEffect, useCallback } from 'react';
import { getSocket } from './socket-client';
import { useAuth, UserRole } from './auth-context';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  createdAt: string;
}

export function useChat(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, token } = useAuth();
  const socket = getSocket();

  useEffect(() => {
    if (!roomId || !isAuthenticated || !token) return;

    // Connect if not already connected
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_room', { roomId });
      socket.emit('fetch_history', { roomId });
    };

    const onDisconnect = () => setIsConnected(false);

    const onMessageHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    const onNewMessage = (msg: ChatMessage) => {
      // Only append if it belongs to this room
      if (msg.roomId === roomId) {
        setMessages((prev) => {
          // Prevent duplicates (socket vs rest history)
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message_history', onMessageHistory);
    socket.on('new_message', onNewMessage);

    // If already connected before this effect ran
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message_history', onMessageHistory);
      socket.off('new_message', onNewMessage);
    };
  }, [roomId, isAuthenticated, token, socket]);

  const sendMessage = useCallback((content: string) => {
    if (!socket.connected || !roomId || !content.trim()) return;
    socket.emit('send_message', { roomId, content });
  }, [roomId, socket]);

  return { messages, isConnected, sendMessage };
}
