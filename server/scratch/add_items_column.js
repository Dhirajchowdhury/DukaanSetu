require('dotenv').config({ path: 'd:/Projects/DukaanSetu/server/.env' });
const { supabase } = require('../config/db');

async function runMigration() {
  console.log('Executing database migration...');
  
  // Alter orders table to add items JSONB column
  const sql = `
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ SQL execution failed:', error.message);
    console.log('It seems exec_sql is not available or failed. Let\'s try to run a direct raw query if possible or inform how to run it.');
  } else {
    console.log('✅ SQL migration successful! Added items JSONB column to orders table:', data);
  }
  process.exit(0);
}

runMigration();
