import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import { FiArrowLeft, FiPackage, FiShoppingBag, FiDollarSign, FiCalendar, FiCpu, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BuyerProfilePage = () => {
  const { id } = useParams();
  const [buyer, setBuyer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBuyerProfile();
      fetchOffers();
    }
  }, [id]);

  const fetchBuyerProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/selling`);
      const buyerOrders = (data.orders || []).filter(o => o.buyer_id === id);
      if (buyerOrders.length === 0) {
        setBuyer(null);
        setOrders([]);
        return;
      }
      const buyerInfo = buyerOrders[0].buyer;
      const totalSpend = buyerOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
      const lastOrderDate = buyerOrders[0].created_at;
      setBuyer({ ...buyerInfo, totalOrders: buyerOrders.length, totalSpend, lastOrderDate });
      setOrders(buyerOrders);
    } catch (err) {
      console.error('Failed to load buyer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    setOffersLoading(true);
    try {
      const { data } = await api.get(`/ai/personalized-offers/${id}`);
      setOffers(data.offers || []);
    } catch {} finally { setOffersLoading(false); }
  };

  const handleSendOffer = (offer) => {
    toast.success(`Offer "${offer.offerTitle}" sent to buyer!`);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="max-w-5xl mx-auto py-8 px-4">
          <Link to="/orders" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <FiArrowLeft /> Back to Orders
          </Link>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          ) : !buyer ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed">
              <p className="text-gray-500">Buyer not found or no orders placed with this buyer.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                    {(buyer.shop_name || 'B').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{buyer.shop_name || 'Buyer'}</h1>
                    <p className="text-sm text-gray-500">{buyer.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FiShoppingBag className="mx-auto text-indigo-500 mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{buyer.totalOrders}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FiDollarSign className="mx-auto text-green-500 mb-1" />
                    <p className="text-2xl font-bold text-gray-900">₹{(buyer.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">Total Spend</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FiCalendar className="mx-auto text-amber-500 mb-1" />
                    <p className="text-sm font-bold text-gray-900">{new Date(buyer.lastOrderDate).toLocaleDateString('en-IN')}</p>
                    <p className="text-xs text-gray-500">Last Order</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FiPackage className="mx-auto text-blue-500 mb-1" />
                    <p className="text-sm font-bold text-gray-900">{buyer.totalOrders > 1 ? 'Returning' : 'New'}</p>
                    <p className="text-xs text-gray-500">Buyer Type</p>
                  </div>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Order History ({orders.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-3 font-semibold">Order ID</th>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">#{order.id?.slice(0, 8)}</td>
                          <td className="px-6 py-4 text-gray-700">{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              order.status === 'delivered' ? 'bg-green-50 text-green-700' :
                              order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                              order.status === 'accepted' ? 'bg-blue-50 text-blue-700' :
                              order.status === 'dispatched' ? 'bg-indigo-50 text-indigo-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            ₹{parseFloat(order.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Personalized Offers */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiCpu className="text-indigo-500" />
                  <h2 className="font-bold text-gray-900">AI Suggested Offers</h2>
                </div>
                {offersLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
                  </div>
                ) : offers.length === 0 ? (
                  <p className="text-sm text-gray-400">No offers available. Add more order history to get AI suggestions.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {offers.map((offer, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-1">{offer.offerTitle}</h3>
                        <p className="text-xs text-gray-500 mb-3">{offer.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-green-600">{offer.discount}</span>
                          <span className="text-xs text-gray-400">{offer.targetProduct}</span>
                        </div>
                        <button
                          onClick={() => handleSendOffer(offer)}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                          <FiSend /> Send Offer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BuyerProfilePage;
