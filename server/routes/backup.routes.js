const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { runBackup } = require('../scripts/backup');

const router = express.Router();
router.use(protect);

router.post('/', async (req, res, next) => {
  try {
    const result = await runBackup();
    res.json({ message: 'Backup created', ...result });
  } catch (error) { next(error); }
});

module.exports = router;
