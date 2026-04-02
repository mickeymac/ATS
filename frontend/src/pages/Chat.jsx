import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../components/AppShell';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatArea from '../components/chat/ChatArea';
import { getContacts, getChatHistory, markAsRead } from '../services/chatService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChatContext } from '../context/ChatContext';

export default function Chat() {
  const { user } = useAuth();
  const { subscribe, emit } = useSocket();
  const { addToast } = useToast();
  const { fetchUnreadTotal } = useChatContext();

  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (error) {
      console.error(error);
      addToast('Failed to load contacts', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (activeContact) {
      loadHistory(activeContact.id);
    }
  }, [activeContact]);

  const loadHistory = async (contactId) => {
    try {
      const history = await getChatHistory(contactId);
      setMessages(history);
      await markAsRead(contactId);
      
      // Update local unread count
      setContacts(prev => prev.map(c => 
        c.id === contactId ? { ...c, unread_count: 0 } : c
      ));
      
      // Update global sidebar unread count
      fetchUnreadTotal();
    } catch (error) {
      console.error('Failed to load chat history', error);
      addToast('Failed to load chat history', 'error');
    }
  };

  useEffect(() => {
    // Socket listeners
    const unsubReceive = subscribe('chat:receive', (msg) => {
      console.log('Received message:', msg);
      // Check if message belongs to active chat (private or group)
      const isForActiveChat = activeContact && (
        (msg.group_id && msg.group_id === activeContact.id) || 
        (!msg.group_id && msg.sender_id === activeContact.id) ||
        (!msg.group_id && msg.sender_id === user?.id && msg.receiver_id === activeContact.id)
      );

      if (isForActiveChat) {
        setMessages(prev => [...prev, msg]);
        markAsRead(activeContact.id).then(() => fetchUnreadTotal());
      } else {
        // Update unread and last message in contacts list
        const targetId = msg.group_id || msg.sender_id;
        setContacts(prev => prev.map(c => {
          if (c.id === targetId) {
            return {
              ...c,
              unread_count: c.id === activeContact?.id ? 0 : c.unread_count + 1,
              last_message: msg.message_text || (msg.file_type ? `Sent a ${msg.file_type}` : ''),
              last_message_time: msg.timestamp
            };
          }
          return c;
        }));
      }
    });

    const unsubSent = subscribe('chat:sent', (msg) => {
      // For private messages, we update UI here. Group messages are handled via unsubReceive.
      if (activeContact && !msg.group_id && msg.receiver_id === activeContact.id) {
        setMessages(prev => [...prev, msg]);
      }
      
      const targetId = msg.group_id || msg.receiver_id;
      setContacts(prev => prev.map(c => {
        if (c.id === targetId) {
          return {
            ...c, 
            last_message: msg.message_text || (msg.file_type ? `Sent a ${msg.file_type}` : ''),
            last_message_time: msg.timestamp
          };
        }
        return c;
      }));
    });

    const unsubStatus = subscribe('user:status', (data) => {
      setContacts(prev => prev.map(c => 
        c.id === data.user_id 
          ? { ...c, is_online: data.is_online, last_seen: data.last_seen || c.last_seen }
          : c
      ));
      if (activeContact && activeContact.id === data.user_id) {
        setActiveContact(prev => ({ ...prev, is_online: data.is_online, last_seen: data.last_seen || prev.last_seen }));
      }
    });
    
    const unsubTyping = subscribe('chat:typing', (data) => {
      if (data.is_typing) {
        setIsTyping(true);
        setTypingUser(data.sender_id);
      } else {
        if (typingUser === data.sender_id) {
          setIsTyping(false);
          setTypingUser(null);
        }
      }
    });

    const unsubDeleted = subscribe('chat:deleted', (data) => {
      if (data.mode === 'everyone') {
        setMessages(prev => prev.map(m => 
          (String(m._id) === String(data.message_id) || String(m.id) === String(data.message_id))
            ? { ...m, is_deleted_for_everyone: true, message_text: "This message was deleted", file_url: null }
            : m
        ));
      } else {
        setMessages(prev => prev.filter(m => String(m._id) !== String(data.message_id) && String(m.id) !== String(data.message_id)));
      }
    });

    const unsubCleared = subscribe('chat:cleared', (data) => {
      // If the current active chat was cleared, wipe the message log purely on UI
      if (activeContact && String(activeContact.id) === String(data.contact_id)) {
        setMessages([]);
      }
      // Wipe the contact preview data
      setContacts(prev => prev.map(c => 
        String(c.id) === String(data.contact_id) 
          ? { ...c, unread_count: 0, last_message: null, last_message_time: null } 
          : c
      ));
    });

    const unsubGroupUpdated = subscribe('chat:group_updated', (data) => {
      fetchContacts();
      if (activeContact && String(activeContact.id) === String(data.group_id)) {
        // Refresh active contact settings
        getContacts().then(all => {
           const updated = all.find(c => String(c.id) === String(data.group_id));
           if (updated) setActiveContact(updated);
        });
      }
    });

    const unsubMembershipRevoked = subscribe('chat:membership_revoked', (data) => {
      fetchContacts();
      if (activeContact && String(activeContact.id) === String(data.group_id)) {
        setActiveContact(null);
        addToast('You have been removed from the group', 'warning');
      }
    });

    return () => {
      unsubReceive();
      unsubSent();
      unsubStatus();
      unsubTyping();
      unsubDeleted();
      unsubCleared();
      unsubGroupUpdated();
      unsubMembershipRevoked();
    };
  }, [activeContact, subscribe, typingUser]);

  const handleSendMessage = (text, fileData = null) => {
    if (!activeContact) return;
    const payload = {};
    if (activeContact.type === 'group') {
      payload.group_id = activeContact.id;
    } else {
      payload.receiver_id = activeContact.id;
    }
    
    if (text) payload.message_text = text;
    if (fileData) {
      payload.file_url = fileData.file_url;
      payload.file_type = fileData.file_type;
      payload.file_name = fileData.file_name;
    }
    emit('chat:send', payload);
  };

  const handleDeleteMessage = async (messageId, mode = 'me') => {
    if (!messageId) return;
    try {
      emit('chat:delete', { 
        message_id: messageId, 
        receiver_id: activeContact.type !== 'group' ? activeContact.id : null,
        group_id: activeContact.type === 'group' ? activeContact.id : null,
        mode: mode 
      });
    } catch (err) {
      console.error(err);
      addToast('Failed to delete message', 'error');
    }
  };

  const handleClearChat = () => {
    if (!activeContact) return;
    try {
      if (activeContact.type === 'group') {
        emit('chat:clear', { group_id: activeContact.id });
      } else {
        emit('chat:clear', { receiver_id: activeContact.id });
      }
      addToast('Chat history cleared', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to clear chat', 'error');
    }
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-zinc-950 rounded-xl overflow-hidden shadow-md border border-default-200 mt-2">
        <ChatSidebar 
          contacts={contacts} 
          activeContactId={activeContact?.id} 
          onSelectContact={setActiveContact}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onGroupCreated={fetchContacts}
        />
        <ChatArea 
          contact={activeContact} 
          messages={messages} 
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onClearChat={handleClearChat}
          isTyping={isTyping}
          typingUser={typingUser}
          contacts={contacts} // To allow adding new members to groups
        />
      </div>
    </AppShell>
  );
}
