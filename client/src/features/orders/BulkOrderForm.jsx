import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiPlus, FiTrash2, FiShoppingCart,
  FiPackage, FiAlertCircle, FiLoader, FiMapPin, FiFileText, FiRepeat,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './BulkOrderForm.css';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

const emptyRow = () => ({
  _id:       Math.random().toString(36).slice(2),
  productId: '',
  quantity:  '',
  product:   null,
  error:     '',
  oldPrice:  null,   // set for repeated orders — triggers diff badge
});

// ── component ────────────────────────────────────────────────────────────────

const BulkOrderForm = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const prefill    = location.state?.prefill || null;   // set by Repeat Order
  const isRepeat   = !!prefill;

  // ── state ──────────────────────────────────────────────────────────────────
  const [suppliers,        setSuppliers]        = useState([]);     // accepted connections
  const [supplierId,       setSupplierId]       = useState('');
  const [supplierObj,      setSupplierObj]      = useState(null);

  const [supplierProducts, setSupplierProducts] = useState([]);     // products for chosen supplier
  const [loadingProducts,  setLoadingProducts]  = useState(false);

  const [rows,    setRows]    = useState([emptyRow()]);
  const [notes,   setNotes]   = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // ── load accepted connections ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/connections', { params: { status: 'accepted' } });
        setSuppliers(data.connections || []);
        // Auto-select supplier if prefilling from Repeat Order
        if (prefill?.supplierId) {
          setSupplierId(prefill.supplierId);
          const conn = (data.connections || []).find(c => c.otherUser?.id === prefill.supplierId);
          setSupplierObj(conn ? conn.otherUser : { shop_name: prefill.supplierName, role: '' });
        }
      } catch {
        toast.error('Could not load your connections');
      } finally {
        setLoadingSuppliers(false);
      }
    };
    load();
  }, []);

  // ── load products when supplier changes ─────────────────────────────────────
  useEffect(() => {
    if (!supplierId) {
      setSupplierProducts([]);
      return;
    }
    const load = async () => {
      setLoadingProducts(true);
      if (!prefill) setRows([emptyRow()]);
      try {
        const { data } = await api.get('/connect', { params: { wholesalerId: supplierId, limit: 100 } });
        const products = data.products || [];
        setSupplierProducts(products);

        // Pre-fill rows from Repeat Order state
        if (prefill?.items?.length && products.length) {
          const preRows = prefill.items.map(pItem => {
            const prod = products.find(p => p.id === pItem.productId) || null;
            const oos  = prod ? prod.stock_available <= 0 : true;
            return {
              _id:       Math.random().toString(36).slice(2),
              productId: pItem.productId,
              quantity:  String(pItem.quantity),
              product:   prod,
              oldPrice:  pItem.oldPrice,
              error:     oos ? 'Out of stock' : '',
            };
          });
          setRows(preRows);
        } else if (products.length === 0) {
          toast('This supplier has no products listed yet.', { icon: '📦' });
        }
      } catch {
        toast.error('Could not load supplier products');
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, [supplierId]);

  // ── supplier change handler ─────────────────────────────────────────────────
  const handleSupplierChange = (e) => {
    const id = e.target.value;
    setSupplierId(id);
    const conn = suppliers.find(c => c.otherUser?.id === id);
    setSupplierObj(conn ? conn.otherUser : null);
  };

  // ── row manipulation ────────────────────────────────────────────────────────
  const addRow = () => setRows(r => [...r, emptyRow()]);

  const removeRow = (rid) => setRows(r => r.filter(row => row._id !== rid));

  const updateRow = useCallback((rid, field, value) => {
    setRows(prev => prev.map(row => {
      if (row._id !== rid) return row;
      const updated = { ...row, [field]: value, error: '' };

      if (field === 'productId') {
        const prod = supplierProducts.find(p => p.id === value);
        updated.product = prod || null;
        // auto-set qty to MOQ if qty is blank / below MOQ
        if (prod && (updated.quantity === '' || Number(updated.quantity) < prod.moq)) {
          updated.quantity = String(prod.moq || 1);
        }
      }

      if (field === 'quantity') {
        // validate inline
        const qty = Number(value);
        const prod = row.product;
        if (prod && qty > 0 && qty < prod.moq) {
          updated.error = `Min order: ${prod.moq} ${prod.unit || 'units'}`;
        } else if (prod && qty > prod.stock_available) {
          updated.error = `Only ${prod.stock_available} in stock`;
        }
      }
      return updated;
    }));
  }, [supplierProducts]);

  // ── derived totals ──────────────────────────────────────────────────────────
  const rowTotals = rows.map(row => {
    const qty  = Number(row.quantity) || 0;
    const price = Number(row.product?.price_per_unit) || 0;
    return qty * price;
  });
  const grandTotal   = rowTotals.reduce((a, b) => a + b, 0);
  const itemCount    = rows.filter(r => r.productId && Number(r.quantity) > 0).length;

  // ── validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!supplierId) {
      toast.error('Please select a supplier');
      return false;
    }
    if (itemCount === 0) {
      toast.error('Add at least one product');
      return false;
    }
    for (const row of rows) {
      if (!row.productId) continue;       // skip blank rows
      if (!row.quantity || Number(row.quantity) <= 0) {
        toast.error(`Enter a valid quantity for ${row.product?.product_name || 'a product'}`);
        return false;
      }
      if (row.error) {
        toast.error(row.error);
        return false;
      }
    }
    return true;
  };

  // ── submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const items = rows
      .filter(r => r.productId && Number(r.quantity) > 0)
      .map(r => ({ productId: r.productId, quantity: Number(r.quantity) }));

    setSubmitting(true);
    try {
      await api.post('/orders/bulk', {
        supplierId,
        items,
        notes:            notes.trim() || undefined,
        deliveryLocation: deliveryLocation.trim() || undefined,
      });
      toast.success('🎉 Bulk order placed successfully!');
      navigate('/orders');
    } catch (err) {
      // api.js interceptor already shows a toast; nothing extra needed
      console.error('Bulk order error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bof-page">
      {/* Header */}
      <div className="bof-header">
        <button className="bof-back-btn" onClick={() => navigate('/orders')} aria-label="Go back">
          <FiArrowLeft size={18} />
        </button>
        <div className="bof-header-text">
          <h1>{isRepeat ? 'Repeat Order' : 'Place Bulk Order'}</h1>
          <p>{isRepeat ? `Re-ordering from ${prefill.supplierName}` : 'Select a supplier, add products, and confirm your order.'}</p>
        </div>
        {isRepeat && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '6px 12px', fontSize: 12, color: '#4f46e5', fontWeight: 700 }}>
            <FiRepeat size={13} />
            Repeat Order
          </div>
        )}
      </div>

      {/* ── Section 1: Supplier ── */}
      <div className="bof-section">
        <div className="bof-section-header">
          <span className="bof-section-num">1</span>
          <span className="bof-section-title">Select Supplier</span>
        </div>
        <div className="bof-section-body">
          {loadingSuppliers ? (
            <div className="bof-loading-row">
              <div className="spinner" />
              Loading your connections…
            </div>
          ) : suppliers.length === 0 ? (
            <div className="bof-empty-products">
              <div className="icon">🤝</div>
              <p>No accepted connections yet.<br />Connect with a supplier first.</p>
            </div>
          ) : (
            <>
              <select
                className="bof-supplier-select"
                value={supplierId}
                onChange={handleSupplierChange}
              >
                <option value="">— Choose a supplier —</option>
                {suppliers.map(c => (
                  <option key={c.id} value={c.otherUser?.id}>
                    {c.otherUser?.shop_name || 'Unknown Shop'}
                  </option>
                ))}
              </select>

              {supplierObj && (
                <div className="bof-supplier-card">
                  <div className="bof-supplier-avatar">
                    {(supplierObj.shop_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="bof-supplier-name">{supplierObj.shop_name}</div>
                    <div className="bof-supplier-role">{supplierObj.role?.replace('_', ' ')}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: Products ── */}
      <div className="bof-section">
        <div className="bof-section-header">
          <span className="bof-section-num">2</span>
          <span className="bof-section-title">Add Products</span>
        </div>
        <div className="bof-section-body">
          {!supplierId ? (
            <div className="bof-empty-products">
              <div className="icon">📦</div>
              <p>Select a supplier above to browse their products.</p>
            </div>
          ) : loadingProducts ? (
            <div className="bof-loading-row">
              <div className="spinner" />
              Loading products…
            </div>
          ) : supplierProducts.length === 0 ? (
            <div className="bof-empty-products">
              <div className="icon">🛒</div>
              <p>This supplier has no products listed yet.</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="bof-products-header">
                <span>Product</span>
                <span>Qty</span>
                <span style={{ textAlign: 'right' }}>Unit Price</span>
                <span style={{ textAlign: 'right' }}>Subtotal</span>
                <span />
              </div>

              {/* Rows */}
              {rows.map((row, idx) => {
                const subtotal = (Number(row.quantity) || 0) * (Number(row.product?.price_per_unit) || 0);
                return (
                  <React.Fragment key={row._id}>
                    <div className="bof-product-row">
                      {/* Product select */}
                      <div>
                        <select
                          className="bof-product-select"
                          value={row.productId}
                          onChange={e => updateRow(row._id, 'productId', e.target.value)}
                        >
                          <option value="">— Select product —</option>
                          {supplierProducts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.product_name} ({p.stock_available} {p.unit || 'units'} avail.)
                            </option>
                          ))}
                        </select>
                        {row.product && (
                          <div className="bof-moq-hint">
                            <FiAlertCircle size={10} />
                            MOQ: {row.product.moq || 1} {row.product.unit || 'units'}
                          </div>
                        )}
                        {/* Price diff badge (Repeat Order) */}
                        {row.oldPrice != null && row.product && (
                          parseFloat(row.oldPrice) !== parseFloat(row.product.price_per_unit) ? (
                            <div className="bof-moq-hint warn">
                              <FiAlertCircle size={10} />
                              Price changed: was {fmt(row.oldPrice)}
                            </div>
                          ) : null
                        )}
                        {/* Out-of-stock badge (Repeat Order) */}
                        {row.oldPrice != null && !row.product && (
                          <div className="bof-moq-hint" style={{ color: '#ef4444' }}>
                            <FiAlertCircle size={10} />
                            Product no longer available
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <input
                          type="number"
                          className={`bof-qty-input${row.error ? ' error' : ''}`}
                          value={row.quantity}
                          min={row.product?.moq || 1}
                          max={row.product?.stock_available}
                          placeholder="0"
                          disabled={!row.productId}
                          onChange={e => updateRow(row._id, 'quantity', e.target.value)}
                        />
                      </div>

                      {/* Unit price */}
                      <div className="bof-price-cell">
                        <span className="bof-price-label">per unit</span>
                        <span className="bof-price-value">
                          {row.product ? fmt(row.product.price_per_unit) : '—'}
                        </span>
                      </div>

                      {/* Subtotal */}
                      <div className="bof-subtotal-cell">
                        <span className="bof-subtotal-value">
                          {subtotal > 0 ? fmt(subtotal) : '—'}
                        </span>
                        {subtotal > 0 && (
                          <span className="bof-subtotal-note">
                            {row.quantity} × {fmt(row.product?.price_per_unit)}
                          </span>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        className="bof-remove-btn"
                        onClick={() => removeRow(row._id)}
                        disabled={rows.length === 1}
                        title="Remove row"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>

                    {/* Row-level error */}
                    {row.error && (
                      <div className="bof-row-error">
                        <FiAlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {row.error}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Add row */}
              <button
                className="bof-add-row-btn"
                onClick={addRow}
                disabled={rows.length >= supplierProducts.length}
              >
                <FiPlus size={15} />
                Add Another Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Section 3: Order Details ── */}
      <div className="bof-section">
        <div className="bof-section-header">
          <span className="bof-section-num">3</span>
          <span className="bof-section-title">Order Details (Optional)</span>
        </div>
        <div className="bof-section-body">
          <div className="bof-form-row">
            <div className="bof-form-group">
              <label className="bof-form-label">
                <FiMapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                Delivery Location
              </label>
              <input
                type="text"
                className="bof-input"
                placeholder="e.g. 12 Market Street, Mumbai"
                value={deliveryLocation}
                onChange={e => setDeliveryLocation(e.target.value)}
              />
            </div>
            <div className="bof-form-group">
              <label className="bof-form-label">
                <FiFileText size={12} style={{ display: 'inline', marginRight: 4 }} />
                Notes for Supplier
              </label>
              <input
                type="text"
                className="bof-input"
                placeholder="Special instructions, preferred delivery time…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Grand Total Bar ── */}
      {supplierId && (
        <div className="bof-total-bar">
          <div className="bof-total-breakdown">
            <div className="bof-total-item">
              <span className="bof-total-item-label">Items</span>
              <span className="bof-total-item-value">{itemCount}</span>
            </div>
            <div className="bof-total-item">
              <span className="bof-total-item-label">Grand Total</span>
              <span className="bof-total-item-value grand">{fmt(grandTotal)}</span>
            </div>
          </div>

          <div className="bof-total-actions">
            <button className="bof-cancel-btn" onClick={() => navigate('/orders')}>
              Cancel
            </button>
            <button
              className="bof-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || itemCount === 0}
            >
              {submitting ? (
                <>
                  <FiLoader size={16} className="spin-anim" />
                  Placing Order…
                </>
              ) : (
                <>
                  <FiShoppingCart size={16} />
                  Place Order · {fmt(grandTotal)}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOrderForm;
