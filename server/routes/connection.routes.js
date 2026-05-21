const express = require('express');
const { getConnections, updateConnectionStatus } = require('../controllers/connection.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getConnections);
router.put('/:id', updateConnectionStatus);

module.exports = router;
