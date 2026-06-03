const express = require('express');
const { getConnections, createConnection, updateConnection } = require('../controllers/connection.controller');
const { protect } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();
router.use(protect);

router.get('/', getConnections);
router.post('/:userId', logActivity('create', 'connection', null, (req) => `Connection request sent to user ${req.params.userId}`), createConnection);
router.put('/:id', logActivity('update', 'connection', null, (req) => `Connection ${req.params.id} ${req.body.status}`), updateConnection);

module.exports = router;
