const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_EMAIL = `auth_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';
const TEST_USER = {
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  shop_name: 'Test Store Extreme',
  phone_number: '1112223333',
  role: 'shop_owner'
};

async function run() {
  console.log('Starting Auth E2E Tests...');
  
  // 1. Clean up potential old tests
  await supabase.from('users').delete().eq('email', TEST_EMAIL.toLowerCase());

  // 2. Test Signup with Missing Fields
  try {
    console.log('Testing Signup with missing fields...');
    await axios.post(`${API_URL}/auth/signup`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      // shop_name is missing
      role: 'shop_owner'
    });
    console.error('❌ Error: Signup should have failed due to missing fields.');
    process.exit(1);
  } catch (err) {
    const msg = err.response?.data?.message;
    if (err.response && err.response.status === 400 && (msg === 'Missing fields' || msg === 'Validation failed')) {
      console.log('✅ Signup correctly rejected missing fields.');
    } else {
      console.error('❌ Unexpected signup failure on missing fields:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 3. Test Successful Signup
  try {
    console.log('Testing successful Signup...');
    const res = await axios.post(`${API_URL}/auth/signup`, TEST_USER);
    if (res.status === 201 && res.data.accessToken) {
      console.log('✅ Signup completed successfully! User created:', res.data.user);
    } else {
      console.error('❌ Unexpected signup response:', res.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Signup failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 4. Test Duplicate Email Constraint
  try {
    console.log('Testing duplicate email Signup constraint...');
    await axios.post(`${API_URL}/auth/signup`, TEST_USER);
    console.error('❌ Error: Duplicate email signup should have failed.');
    process.exit(1);
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.message === 'Email already exists') {
      console.log('✅ Duplicate email constraint correctly caught & translated.');
    } else {
      console.error('❌ Unexpected response on duplicate email:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 5. Test Successful Login
  try {
    console.log('Testing successful Login...');
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    if (res.status === 200 && res.data.accessToken) {
      console.log('✅ Login successful! Token received:', res.data.accessToken);
    } else {
      console.error('❌ Login response issues:', res.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 6. Test Invalid Password Login
  try {
    console.log('Testing login with incorrect password...');
    await axios.post(`${API_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: 'wrongpassword'
    });
    console.error('❌ Error: Login with incorrect password should have failed.');
    process.exit(1);
  } catch (err) {
    if (err.response && err.response.status === 401 && err.response.data.message === 'Invalid credentials') {
      console.log('✅ Login with incorrect password correctly rejected.');
    } else {
      console.error('❌ Unexpected response on wrong password:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 7. Cleanup
  console.log('Cleaning up test user...');
  await supabase.from('users').delete().eq('email', TEST_EMAIL.toLowerCase());
  console.log('✅ Cleanup successful.');
  
  console.log('\n🌟 ALL AUTH E2E TESTS PASSED SUCCESSFULLY! 🌟\n');
  process.exit(0);
}

// Give server time to boot if called immediately
setTimeout(run, 1000);
