require('dotenv').config({ path: 'd:/Projects/DukaanSetu/server/.env' });
const axios = require('axios');
const { supabase } = require('../config/db');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('🧪 Starting Bulk Order Checkout Integration Test...');

  try {
    // 1. Get test users (any buyer and seller roles)
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, email, role, shop_name')
      .eq('is_deleted', false);

    if (uErr) throw uErr;

    const buyer = users.find(u => u.role === 'shop_owner');
    const seller = users.find(u => u.role === 'producer' || u.role === 'wholesaler' || u.role === 'distributor');

    if (!buyer || !seller) {
      console.log('⚠️ Could not find appropriate test users (shop_owner and producer/wholesaler/distributor) in the database.');
      process.exit(0);
    }

    console.log(`Buyer: ${buyer.shop_name} (${buyer.email})`);
    console.log(`Seller: ${seller.shop_name} (${seller.email})`);

    // 2. Authenticate buyer and seller to get tokens
    // Note: We bypass authentication by simulating the JWT payload if we hit database directly,
    // but we can also just call the login endpoint or query Supabase to simulate user.
    // For simplicity, we can fetch products directly and use the local controller method or login.
    // Let's call login or sign in. If password is known, we can log in.
    // In dev, we can login using a bypass or generate a JWT token locally.
    const jwt = require('jsonwebtoken');
    const generateToken = (user) => {
      return jwt.sign(
        { id: user.id, email: user.email, role: user.role, shopName: user.shop_name },
        process.env.JWT_SECRET || 'stocksync_jwt_secret_change_in_production_2024',
        { expiresIn: '1h' }
      );
    };

    const buyerToken = generateToken(buyer);
    console.log('Generated local JWT token for buyer');

    // 3. Make sure there is an accepted connection
    const [u1, u2] = [buyer.id, seller.id].sort();
    const { data: existingConn } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .maybeSingle();

    if (!existingConn) {
      console.log('Creating accepted connection...');
      await supabase.from('connections').insert({
        user_id: u1,
        connected_user_id: u2,
        status: 'accepted'
      });
    } else {
      await supabase.from('connections').update({ status: 'accepted' }).eq('id', existingConn.id);
    }

    // 4. Fetch products listed by this wholesaler
    const { data: products, error: pErr } = await supabase
      .from('wholesaler_products')
      .select('*')
      .eq('wholesaler_id', seller.id)
      .limit(2);

    if (pErr) throw pErr;

    if (!products || products.length < 2) {
      console.log('⚠️ Wholesaler needs to have at least 2 products listed. Creating test products...');
      const p1 = {
        wholesaler_id: seller.id,
        product_name: 'Test Bulk Item A',
        price_per_unit: 100,
        moq: 5,
        stock_available: 50,
        unit: 'pieces',
        category: 'General'
      };
      const p2 = {
        wholesaler_id: seller.id,
        product_name: 'Test Bulk Item B',
        price_per_unit: 150,
        moq: 10,
        stock_available: 100,
        unit: 'pieces',
        category: 'General'
      };
      const { data: createdProds, error: cErr } = await supabase
        .from('wholesaler_products')
        .insert([p1, p2])
        .select();

      if (cErr) throw cErr;
      products.push(...createdProds);
    }

    console.log(`Products to order:
    1. ${products[0].product_name} (Price: ₹${products[0].price_per_unit}, Stock: ${products[0].stock_available}, MOQ: ${products[0].moq})
    2. ${products[1].product_name} (Price: ₹${products[1].price_per_unit}, Stock: ${products[1].stock_available}, MOQ: ${products[1].moq})`);

    const orderPayload = {
      supplierId: seller.id,
      items: [
        { productId: products[0].id, quantity: products[0].moq },
        { productId: products[1].id, quantity: products[1].moq }
      ],
      deliveryLocation: '123 Test Street, DukaanSetu City',
      notes: 'Test bulk order placement'
    };

    // 5. Send POST request to bulk order endpoint
    const response = await axios.post(
      `${API_URL}/orders/bulk`,
      orderPayload,
      {
        headers: {
          Authorization: `Bearer ${buyerToken}`
        }
      }
    );

    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Message:', response.data.message);
    console.log('✅ Order ID:', response.data.order.id);
    console.log('✅ Order Items count:', response.data.order.items.length);
    console.log('✅ Grand Total:', response.data.order.total_price);
    
    // Validate stock deduction
    const { data: updatedP1 } = await supabase.from('wholesaler_products').select('stock_available').eq('id', products[0].id).single();
    const { data: updatedP2 } = await supabase.from('wholesaler_products').select('stock_available').eq('id', products[1].id).single();

    console.log(`Stock Verification:
    Item A: Before = ${products[0].stock_available}, After = ${updatedP1.stock_available} (Expected: ${products[0].stock_available - products[0].moq})
    Item B: Before = ${products[1].stock_available}, After = ${updatedP2.stock_available} (Expected: ${products[1].stock_available - products[1].moq})`);

    if (updatedP1.stock_available === products[0].stock_available - products[0].moq &&
        updatedP2.stock_available === products[1].stock_available - products[1].moq) {
      console.log('🎉 BULK ORDER CHECKOUT INTEGRATION TEST PASSED SUCCESSFULLY!');
    } else {
      console.error('❌ Stock deduction values do not match expected!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  process.exit(0);
}

runTest();
