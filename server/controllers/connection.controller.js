const { supabase } = require('../config/db');

/**
 * @desc  Get user's connections (both pending and accepted)
 * @route GET /api/connections
 */
const getConnections = async (req, res, next) => {
  try {
    const { data: conns, error } = await supabase
      .from('connections')
      .select(`
        id, status, initiator_id, created_at,
        shop_owner:users!shop_owner_id(id, shop_name, role, latitude, longitude, address, email),
        wholesaler:users!wholesaler_id(id, shop_name, role, latitude, longitude, address, email)
      `)
      .or(`shop_owner_id.eq.${req.user.id},wholesaler_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = (conns || []).map(c => {
      const isShopOwner = c.shop_owner.id === req.user.id;
      const otherUser = isShopOwner ? c.wholesaler : c.shop_owner;
      return {
        id: c.id,
        status: c.status,
        initiatorId: c.initiator_id,
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
 * @desc  Update connection status (accept/reject)
 * @route PUT /api/connections/:id
 * body: { status: 'accepted' | 'rejected' }
 */
const updateConnectionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted or rejected.' });
    }

    // Fetch connection details
    const { data: conn, error: findErr } = await supabase
      .from('connections')
      .select('id, shop_owner_id, wholesaler_id, initiator_id')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !conn) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    // Verify membership
    if (conn.shop_owner_id !== req.user.id && conn.wholesaler_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this connection' });
    }

    // Check if the current user is the initiator
    if (conn.initiator_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot approve or reject your own connection request' });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('connections')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({
      message: `Connection request ${status === 'accepted' ? 'accepted' : 'rejected'} successfully`,
      connection: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConnections,
  updateConnectionStatus
};
