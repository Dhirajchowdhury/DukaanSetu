module.paths.push('d:/Projects/DukaanSetu/server/node_modules');
require('dotenv').config({ path: 'd:/Projects/DukaanSetu/server/.env' });
const { supabase } = require('d:/Projects/DukaanSetu/server/config/db');

async function checkColumns() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Query failed:', error);
  } else {
    console.log('✅ Query succeeded. Columns in products:', data.length > 0 ? Object.keys(data[0]) : 'No rows to inspect');
    // Let's also inspect the RPC place_order_tx definition or test an order validation
  }
  process.exit(0);
}

checkColumns();
