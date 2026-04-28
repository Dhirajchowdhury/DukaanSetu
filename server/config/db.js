const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

/**
 * Service-role client — bypasses Row Level Security.
 * Used exclusively on the server; never expose this key to the client.
 */
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const connectDB = async () => {
  try {
    // Lightweight connectivity check
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table empty — that's fine
      throw error;
    }
    console.log('✅ Supabase (PostgreSQL) connected');
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { supabase, connectDB };
