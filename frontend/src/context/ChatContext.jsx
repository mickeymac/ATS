import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getGlobalUnreadCount } from '../services/chatService';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchUnreadTotal = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getGlobalUnreadCount();
      setUnreadTotal(data.count || 0);
    } catch (e) {
      console.error('Failed to fetch unread total', e);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadTotal();
  }, [fetchUnreadTotal]);

  const incrementUnread = useCallback(() => {
    setUnreadTotal(prev => prev + 1);
  }, []);

  const decrementUnread = useCallback((amount = 1) => {
    setUnreadTotal(prev => Math.max(0, prev - amount));
  }, []);

  return (
    <ChatContext.Provider value={{ unreadTotal, setUnreadTotal, fetchUnreadTotal, incrementUnread, decrementUnread }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
