const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_USER = {
    email: `qa_test_${Date.now()}@example.com`,
    password: 'Password123!',
    shopName: 'QA Test Shop',
    phoneNumber: '1234567890',
    role: 'shop_owner'
};

const WHOLESALER_USER = {
    email: `qa_wholesaler_${Date.now()}@example.com`,
    password: 'Password123!',
    shopName: 'QA Wholesaler',
    phoneNumber: '0987654321',
    role: 'wholesaler'
};

async function runTests() {
    console.log('🚀 Starting E2E Testing for DukaanSetu MVP...');
    let tokens = {};

    try {
        // --- 1. AUTH FLOW ---
        console.log('\n--- 1. Testing Auth Flow ---');
        
        // Signup
        console.log('Testing Signup...');
        await axios.post(`${API_URL}/auth/signup`, TEST_USER);
        await axios.post(`${API_URL}/auth/signup`, WHOLESALER_USER);
        
        // Bypass Email Verification (Get OTP from DB)
        console.log('Bypassing Email Verification...');
        const { data: otpData } = await supabase.from('otp_store').select('otp').eq('email', TEST_USER.email).single();
        const { data: otpWholesaler } = await supabase.from('otp_store').select('otp').eq('email', WHOLESALER_USER.email).single();
        
        // Verify
        const verifyRes = await axios.post(`${API_URL}/auth/verify-email`, { email: TEST_USER.email, otp: otpData.otp });
        tokens.shopOwner = verifyRes.data.accessToken;
        const verifyWholesaler = await axios.post(`${API_URL}/auth/verify-email`, { email: WHOLESALER_USER.email, otp: otpWholesaler.otp });
        tokens.wholesaler = verifyWholesaler.data.accessToken;
        
        console.log('✅ Auth Flow Success');

        // --- 2. INVENTORY FLOW ---
        console.log('\n--- 2. Testing Inventory Flow ---');
        
        const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
        
        // Fetch categories to get an ID
        const catRes = await axios.get(`${API_URL}/categories`, authHeader(tokens.shopOwner));
        const categoryId = catRes.data.categories[0]?._id;
        
        if (!categoryId) throw new Error('No categories found for testing');

        // Add Product
        console.log('Adding product...');
        const addRes = await axios.post(`${API_URL}/products`, {
            productName: 'QA Test Product',
            categoryId,
            quantity: 50,
            sellingPrice: 100
        }, authHeader(tokens.shopOwner));
        const productId = addRes.data.product.id;
        
        // Edit Product
        console.log('Editing product...');
        await axios.put(`${API_URL}/products/${productId}`, {
            productName: 'QA Test Product Updated',
            quantity: 60
        }, authHeader(tokens.shopOwner));
        
        // Search Product
        console.log('Searching product...');
        const searchRes = await axios.get(`${API_URL}/products?search=Updated`, authHeader(tokens.shopOwner));
        if (searchRes.data.products.length === 0) throw new Error('Search failed to find updated product');

        console.log('✅ Inventory Flow Success');

        // --- 3. CONNECT & ORDER FLOW ---
        console.log('\n--- 3. Testing Connect & Order Flow ---');
        
        // Wholesaler creates a listing
        console.log('Wholesaler creating listing...');
        const listingRes = await axios.post(`${API_URL}/connect/my-listings`, {
            productName: 'Bulk Biscuits',
            category: 'Food',
            pricePerUnit: 10,
            moq: 10,
            stockAvailable: 1000
        }, authHeader(tokens.wholesaler));
        const listingId = listingRes.data.product.id;
        
        // Shop owner searches marketplace
        console.log('Shop owner searching marketplace...');
        const marketRes = await axios.get(`${API_URL}/connect?search=Biscuits`, authHeader(tokens.shopOwner));
        if (marketRes.data.products.length === 0) throw new Error('Marketplace search failed');
        
        // Place Order
        console.log('Placing order...');
        const orderRes = await axios.post(`${API_URL}/orders`, {
            productId: listingId,
            quantity: 50
        }, authHeader(tokens.shopOwner));
        const orderId = orderRes.data.order.id;
        
        // View Orders
        console.log('Viewing orders...');
        const ordersRes = await axios.get(`${API_URL}/orders`, authHeader(tokens.shopOwner));
        if (ordersRes.data.orders.length === 0) throw new Error('Order not found in history');
        
        // Update Status (Seller: Wholesaler)
        console.log('Wholesaler accepting order...');
        await axios.put(`${API_URL}/orders/${orderId}`, { status: 'accepted' }, authHeader(tokens.wholesaler));
        
        // Update Status (Seller: Wholesaler)
        console.log('Wholesaler completing order...');
        await axios.put(`${API_URL}/orders/${orderId}`, { status: 'delivered' }, authHeader(tokens.wholesaler));

        console.log('✅ Connect & Order Flow Success');

        // --- CLEANUP ---
        console.log('\n--- Cleanup ---');
        await supabase.from('users').delete().eq('email', TEST_USER.email);
        await supabase.from('users').delete().eq('email', WHOLESALER_USER.email);
        console.log('✅ Cleanup Success');

        console.log('\n✨ ALL TESTS PASSED! MVP IS STABLE FOR DEMO.');

    } catch (error) {
        console.error('\n❌ TEST FAILED!');
        if (error.response) {
            console.error('Response Error:', error.response.status, error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTests();
