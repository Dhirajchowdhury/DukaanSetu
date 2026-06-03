const { supabase } = require('../config/db');

const logActivity = (action, entity, entityId, description) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      try {
        await supabase.from('activity_logs').insert({
          user_id: req.user?.id || null,
          user_role: req.user?.role || null,
          action,
          entity,
          entity_id: entityId || req.params?.id || null,
          description: typeof description === 'function' ? description(req, body) : description,
          ip_address: req.ip || req.connection?.remoteAddress || null,
        });
      } catch (err) {
        console.error('Activity log error:', err.message);
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { logActivity };
