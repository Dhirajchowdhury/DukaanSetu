require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../config/db');

async function runTest() {
  try {
    console.log("Testing Supabase Category and Price DB Filter...");
    
    let selectString = `
      *,
      wholesaler_products:wholesaler_products!inner(*)
    `;
    let query = supabase
      .from('users')
      .select(selectString)
      .in('role', ['wholesaler', 'distributor', 'producer'])
      .ilike('wholesaler_products.category', '%grain%');
    
    const { data, error } = await query;
    if (error) {
      console.error("Query failed:", error.message);
    } else {
      console.log("Query succeeded! Count:", data.length);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest();
