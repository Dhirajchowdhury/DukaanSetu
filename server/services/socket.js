const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

const onlineUsers = new Map();

function setupSocket(server) {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: ['https://dukaansetu.vercel.app', 'http://localhost:5173'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Track online user
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('user_online', { userId });

    // Track current room so we can leave before joining another
    let currentRoom = null;

    // Join conversation room
    socket.on('join_conversation', async (conversationId) => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (!conv || (conv.user1_id !== userId && conv.user2_id !== userId)) return;

      // Leave previous room to prevent message leaks
      if (currentRoom && currentRoom !== conversationId) {
        socket.leave(currentRoom);
      }
      socket.join(conversationId);
      currentRoom = conversationId;
    });

    // Send message
    socket.on('send_message', async (data, ack) => {
      try {
        const { conversationId, content, senderId } = data;

        if (!content?.trim() || !conversationId || !senderId) {
          if (ack) ack({ error: 'Missing required fields' });
          return;
        }

        const { data: msg, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            text: content.trim(),
          })
          .select('id, text, sender_id, created_at')
          .single();

        if (error) throw error;

        const normalizedMsg = {
          id: msg.id,
          content: msg.text,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
        };

        io.to(conversationId).emit('receive_message', normalizedMsg);
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error('[socket] send_message error:', err);
        if (ack) ack({ error: 'Failed to send message' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId });
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocket, onlineUsers };
