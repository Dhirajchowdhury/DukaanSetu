require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const connectDB = require('../config/db');

const defaultCategories = [
  { name: 'Soaps & Detergents', icon: '🧼', isDefault: true },
  { name: 'Snacks & Biscuits', icon: '🍪', isDefault: true },
  { name: 'Beverages', icon: '🥤', isDefault: true },
  { name: 'Dairy Products', icon: '🥛', isDefault: true },
  { name: 'Pulses & Grains', icon: '🌾', isDefault: true },
  { name: 'Spices', icon: '🌶️', isDefault: true },
  { name: 'Personal Care', icon: '💆', isDefault: true },
  { name: 'Household Items', icon: '🏠', isDefault: true },
  { name: 'Oils & Ghee', icon: '🛢️', isDefault: true },
  { name: 'Stationery', icon: '📝', isDefault: true },
];

const seedCategories = async () => {
  try {
    await connectDB();

    // Clear existing default categories
    await Category.deleteMany({ isDefault: true });

    // Insert default categories
    await Category.insertMany(defaultCategories);

    console.log('✅ Default categories seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
