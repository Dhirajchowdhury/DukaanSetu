const { supabase } = require('../config/db');

const getActivityLogs = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, action: actionFilter, dateFrom, dateTo } = req.query;

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user:users!user_id(id, shop_name, email, role)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (actionFilter) {
      query = query.eq('action', actionFilter);
    }
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      query = query.lte('created_at', new Date(dateTo).toISOString());
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      logs: (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        user: log.user ? { id: log.user.id, shopName: log.user.shop_name, email: log.user.email, role: log.user.role } : null,
        userRole: log.user_role,
        action: log.action,
        entity: log.entity,
        entityId: log.entity_id,
        description: log.description,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
      })),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActivityLogs };
