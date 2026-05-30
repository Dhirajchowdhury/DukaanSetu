require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

async function testDiscover() {
  try {
    console.log("Hitting discoverProfiles endpoint on running local server...");
    
    const { discoverProfiles } = require('../controllers/profile.controller');
    
    const req = {
      user: {
        id: "d84f4b42-8726-424b-8a53-b978d11d12b2", // shop_owner
        latitude: 22.989806,
        longitude: 88.451531,
      },
      query: {
        search: "",
        category: "",
        role: "",
        minPrice: "",
        maxPrice: "",
        location: "",
        sortBy: "nearest",
        page: 1,
        limit: 12
      }
    };
    
    const res = {
      json: function(data) {
        console.log("\nAPI RESPONSE RECEIVED SUCCESSFULLY:");
        console.log("Profiles count:", data.profiles.length);
        if (data.profiles.length > 0) {
          console.log("Sample profile data:", {
            id: data.profiles[0].id,
            name: data.profiles[0].name,
            shop_name: data.profiles[0].shop_name,
            hasProducts: data.profiles[0].hasProducts,
            hasLocation: data.profiles[0].hasLocation,
            total_products: data.profiles[0].total_products,
            distance_km: data.profiles[0].distance_km
          });
        }
        console.log("Pagination:", data.pagination);
      },
      status: function(code) {
        console.log("Status set to:", code);
        return this;
      }
    };
    
    const next = function(err) {
      console.error("API Error occurred:", err);
    };
    
    await discoverProfiles(req, res, next);
    
  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

testDiscover();
