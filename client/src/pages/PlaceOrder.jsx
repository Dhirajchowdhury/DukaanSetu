import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useSuppliers } from '../context/SupplierContext';
import { useProducts } from '../context/ProductContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const PlaceOrder = () => {
  const { createOrder } = useOrders();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const handleProductSelect = (productId, price) => {
    if (!selectedProducts.find(p => p.productId === productId)) {
      setSelectedProducts([...selectedProducts, { productId, quantity: 1, price }]);
    }
  };

  const handleQuantityChange = (productId, delta) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        return { ...p, quantity: Math.max(1, p.quantity + delta) };
      }
      return p;
    }));
  };

  const totalAmount = selectedProducts.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createOrder({
      supplierId: selectedSupplier,
      products: selectedProducts,
      totalAmount
    }, navigate);
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Place New Order</h1>
        <p>Step {step} of 3</p>
      </div>

      <div className="order-form-container" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        {step === 1 && (
          <div>
            <h3>Select Supplier</h3>
            <select 
              value={selectedSupplier} 
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={{ padding: '10px', width: '100%', marginBottom: '20px' }}
            >
              <option value="">-- Choose a Supplier --</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            <button 
              className="btn btn-primary" 
              onClick={() => setStep(2)} 
              disabled={!selectedSupplier}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Select Products</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="product-list" style={{ borderRight: '1px solid #ddd', paddingRight: '20px' }}>
                <h4>Available Products</h4>
                {products.map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>{p.productName}</span>
                    <button className="btn btn-sm btn-outline" onClick={() => handleProductSelect(p._id, p.costPrice || 0)}>Add</button>
                  </div>
                ))}
              </div>
              <div className="selected-products">
                <h4>Cart</h4>
                {selectedProducts.map(p => {
                  const productDetails = products.find(prod => prod._id === p.productId);
                  return (
                    <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>{productDetails?.productName} (${p.price})</span>
                      <div>
                        <button onClick={() => handleQuantityChange(p.productId, -1)}>-</button>
                        <span style={{ margin: '0 10px' }}>{p.quantity}</span>
                        <button onClick={() => handleQuantityChange(p.productId, 1)}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ marginRight: '10px' }}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={selectedProducts.length === 0}>Review Order</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>Review Order</h3>
            <p><strong>Supplier:</strong> {suppliers.find(s => s._id === selectedSupplier)?.name}</p>
            <ul>
              {selectedProducts.map(p => {
                 const productDetails = products.find(prod => prod._id === p.productId);
                 return <li key={p.productId}>{productDetails?.productName} x {p.quantity} = ${(p.price * p.quantity).toFixed(2)}</li>
              })}
            </ul>
            <h4>Total: ${totalAmount.toFixed(2)}</h4>
            
            <div style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ marginRight: '10px' }}>Back</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Place Order</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PlaceOrder;
