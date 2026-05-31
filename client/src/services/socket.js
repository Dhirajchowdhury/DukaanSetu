import { io } from 'socket.io-client';
import { API_URL } from '../config/api';

let socket = null;

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

  return socket;
}

export function disconnectSocket() {
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

export function sendMessage(data) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socket.emit('send_message', data, (response) => {
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
