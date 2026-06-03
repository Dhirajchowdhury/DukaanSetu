require('dotenv').config({ path: 'd:/Projects/DukaanSetu/server/.env' });
const { supabase } = require('../config/db');

async function inspect() {
  console.log('Inspecting DB tables...');
  
  // Inspect orders
  try {
    const { data: oData, error: oErr } = await supabase.from('orders').select('*').limit(1);
    if (oErr) console.error('Error orders:', oErr);
    else console.log('orders columns:', oData.length > 0 ? Object.keys(oData[0]) : 'Empty table, query successful');
  } catch (err) {
    console.error(err);
  }

  // Inspect order_items
  try {
    const { data: oiData, error: oiErr } = await supabase.from('order_items').select('*').limit(1);
    if (oiErr) console.error('Error order_items:', oiErr);
    else console.log('order_items columns:', oiData.length > 0 ? Object.keys(oiData[0]) : 'Empty table, query successful');
  } catch (err) {
    console.error(err);
  }

  // Inspect wholesaler_products
  try {
    const { data: wpData, error: wpErr } = await supabase.from('wholesaler_products').select('*').limit(1);
    if (wpErr) console.error('Error wholesaler_products:', wpErr);
    else console.log('wholesaler_products columns:', wpData.length > 0 ? Object.keys(wpData[0]) : 'Empty table, query successful');
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
}

inspect();
