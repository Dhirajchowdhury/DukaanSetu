const express = require('express');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const { protect } = require('../middleware/auth.middleware');
const { categoryValidation, validate } = require('../middleware/validation.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCategories)
  .post(categoryValidation, validate, createCategory);

router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

module.exports = router;
