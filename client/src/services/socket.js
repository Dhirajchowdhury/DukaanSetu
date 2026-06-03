import { io } from 'socket.io-client';
import { API_URL } from '../config/api';

let socket = null;
let reconnectHandlers = [];

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    timeout: 5000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[socket] Disconnected:', reason);
  });

  socket.on('connect', () => {
    console.log('[socket] Connected / Reconnected');
    reconnectHandlers.forEach(fn => fn());
    stockUpdateHandlers.forEach(fn => socket.on('stock:updated', fn));
  });

  return socket;
}

export function onReconnect(handler) {
  reconnectHandlers.push(handler);
  return () => {
    reconnectHandlers = reconnectHandlers.filter(h => h !== handler);
  };
}

export function disconnectSocket() {
  reconnectHandlers = [];
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinConversation(conversationId) {
  if (socket?.connected) {
    socket.emit('join_conversation', conversationId);
  }
}

// STEP 3: ACK with 5s timeout
export function sendMessage(data) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socket.timeout(5000).emit('send_message', data, (err, response) => {
      if (err) {
        reject(new Error(err.message || 'Socket ACK timeout'));
        return;
      }
      if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

export function onMessage(handler) {
  if (socket) {
    socket.off('receive_message');
    socket.on('receive_message', handler);
  }
}

export function offMessage() {
  if (socket) {
    socket.off('receive_message');
  }
}

export function isConnected() {
  return socket?.connected ?? false;
}

let stockUpdateHandlers = [];

export function onStockUpdated(handler) {
  stockUpdateHandlers.push(handler);
  if (socket) {
    socket.on('stock:updated', handler);
  }
  return () => {
    stockUpdateHandlers = stockUpdateHandlers.filter(h => h !== handler);
    if (socket) {
      socket.off('stock:updated', handler);
    }
  };
}

export function onAnyEvent(event, handler) {
  if (socket) {
    socket.on(event, handler);
  }
  return () => {
    if (socket) {
      socket.off(event, handler);
    }
  };
}

// Re-register stock handlers on reconnect
const origOnReconnect = onReconnect;
export { origOnReconnect };
