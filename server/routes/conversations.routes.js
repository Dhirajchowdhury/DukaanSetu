const express = require('express');
const { getConversations, startConversation } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getConversations);
router.post('/', startConversation);

module.exports = router;
