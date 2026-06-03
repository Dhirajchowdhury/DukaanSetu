const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activityLogger');
const { getFeedback, createFeedback, deleteFeedback, getFeedbackStats } = require('../controllers/feedback.controller');

const router = express.Router();
router.use(protect);

router.get('/', getFeedback);
router.get('/stats', getFeedbackStats);
router.post('/', logActivity('create', 'feedback', null, () => 'Feedback submitted'), createFeedback);
router.delete('/:id', logActivity('delete', 'feedback', null, () => 'Feedback deleted'), deleteFeedback);

module.exports = router;
