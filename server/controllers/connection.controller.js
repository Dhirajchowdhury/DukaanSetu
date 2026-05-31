const { supabase } = require('../config/db');

/**
 * @desc  Get user's connections (both directions, with status)
 * @route GET /api/connections
 * @query status (pending|accepted|rejected)
 */
const getConnections = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('connections')
      .select(`
        id, status, created_at, updated_at,
        user:users!user_id(id, shop_name, role, latitude, longitude, address, email),
        connected_user:users!connected_user_id(id, shop_name, role, latitude, longitude, address, email)
      `)
      .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    const enriched = (data || []).map(c => {
      const isUser = c.user.id === req.user.id;
      const otherUser = isUser ? c.connected_user : c.user;
      return {
        id: c.id,
        status: c.status,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        otherUser,
        direction: isUser ? 'outgoing' : 'incoming',
      };
    });

    res.json({ connections: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Send a connection request (pending status)
 * @route POST /api/connections/:userId
 */
const createConnection = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ message: 'Target userId is required' });
    if (userId === req.user.id) return res.status(400).json({ message: 'You cannot connect with yourself' });

    const { data: otherUser, error: otherErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (otherErr || !otherUser) return res.status(404).json({ message: 'Target user not found' });

    const [u1, u2] = [req.user.id, userId].sort();

    const { data: existing } = await supabase
      .from('connections')
      .select('id, status')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ message: 'Already connected' });
      if (existing.status === 'pending') return res.status(400).json({ message: 'Connection request already sent' });
      if (existing.status === 'rejected') {
        // Re-send: update to pending
        const { data: updated } = await supabase
          .from('connections')
          .update({ status: 'pending' })
          .eq('id', existing.id)
          .select()
          .single();

        return res.status(200).json({ message: 'Connection request re-sent', connection: updated });
      }
    }

    const { data: connection, error: insertErr } = await supabase
      .from('connections')
      .insert({ user_id: u1, connected_user_id: u2, status: 'pending' })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({ message: 'Connection request sent', connection });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Accept or reject a connection request
 * @route PUT /api/connections/:id
 */
const updateConnection = async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['accepted', 'rejected'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID.join(', ')}` });
    }

    const { data: existing } = await supabase
      .from('connections')
      .select('id, user_id, connected_user_id, status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ message: 'Connection not found' });

    // Only the recipient (connected_user_id) can accept/reject
    if (existing.connected_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the recipient can accept or reject this request' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ message: `Connection already ${existing.status}` });
    }

    const { data: connection, error } = await supabase
      .from('connections')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    const msg = status === 'accepted' ? 'Connection accepted' : 'Connection rejected';
    res.json({ message: msg, connection });
  } catch (error) {
    next(error);
  }
};

module.exports = { getConnections, createConnection, updateConnection };
