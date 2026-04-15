const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * @desc    Get all categories (default + user's custom)
 * @route   GET /api/categories
 * @access  Private
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      $or: [
        { isDefault: true },
        { userId: req.user._id },
      ],
    }).sort({ isDefault: -1, name: 1 });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create custom category
 * @route   POST /api/categories
 * @access  Private
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, icon } = req.body;

    const category = await Category.create({
      name,
      icon: icon || '📦',
      userId: req.user._id,
    });

    res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private
 */
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found or not authorized' });
    }

    if (category.isDefault) {
      return res.status(403).json({ message: 'Cannot update default categories' });
    }

    category.name = req.body.name || category.name;
    category.icon = req.body.icon || category.icon;
    await category.save();

    res.json({
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found or not authorized' });
    }

    if (category.isDefault) {
      return res.status(403).json({ message: 'Cannot delete default categories' });
    }

    // Check if any products use this category
    const productCount = await Product.countDocuments({
      categoryId: category._id,
    });

    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category. ${productCount} products are using it.`,
      });
    }

    await category.deleteOne();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
