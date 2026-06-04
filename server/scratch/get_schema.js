const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('information_schema.columns').select('table_name, column_name, data_type').eq('table_schema', 'public');
  if (error) {
    console.error("Error fetching schema directly from information_schema:", error.message);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
