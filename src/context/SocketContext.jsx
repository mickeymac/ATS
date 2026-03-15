import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext(null);

// Socket.IO server URL
const SOCKET_URL = 'http://localhost:8000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  
  // Event listeners storage
  const listenersRef = useRef({});

  // Fetch the actual user_id from the API (MongoDB ObjectId)
  useEffect(() => {
    const fetchUserId = async () => {
      if (!user) {
        setUserId(null);
        return;
      }
      
      try {
        // First check if token has user_id
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.user_id) {
            console.log('[Socket] Got user_id from token:', payload.user_id);
            setUserId(payload.user_id);
            return;
          }
        }
        
        // Fallback: fetch from API to get the MongoDB _id
        const response = await api.get('/users/me');
        if (response.data && response.data._id) {
          console.log('[Socket] Got user_id from API:', response.data._id);
          setUserId(response.data._id);
        }
      } catch (e) {
        console.error('[Socket] Failed to get user ID:', e);
      }
    };
    
    fetchUserId();
  }, [user]);

  // Initialize socket connection once we have the userId
  useEffect(() => {
    if (!user || !userId) {
      // Disconnect if user logs out or no userId
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Don't reconnect if already connected with same userId
    if (socketRef.current?.connected) {
      return;
    }

    console.log('[Socket] Connecting with user_id:', userId);
    
    // Create socket connection with auth
    socketRef.current = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: {
        user_id: userId
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('[Socket] Cleaning up connection');
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, userId]);

  // Subscribe to an event
  const subscribe = useCallback((event, callback) => {
    if (!socketRef.current) return () => {};

    // Store callback reference
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);

    // Add listener to socket
    socketRef.current.on(event, callback);

    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
      const index = listenersRef.current[event]?.indexOf(callback);
      if (index > -1) {
        listenersRef.current[event].splice(index, 1);
      }
    };
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  }, [isConnected]);

  // Join a room
  const joinRoom = useCallback((room) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_room', { room });
    }
  }, [isConnected]);

  // Leave a room
  const leaveRoom = useCallback((room) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_room', { room });
    }
  }, [isConnected]);

  // Getter function for socket (to avoid accessing ref during render)
  const getSocket = useCallback(() => socketRef.current, []);

  const value = {
    isConnected,
    subscribe,
    emit,
    joinRoom,
    leaveRoom,
    getSocket  // Use getSocket() instead of socket directly
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Custom hook for subscribing to socket events with automatic cleanup
export const useSocketEvent = (event, callback) => {
  const { subscribe } = useSocket();
  
  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, subscribe]);
};

export default SocketContext;
