const { supabase } = require('../config/db');

/**
 * @desc  Get all categories (default + user's custom)
 * @route GET /api/categories
 */
const getCategories = async (req, res, next) => {
  try {
    // Fetch default categories + this user's custom ones
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${req.user.id}`)
      .order('is_default', { ascending: false })
      .order('name',       { ascending: true });

    if (error) throw error;

    // Normalise to camelCase for frontend
    res.json({
      categories: categories.map(c => ({
        _id:       c.id,
        id:        c.id,
        name:      c.name,
        icon:      c.icon,
        isDefault: c.is_default,
        userId:    c.user_id,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Create custom category
 * @route POST /api/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, icon } = req.body;

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        user_id:    req.user.id,
        name:       name.trim(),
        icon:       icon || '📦',
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Category created successfully',
      category: {
        _id:       category.id,
        id:        category.id,
        name:      category.name,
        icon:      category.icon,
        isDefault: category.is_default,
        userId:    category.user_id,
        createdAt: category.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update category
 * @route PUT /api/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    // Verify ownership and that it's not a default category
    const { data: existing, error: fetchErr } = await supabase
      .from('categories')
      .select('id, is_default, user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (existing.is_default) {
      return res.status(403).json({ message: 'Cannot update default categories' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.icon) updates.icon = req.body.icon;

    const { data: category, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Category updated successfully',
      category: {
        _id:       category.id,
        id:        category.id,
        name:      category.name,
        icon:      category.icon,
        isDefault: category.is_default,
        userId:    category.user_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete category
 * @route DELETE /api/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('categories')
      .select('id, is_default, user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (existing.is_default) {
      return res.status(403).json({ message: 'Cannot delete default categories' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if any products reference this category
    const { count, error: countErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', req.params.id);

    if (countErr) throw countErr;

    if (count > 0) {
      return res.status(400).json({
        message: `Cannot delete category. ${count} product(s) are using it.`,
      });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

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
