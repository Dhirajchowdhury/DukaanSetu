const express = require('express');
const { getConnections, createConnection, updateConnection } = require('../controllers/connection.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getConnections);
router.post('/:userId', createConnection);
router.put('/:id', updateConnection);

module.exports = router;
