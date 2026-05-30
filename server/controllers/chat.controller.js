const { supabase } = require('../config/db');

/**
 * Get or create a conversation between two users.
 * Ensures user1_id < user2_id to satisfy the UNIQUE constraint.
 */
const getOrCreateConversation = async (userA, userB) => {
  const [user1_id, user2_id] = [userA, userB].sort();

  // Try to find existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user1_id, user2_id })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
};

/**
 * @desc  Get or create conversation with another user (Connection enforced)
 * @route POST /api/conversations
 */
const startConversation = async (req, res, next) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: 'otherUserId is required' });
    if (otherUserId === req.user.id) return res.status(400).json({ message: 'Cannot chat with yourself' });

    // Verify connection exists before allowing chat initialization
    const [u1, u2] = [req.user.id, otherUserId].sort();
    const { data: conn, error: connErr } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .maybeSingle();

    if (connErr) throw connErr;
    if (!conn) {
      return res.status(403).json({ message: 'You can only message users you are connected with.' });
    }

    const conversationId = await getOrCreateConversation(req.user.id, otherUserId);

    // Fetch full conversation with other user info
    const { data: conv, error } = await supabase
      .from('conversations')
      .select(`
        id, created_at,
        user1:users!user1_id(id, shop_name, role, latitude, longitude, address, email),
        user2:users!user2_id(id, shop_name, role, latitude, longitude, address, email)
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    res.json({ conversation: conv });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  List all conversations for current user (only when active connection exists)
 * @route GET /api/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, created_at,
        user1:users!user1_id(id, shop_name, role, latitude, longitude, address, email),
        user2:users!user2_id(id, shop_name, role, latitude, longitude, address, email)
      `)
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get active connections for current user to filter conversations
    const { data: conns } = await supabase
      .from('connections')
      .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`);

    const connectedSet = new Set();
    (conns || []).forEach(c => {
      connectedSet.add(c.user_id === req.user.id ? c.connected_user_id : c.user_id);
    });

    const enriched = (data || [])
      .filter(conv => {
        const otherId = conv.user1.id === req.user.id ? conv.user2.id : conv.user1.id;
        return connectedSet.has(otherId);
      })
      .map(conv => {
        const partner = conv.user1.id === req.user.id ? conv.user2 : conv.user1;
        return {
          id: conv.id,
          createdAt: conv.created_at,
          user1: conv.user1,
          user2: conv.user2,
          partner
        };
      });

    res.json({ conversations: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get messages in a conversation
 * @route GET /api/messages/:conversationId
 */
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Verify user is part of this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const otherUserId = conv.user1_id === req.user.id ? conv.user2_id : conv.user1_id;

    // Enforce connection check
    const [u1, u2] = [req.user.id, otherUserId].sort();
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .maybeSingle();

    if (!conn) {
      return res.status(403).json({ message: 'You can only view messages of users you are connected with.' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, text, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: messages || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Send a message (connection gated)
 * @route POST /api/messages
 * body: { conversationId, otherUserId, text }
 */
const sendMessage = async (req, res, next) => {
  const crypto = require('crypto');
  const reqId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  console.log(`[API REQUEST ${reqId}] POST /api/messages body:`, req.body);

  try {
    const conversation_id = req.body.conversation_id || req.body.conversationId;
    const sender_id = req.body.sender_id || req.user?.id;
    const content = req.body.content || req.body.text || req.body.message;
    const otherUserId = req.body.otherUserId;

    let targetConvId = conversation_id;
    const messageText = content;

    if (!messageText?.trim()) {
      console.log(`[API REQUEST ${reqId}] Error: Message cannot be empty`);
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (!targetConvId && !otherUserId) {
      console.log(`[API REQUEST ${reqId}] Error: conversation_id or otherUserId is required`);
      return res.status(400).json({ message: 'conversation_id or otherUserId is required' });
    }

    let otherId = otherUserId;

    if (targetConvId) {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
        .eq('id', targetConvId)
        .maybeSingle();

      console.log(`[API REQUEST ${reqId}] Supabase conversation response:`, { conv, convErr });

      if (convErr) throw convErr;
      if (!conv) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      if (conv.user1_id !== sender_id && conv.user2_id !== sender_id) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      otherId = conv.user1_id === sender_id ? conv.user2_id : conv.user1_id;
    }

    // Verify connection exists between users
    const [u1, u2] = [sender_id, otherId].sort();
    const { data: conn, error: connErr } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .maybeSingle();

    console.log(`[API REQUEST ${reqId}] Supabase connection response:`, { conn, connErr });

    if (connErr) throw connErr;
    if (!conn) {
      return res.status(403).json({ message: 'You can only message users you are connected with.' });
    }

    if (!targetConvId) {
      // Auto-create conversation if it doesn't exist
      targetConvId = await getOrCreateConversation(sender_id, otherId);
      console.log(`[API REQUEST ${reqId}] Auto-created conversation:`, targetConvId);
    }

    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: targetConvId,
        sender_id:       sender_id,
        text:            messageText.trim(),
      })
      .select('id, text, sender_id, created_at')
      .single();

    console.log(`[API REQUEST ${reqId}] Supabase message insert response:`, { msg, msgErr });

    if (msgErr) throw msgErr;
    
    res.status(201).json({ 
      message: msg,
      conversation_id: targetConvId,
      sender_id: sender_id,
      content: msg.text
    });
  } catch (error) {
    console.error(`[API REQUEST ${reqId}] Error sending message:`, error);
    next(error);
  }
};

module.exports = {
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
};
