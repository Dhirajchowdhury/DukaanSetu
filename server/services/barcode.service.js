const axios = require('axios');

/**
 * Lookup product information by barcode
 * @param {string} barcode - Product barcode
 * @returns {object} Product information
 */
const lookupBarcode = async (barcode) => {
  try {
    // If no API key configured, return null
    if (!process.env.BARCODE_API_KEY) {
      return null;
    }

    const response = await axios.get(`${process.env.BARCODE_API_URL}`, {
      params: {
        barcode,
        key: process.env.BARCODE_API_KEY,
      },
    });

    if (response.data && response.data.products && response.data.products.length > 0) {
      const product = response.data.products[0];
      return {
        name: product.title || product.product_name,
        brand: product.brand,
        category: product.category,
        imageUrl: product.images?.[0] || null,
        description: product.description,
      };
    }

    return null;
  } catch (error) {
    console.error('Barcode lookup error:', error.message);
    return null;
  }
};

module.exports = {
  lookupBarcode,
};
