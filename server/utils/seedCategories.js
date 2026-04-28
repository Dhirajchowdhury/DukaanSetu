/**
 * Seed default categories into Supabase.
 * Run once: node utils/seedCategories.js
 */
require('dotenv').config();
const { supabase, connectDB } = require('../config/db');

const DEFAULT_CATEGORIES = [
  { name: 'Soaps & Detergents', icon: '🧼', is_default: true },
  { name: 'Snacks & Biscuits',  icon: '🍪', is_default: true },
  { name: 'Beverages',          icon: '🥤', is_default: true },
  { name: 'Dairy Products',     icon: '🥛', is_default: true },
  { name: 'Pulses & Grains',    icon: '🌾', is_default: true },
  { name: 'Spices',             icon: '🌶️', is_default: true },
  { name: 'Personal Care',      icon: '💆', is_default: true },
  { name: 'Household Items',    icon: '🏠', is_default: true },
  { name: 'Oils & Ghee',        icon: '🛢️', is_default: true },
  { name: 'Stationery',         icon: '📝', is_default: true },
];

const seed = async () => {
  await connectDB();

  // Delete existing defaults first (idempotent)
  const { error: delErr } = await supabase
    .from('categories')
    .delete()
    .eq('is_default', true);

  if (delErr) {
    console.error('❌ Failed to clear existing defaults:', delErr.message);
    process.exit(1);
  }

  const { error: insertErr } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES);

  if (insertErr) {
    console.error('❌ Seed failed:', insertErr.message);
    process.exit(1);
  }

  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  process.exit(0);
};

seed();
