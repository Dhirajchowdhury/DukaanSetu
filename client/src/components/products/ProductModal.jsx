import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { useProducts } from '../../context/ProductContext';
import './ProductModal.css';

const UNITS = ['pieces', 'kg', 'g', 'litre', 'ml', 'dozen', 'box', 'pack', 'bottle'];

const empty = {
  productName: '', brand: '', categoryId: '', quantity: '',
  unit: 'pieces', sellingPrice: '', costPrice: '',
  expiryDate: '', batchNumber: '', supplier: '',
};

const ProductModal = ({ product, onClose }) => {
  const { categories, createProduct, updateProduct } = useProducts();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const isEdit = !!product;

  useEffect(() => {
    if (product) {
      setForm({
        productName: product.productName || '',
        brand: product.brand || '',
        categoryId: product.categoryId?._id || product.categoryId || '',
        quantity: product.quantity ?? '',
        unit: product.unit || 'pieces',
        sellingPrice: product.sellingPrice || '',
        costPrice: product.costPrice || '',
        expiryDate: product.expiryDate
          ? new Date(product.expiryDate).toISOString().split('T')[0]
          : '',
        batchNumber: product.batchNumber || '',
        supplier: product.supplier || '',
      });
    }
  }, [product]);

  const validate = () => {
    const e = {};
    if (!form.productName.trim()) e.productName = 'Product name is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (form.quantity === '' || isNaN(form.quantity) || Number(form.quantity) < 0)
      e.quantity = 'Valid quantity required';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        expiryDate: form.expiryDate || undefined,
      };
      if (isEdit) await updateProduct(product._id, payload);
      else await createProduct(payload);
      onClose();
    } catch {
      // toast handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="pm-grid">
              {/* Product Name */}
              <div className="form-group pm-full">
                <label className="form-label">Product Name *</label>
                <input
                  className={`form-input ${errors.productName ? 'form-input--error' : ''}`}
                  name="productName"
                  value={form.productName}
                  onChange={handleChange}
                  placeholder="e.g. Basmati Rice 5kg"
                />
                {errors.productName && <p className="form-error">{errors.productName}</p>}
              </div>

              {/* Brand */}
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input
                  className="form-input"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="e.g. India Gate"
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className={`form-select ${errors.categoryId ? 'form-input--error' : ''}`}
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="form-error">{errors.categoryId}</p>}
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  className={`form-input ${errors.quantity ? 'form-input--error' : ''}`}
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
                {errors.quantity && <p className="form-error">{errors.quantity}</p>}
              </div>

              {/* Unit */}
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" name="unit" value={form.unit} onChange={handleChange}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Selling Price */}
              <div className="form-group">
                <label className="form-label">Selling Price (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  name="sellingPrice"
                  value={form.sellingPrice}
                  onChange={handleChange}
                  min="0"
                  placeholder="0.00"
                />
              </div>

              {/* Cost Price */}
              <div className="form-group">
                <label className="form-label">Cost Price (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  name="costPrice"
                  value={form.costPrice}
                  onChange={handleChange}
                  min="0"
                  placeholder="0.00"
                />
              </div>

              {/* Expiry Date */}
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  className="form-input"
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                />
              </div>

              {/* Batch Number */}
              <div className="form-group">
                <label className="form-label">Batch Number</label>
                <input
                  className="form-input"
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={handleChange}
                  placeholder="e.g. BATCH-001"
                />
              </div>

              {/* Supplier */}
              <div className="form-group pm-full">
                <label className="form-label">Supplier</label>
                <input
                  className="form-input"
                  name="supplier"
                  value={form.supplier}
                  onChange={handleChange}
                  placeholder="Supplier name"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner" /> Saving...</>
                : isEdit ? 'Update Product' : 'Add Product'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
