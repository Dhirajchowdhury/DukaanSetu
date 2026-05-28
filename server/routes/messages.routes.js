const express = require('express');
const { getMessages, sendMessage } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.post('/', sendMessage);
router.get('/:conversationId', getMessages);

module.exports = router;
