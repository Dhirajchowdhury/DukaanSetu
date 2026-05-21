const express = require('express');
const { createInquiry, getInquiries, updateInquiry } = require('../controllers/inquiry.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.post('/',      createInquiry);
router.get('/',       getInquiries);
router.put('/:id',    updateInquiry);

module.exports = router;
