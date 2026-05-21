const express = require('express');
const { startConversation, getConversations, getMessages, sendMessage } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.post('/conversations',                    startConversation);
router.get('/conversations',                     getConversations);
router.get('/conversations/:id/messages',        getMessages);
router.post('/conversations/:id/messages',       sendMessage);

module.exports = router;
