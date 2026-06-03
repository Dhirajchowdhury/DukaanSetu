const express = require('express');
const {
  getRules, createRule, updateRule, deleteRule,
  getDraftOrders, resolveDraftOrder,
} = require('../controllers/reorder.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

// ── Reorder Rules ─────────────────────────────────────────────────────────────
router.get('/',      getRules);
router.post('/',     createRule);
router.put('/:id',   updateRule);
router.delete('/:id', deleteRule);

// ── Draft Orders ──────────────────────────────────────────────────────────────
router.get('/drafts',     getDraftOrders);
router.put('/drafts/:id', resolveDraftOrder);

module.exports = router;
