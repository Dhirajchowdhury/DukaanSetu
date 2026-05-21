module.paths.push('d:/Projects/DukaanSetu/server/node_modules');
require('dotenv').config({ path: 'd:/Projects/DukaanSetu/server/.env' });
const { supabase } = require('d:/Projects/DukaanSetu/server/config/db');

async function testUpdate() {
  const userId = '7a80bdb2-d12e-4e8a-bc99-1e5c3b07a887'; // Souvik Nandi (wholesaler)
  console.log('Testing column update for user:', userId);
  
  const { data, error } = await supabase
    .from('users')
    .update({
      latitude: 22.572646,
      longitude: 88.363892,
      address: 'Kolkata Wholesale Hub, WB',
      is_profile_complete: true
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('❌ Update failed:', error.message);
  } else {
    console.log('✅ Update succeeded! User data:', data);
  }
  process.exit(0);
}

testUpdate();
