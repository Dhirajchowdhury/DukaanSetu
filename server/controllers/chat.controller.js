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
 * @desc  Get or create conversation with another user
 * @route POST /api/chat/conversations
 * body: { otherUserId }
 */
const startConversation = async (req, res, next) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: 'otherUserId is required' });
    if (otherUserId === req.user.id) return res.status(400).json({ message: 'Cannot chat with yourself' });

    let connObj = null;

    // ── CONNECTION SYSTEM INTEGRATION ──
    const { data: otherUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', otherUserId)
      .single();

    if (otherUser) {
      let shop_owner_id = null;
      let wholesaler_id = null;

      if (req.user.role === 'shop_owner') {
        shop_owner_id = req.user.id;
        wholesaler_id = otherUserId;
      } else if (otherUser.role === 'shop_owner') {
        shop_owner_id = otherUserId;
        wholesaler_id = req.user.id;
      } else {
        const sorted = [req.user.id, otherUserId].sort();
        shop_owner_id = sorted[0];
        wholesaler_id = sorted[1];
      }

      // Check if connection exists
      const { data: existingConn } = await supabase
        .from('connections')
        .select('id, status, initiator_id')
        .eq('shop_owner_id', shop_owner_id)
        .eq('wholesaler_id', wholesaler_id)
        .maybeSingle();

      connObj = existingConn;

      if (!existingConn) {
        const { data: newConn, error: connErr } = await supabase
          .from('connections')
          .insert({
            shop_owner_id,
            wholesaler_id,
            status: 'pending',
            initiator_id: req.user.id
          })
          .select('id, status, initiator_id')
          .single();
        if (!connErr) {
          connObj = newConn;
        }
      }
    }
    // ── END CONNECTION INTEGRATION ──

    const conversationId = await getOrCreateConversation(req.user.id, otherUserId);

    // Fetch full conversation with other user info
    const { data: conv, error } = await supabase
      .from('conversations')
      .select(`
        id, created_at,
        user1:users!conversations_user1_id_fkey(id, shop_name, role),
        user2:users!conversations_user2_id_fkey(id, shop_name, role)
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;
    res.json({
      conversation: {
        ...conv,
        connection: connObj
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  List all conversations for current user
 * @route GET /api/chat/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, created_at,
        user1:users!conversations_user1_id_fkey(id, shop_name, role),
        user2:users!conversations_user2_id_fkey(id, shop_name, role)
      `)
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: conns } = await supabase
      .from('connections')
      .or(`shop_owner_id.eq.${req.user.id},wholesaler_id.eq.${req.user.id}`);

    const connMap = {};
    (conns || []).forEach(c => {
      const key = [c.shop_owner_id, c.wholesaler_id].sort().join('_');
      connMap[key] = { id: c.id, status: c.status, initiator_id: c.initiator_id };
    });

    const enriched = (data || []).map(conv => {
      const key = [conv.user1.id, conv.user2.id].sort().join('_');
      return {
        ...conv,
        connection: connMap[key] || null
      };
    });

    res.json({ conversations: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get messages in a conversation
 * @route GET /api/chat/conversations/:id/messages
 */
const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is part of this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id')
      .eq('id', id)
      .maybeSingle();

    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, message, sender_id, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: messages || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Send a message
 * @route POST /api/chat/conversations/:id/messages
 * body: { message }
 */
const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    // Verify membership
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id')
      .eq('id', id)
      .maybeSingle();

    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check connection status
    const otherUserId = conv.user1_id === req.user.id ? conv.user2_id : conv.user1_id;
    const { data: otherUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', otherUserId)
      .single();

    let shop_owner_id = null;
    let wholesaler_id = null;
    if (req.user.role === 'shop_owner') {
      shop_owner_id = req.user.id;
      wholesaler_id = otherUserId;
    } else if (otherUser?.role === 'shop_owner') {
      shop_owner_id = otherUserId;
      wholesaler_id = req.user.id;
    } else {
      const sorted = [req.user.id, otherUserId].sort();
      shop_owner_id = sorted[0];
      wholesaler_id = sorted[1];
    }

    const { data: conn } = await supabase
      .from('connections')
      .select('id, status, initiator_id')
      .eq('shop_owner_id', shop_owner_id)
      .eq('wholesaler_id', wholesaler_id)
      .maybeSingle();

    let connObj = conn;
    if (!conn) {
      const { data: newConn } = await supabase
        .from('connections')
        .insert({
          shop_owner_id,
          wholesaler_id,
          status: 'pending',
          initiator_id: req.user.id
        })
        .select('id, status, initiator_id')
        .single();
      connObj = newConn;
    }

    if (connObj && connObj.status === 'rejected') {
      return res.status(403).json({
        message: 'Connection request was rejected'
      });
    }

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id:       req.user.id,
        message:         message.trim(),
      })
      .select('id, message, sender_id, created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ message: msg });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
};
