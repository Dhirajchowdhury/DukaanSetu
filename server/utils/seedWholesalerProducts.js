require('dotenv').config();
const { supabase } = require('../config/db');

const SAMPLE_PRODUCTS = [
  {
    product_name: 'Premium Basmati Rice (Dehraduni)',
    category: 'Pulses & Grains',
    price_per_unit: 85.00,
    moq: 10,
    stock_available: 250,
    unit: 'bags',
    location: 'Warehouse A, Kolkata',
    description: 'Long grain aromatic aged Basmati rice. Direct from millers in Dehradun. Moisture-controlled packaging.'
  },
  {
    product_name: 'Refined Sunflower Oil 5L Can',
    category: 'Oils & Ghee',
    price_per_unit: 620.00,
    moq: 5,
    stock_available: 120,
    unit: 'cans',
    location: 'Warehouse B, Howrah',
    description: 'Double refined sunflower oil rich in vitamins A, D & E. High smoke point, ideal for deep frying.'
  },
  {
    product_name: 'Organic Green Tea (Loose Leaf)',
    category: 'Beverages',
    price_per_unit: 180.00,
    moq: 20,
    stock_available: 450,
    unit: 'packs',
    location: 'Siliguri Depot, West Bengal',
    description: '100% organic loose leaf green tea handpicked from Darjeeling gardens. Rich in antioxidants.'
  },
  {
    product_name: 'Chocolate Chip Cookies (Family Pack)',
    category: 'Snacks & Biscuits',
    price_per_unit: 45.00,
    moq: 50,
    stock_available: 800,
    unit: 'packets',
    location: 'Warehouse A, Kolkata',
    description: 'Premium buttery chocolate chip cookies baked fresh daily. Perfect accompaniment for tea and snacks.'
  },
  {
    product_name: 'Premium Dishwashing Liquid 1L',
    category: 'Household Items',
    price_per_unit: 95.00,
    moq: 12,
    stock_available: 300,
    unit: 'bottles',
    location: 'Warehouse B, Howrah',
    description: 'High-efficiency grease cutting formula with fresh lemon fragrance. Soft on hands, tough on stains.'
  },
  {
    product_name: 'Gentle Hand Wash Dispenser 250ml',
    category: 'Personal Care',
    price_per_unit: 75.00,
    moq: 24,
    stock_available: 220,
    unit: 'dispensers',
    location: 'Warehouse A, Kolkata',
    description: 'Antibacterial hand wash enriched with aloe vera and essential oils. PH balanced for everyday use.'
  },
  {
    product_name: 'Unsalted Table Butter 500g',
    category: 'Dairy Products',
    price_per_unit: 240.00,
    moq: 10,
    stock_available: 150,
    unit: 'blocks',
    location: 'Warehouse B, Howrah',
    description: 'Pure cream unsalted table butter. Made from pasteurized milk. Keep refrigerated.'
  },
  {
    product_name: 'A4 Copier Paper 75GSM Bundle',
    category: 'Stationery',
    price_per_unit: 190.00,
    moq: 15,
    stock_available: 400,
    unit: 'reams',
    location: 'Depot C, Kolkata',
    description: 'High brightness premium quality 75gsm copier paper. Double sided printing capability.'
  }
];

async function seed() {
  try {
    console.log('🌱 Starting database seed script...');

    // 1. Fetch all sellers
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, shop_name, role')
      .neq('role', 'shop_owner');

    if (uErr) throw uErr;

    if (!users || users.length === 0) {
      console.log('⚠️ No Wholesalers, Distributors, or Producers found in the database. Please register some sellers first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} B2B seller accounts in DB.`);

    // 2. Clear old listings
    console.log('Clearing old wholesaler products...');
    const { error: dErr } = await supabase
      .from('wholesaler_products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // clear all

    if (dErr) throw dErr;
    console.log('✅ Old listings cleared.');

    // 3. Insert fresh seed products
    const seedRecords = [];
    users.forEach((user, index) => {
      // Seed 3-4 products for each user to give a rich discovery experience
      const offset = index % SAMPLE_PRODUCTS.length;
      for (let i = 0; i < 4; i++) {
        const prodIndex = (offset + i) % SAMPLE_PRODUCTS.length;
        const prodTemplate = SAMPLE_PRODUCTS[prodIndex];
        
        seedRecords.push({
          wholesaler_id: user.id,
          product_name: prodTemplate.product_name,
          category: prodTemplate.category,
          price_per_unit: prodTemplate.price_per_unit,
          moq: prodTemplate.moq,
          stock_available: prodTemplate.stock_available,
          unit: prodTemplate.unit,
          location: prodTemplate.location,
          description: prodTemplate.description
        });
      }
    });

    console.log(`Inserting ${seedRecords.length} fresh wholesaler products...`);
    const { data: inserted, error: iErr } = await supabase
      .from('wholesaler_products')
      .insert(seedRecords)
      .select();

    if (iErr) throw iErr;

    console.log(`✅ Seeding complete! Successfully seeded ${inserted.length} products into wholesaler_products.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
  process.exit(0);
}

seed();
