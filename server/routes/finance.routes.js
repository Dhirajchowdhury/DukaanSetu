const express = require('express');
const {
  getProfitMargins,
  getCreditAccount,
  createCreditAccount,
  repayCredit,
  getFinanceDashboard,
  exportFinanceCSV,
} = require('../controllers/finance.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/margins', getProfitMargins);
router.get('/credit', getCreditAccount);
router.post('/credit', createCreditAccount);
router.post('/credit/repay', repayCredit);
router.get('/dashboard', getFinanceDashboard);
router.get('/export', exportFinanceCSV);

module.exports = router;
