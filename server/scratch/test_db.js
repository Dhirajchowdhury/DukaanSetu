require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../config/db');

async function test() {
  console.log("Supabase URL:", process.env.SUPABASE_URL);
  
  // 1. Fetch all users
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('*');
    
  if (uErr) {
    console.error("Error fetching users:", uErr);
    return;
  }
  
  console.log(`\n=== USERS IN DATABASE (${users.length}) ===`);
  users.forEach(u => {
    console.log(`ID: ${u.id} | Shop: ${u.shop_name} | Role: ${u.role} | Lat: ${u.latitude} | Lng: ${u.longitude}`);
  });
  
  // 2. Fetch wholesaler products
  const { data: products, error: pErr } = await supabase
    .from('wholesaler_products')
    .select('*');
    
  if (pErr) {
    console.error("Error fetching products:", pErr);
    return;
  }
  
  console.log(`\n=== PRODUCTS IN DATABASE (${products.length}) ===`);
  products.forEach(p => {
    console.log(`ID: ${p.id} | WholesalerID: ${p.wholesaler_id} | Product: ${p.product_name} | Stock: ${p.stock_available} | Price: ${p.price_per_unit}`);
  });

  // 3. Fetch connections
  const { data: conns, error: cErr } = await supabase
    .from('connections')
    .select('*');

  if (cErr) {
    console.error("Error fetching connections:", cErr);
    return;
  }

  console.log(`\n=== CONNECTIONS IN DATABASE (${conns.length}) ===`);
  conns.forEach(c => {
    console.log(`ID: ${c.id} | UserID: ${c.user_id} | ConnectedUserID: ${c.connected_user_id}`);
  });
}

test();
