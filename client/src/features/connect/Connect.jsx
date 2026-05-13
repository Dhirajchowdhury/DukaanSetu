import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSearch, FiMapPin, FiPackage, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Connect = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchWholesalerProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/connect', {
        params: { search: debouncedSearch }
      });
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching wholesaler products:', error);
      toast.error('Failed to load marketplace products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWholesalerProducts();
  }, [debouncedSearch]);

  const handleOrder = async (product) => {
    // Basic order flow (Phase 1 MVP)
    // In a real app, this would open a modal to select quantity
    try {
      const quantity = product.moq || 1;
      await api.post('/orders', {
        productId: product.id,
        quantity,
      });
      toast.success(`Order for ${quantity} ${product.unit || 'units'} placed!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace Connect</h1>
        <p className="text-gray-600">Discover products from wholesalers and producers across the country.</p>
      </div>

      <div className="relative mb-8 max-w-2xl">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
        <input
          type="text"
          placeholder="Search for products, categories, or suppliers..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none text-gray-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
              <div className="h-40 bg-gray-100 rounded-xl mb-4"></div>
              <div className="h-6 bg-gray-100 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-100 rounded w-1/4"></div>
                <div className="h-10 bg-gray-100 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-800">No products found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative h-48 bg-gray-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                 <FiPackage className="text-5xl text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                 <div className="absolute top-2 right-2">
                    <span className="bg-white/90 backdrop-blur-sm text-teal-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-teal-50">
                      {product.category}
                    </span>
                 </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">{product.product_name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <FiMapPin className="text-teal-500" /> {product.location || 'Pan India'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Price per {product.unit || 'unit'}</p>
                    <p className="text-2xl font-black text-teal-600">₹{product.price_per_unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Min Order</p>
                    <p className="text-sm font-bold text-gray-700">{product.moq} {product.unit || 'units'}</p>
                  </div>
                </div>

                <button 
                  onClick={() => handleOrder(product)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-100 active:scale-95"
                >
                  <FiShoppingCart /> Order Now
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                 <span>Supplier: {product.wholesaler?.shop_name || 'Verified Wholesaler'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Connect;
