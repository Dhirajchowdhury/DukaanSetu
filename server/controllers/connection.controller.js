const { supabase } = require('../config/db');

/**
 * @desc  Get user's connections (instantly B2B bidirectional)
 * @route GET /api/connections
 */
const getConnections = async (req, res, next) => {
  try {
    const { data: conns, error } = await supabase
      .from('connections')
      .select(`
        id, created_at,
        user:users!user_id(id, shop_name, role, latitude, longitude, address, email),
        connected_user:users!connected_user_id(id, shop_name, role, latitude, longitude, address, email)
      `)
      .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = (conns || []).map(c => {
      const isUser = c.user.id === req.user.id;
      const otherUser = isUser ? c.connected_user : c.user;
      return {
        id: c.id,
        createdAt: c.created_at,
        otherUser
      };
    });

    res.json({ connections: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Instantly create connection (B2B LinkedIn-style, zero friction)
 * @route POST /api/connections/:userId
 */
const createConnection = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'Target userId is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    // Verify other user exists
    const { data: otherUser, error: otherErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (otherErr || !otherUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Sort IDs to ensure bidirectionality and store once
    const [u1, u2] = [req.user.id, userId].sort();

    // Check if duplicate connection exists
    const { data: existing, error: findErr } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .maybeSingle();

    if (findErr) throw findErr;

    if (existing) {
      return res.status(400).json({ message: 'You are already connected with this user' });
    }

    // Create the connection instantly (no accept/reject)
    const { data: connection, error: insertErr } = await supabase
      .from('connections')
      .insert({
        user_id: u1,
        connected_user_id: u2
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({
      message: 'Successfully connected',
      connection
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConnections,
  createConnection
};
