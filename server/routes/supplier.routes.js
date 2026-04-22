const express = require('express');
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  getNearbySuppliers
} = require('../controllers/supplier.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/nearby', getNearbySuppliers);

router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/:id')
  .get(getSupplier);

module.exports = router;
