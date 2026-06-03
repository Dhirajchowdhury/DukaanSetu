const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

let io = null;
const onlineUsers = new Map();            // userId → Set<socketId>
const userMessageTimestamps = new Map();  // userId → [ms timestamps]

// ── STEP 2: Persist online status to Supabase ──────────────────────────────
async function persistOnlineStatus(userId, isOnline) {
  try {
    await supabase
      .from('user_status')
      .upsert({
        user_id: userId,
        is_online: isOnline,
        last_seen: isOnline ? null : new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch (err) {
    console.error(`[socket] Failed to persist user ${userId} status:`, err.message);
  }
}

// ── STEP 1: Redis adapter (horizontal scaling) ────────────────────────────
async function setupRedisAdapter(io) {
  if (!process.env.REDIS_URL) {
    console.log('⚠️  REDIS_URL not set — Socket.IO running without Redis adapter (single server only)');
    return;
  }
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('🔌 Redis adapter enabled — Socket.IO horizontally scalable');
  } catch (err) {
    console.error('❌ Failed to setup Redis adapter:', err.message);
  }
}

// ── STEP 6: Backpressure — rate limit per user (10 msg/sec sliding window) ─
function checkRateLimit(userId) {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(userId) || [];
  const recent = timestamps.filter(t => now - t < 1000);
  if (recent.length >= 10) {
    return false;
  }
  recent.push(now);
  userMessageTimestamps.set(userId, recent);
  return true;
}

function setupSocket(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: ['https://dukaansetu.vercel.app', 'http://localhost:5173'],
      credentials: true,
    },
  });

  // Auth middleware
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

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // ── STEP 2: Track online + persist ───────────────────────────────────
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('user_online', { userId });
    persistOnlineStatus(userId, true);

    // Room management (track current room to leave before joining another)
    let currentRoom = null;

    socket.on('join_conversation', async (conversationId) => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (!conv || (conv.user1_id !== userId && conv.user2_id !== userId)) return;

      if (currentRoom && currentRoom !== conversationId) {
        socket.leave(currentRoom);
      }
      socket.join(conversationId);
      currentRoom = conversationId;
    });

    // ── STEP 4 + 6: Send message with dedup + rate limit ────────────────
    socket.on('send_message', async (data, ack) => {
      try {
        const { conversationId, content, senderId, clientMessageId } = data;

        if (!content?.trim() || !conversationId || !senderId) {
          if (ack) ack({ error: 'Missing required fields' });
          return;
        }

        // Backpressure check (STEP 6)
        if (!checkRateLimit(userId)) {
          if (ack) ack({ error: 'Rate limited. Please slow down.' });
          return;
        }

        // Dedup: check for existing message by client_message_id (STEP 4)
        if (clientMessageId) {
          const { data: existing } = await supabase
            .from('messages')
            .select('id, text, sender_id, created_at')
            .eq('client_message_id', clientMessageId)
            .maybeSingle();

          if (existing) {
            const normalized = {
              id: existing.id,
              content: existing.text,
              sender_id: existing.sender_id,
              created_at: existing.created_at,
            };
            io.to(conversationId).emit('receive_message', normalized);
            if (ack) ack({ ok: true, deduplicated: true });
            return;
          }
        }

        const { data: msg, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            text: content.trim(),
            ...(clientMessageId && { client_message_id: clientMessageId }),
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
          userMessageTimestamps.delete(userId); // clean up rate limit data
          io.emit('user_offline', { userId });
          // Persist offline status (STEP 2)
          persistOnlineStatus(userId, false);
        }
      }
    });
  });

  // Apply Redis adapter (STEP 1)
  setupRedisAdapter(io);

  return io;
}

function getIO() {
  return io;
}

module.exports = { setupSocket, setupRedisAdapter, onlineUsers, getIO };
