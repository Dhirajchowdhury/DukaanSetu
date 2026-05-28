module.paths.push('d:/Projects/DukaanSetu/server/node_modules');
require('dotenv').config({ path: 'd:/Projects/DukaanSetu/server/.env' });
const { supabase } = require('d:/Projects/DukaanSetu/server/config/db');

async function runSql() {
  console.log('Attempting to execute SQL migration via RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER;' 
  });

  if (error) {
    console.error('❌ SQL execution failed:', error.message, error.details || '');
    console.log('No generic exec_sql RPC available. The user will run the alter table DDL in the Supabase Dashboard SQL Editor.');
  } else {
    console.log('✅ SQL execution succeeded! Table altered:', data);
  }
  process.exit(0);
}

runSql();
