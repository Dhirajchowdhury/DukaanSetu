import React, { useState, useEffect } from 'react';
import { FiX, FiBell } from 'react-icons/fi';
import { Product } from '../types';
import api from '../../../services/api';

interface Category {
  _id: string;
  id:  string;
  name: string;
  icon?: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: any) => void;
  initialData?: Product | null;
}

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  quantity: 0,
  price: 0,
  expiryDate: '',
  lowStockThreshold: 10,
  lowStockAlertEnabled: true,
  minimumOrderQuantity: '',
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingCats, setLoadingCats] = useState(false);

  /* ── Fetch categories whenever modal opens ── */
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCats(true);
    api.get('/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => {})
      .finally(() => setLoadingCats(false));
  }, [isOpen]);

  /* ── Populate form when editing ── */
  useEffect(() => {
    if (initialData) {
      setFormData({
        name:                 (initialData as any).name || '',
        categoryId:           (initialData as any).categoryId || '',
        quantity:             (initialData as any).quantity ?? 0,
        price:                (initialData as any).price ?? 0,
        expiryDate:           (initialData as any).expiryDate
                                ? (initialData as any).expiryDate.split('T')[0]
                                : '',
        lowStockThreshold:    (initialData as any).lowStockThreshold    ?? 10,
        lowStockAlertEnabled: (initialData as any).lowStockAlertEnabled ?? true,
        minimumOrderQuantity: (initialData as any).minimumOrderQuantity ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  /* ── Validation ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())    e.name       = 'Product name is required';
    if (!formData.categoryId)     e.categoryId = 'Category is required';
    if (formData.quantity < 0)    e.quantity   = 'Quantity cannot be negative';
    if (formData.price < 0)       e.price      = 'Price cannot be negative';
    if (formData.lowStockThreshold < 1) e.lowStockThreshold = 'Threshold must be at least 1';
    if (formData.minimumOrderQuantity !== '' && parseInt(String(formData.minimumOrderQuantity)) < 1) {
      e.minimumOrderQuantity = 'Minimum order quantity must be at least 1';
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSubmit({
      productName:          formData.name,
      categoryId:           formData.categoryId,
      quantity:             formData.quantity,
      sellingPrice:         formData.price,
      expiryDate:           formData.expiryDate
                              ? new Date(formData.expiryDate).toISOString()
                              : null,
      lowStockThreshold:    formData.lowStockThreshold,
      lowStockAlertEnabled: formData.lowStockAlertEnabled,
      minimumOrderQuantity: formData.minimumOrderQuantity !== '' ? parseInt(String(formData.minimumOrderQuantity)) : null,
    });
  };

  const field = (key: string, value: string) =>
    `w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${
      errors[key] ? 'border-red-500' : 'border-gray-200'
    }`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2 className="text-xl font-bold">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Product Name */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                className={field('name', formData.name)}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Basmati Rice 5kg"
              />
              {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name}</span>}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                className={field('categoryId', formData.categoryId)}
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                disabled={loadingCats}
              >
                <option value="" disabled>
                  {loadingCats ? 'Loading categories…' : 'Select a category'}
                </option>
                {categories.map((cat) => (
                  <option key={cat._id || cat.id} value={cat._id || cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <span className="text-red-500 text-xs mt-1">{errors.categoryId}</span>
              )}
            </div>

            {/* Quantity + Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  className={field('quantity', String(formData.quantity))}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                {errors.quantity && (
                  <span className="text-red-500 text-xs mt-1">{errors.quantity}</span>
                )}
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={field('price', String(formData.price))}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
                {errors.price && (
                  <span className="text-red-500 text-xs mt-1">{errors.price}</span>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>

            {/* Minimum Order Quantity (Optional) */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Quantity (Optional)
              </label>
              <input
                type="number"
                min="1"
                className={field('minimumOrderQuantity', String(formData.minimumOrderQuantity))}
                value={formData.minimumOrderQuantity}
                onChange={(e) => setFormData({ ...formData, minimumOrderQuantity: e.target.value })}
                placeholder="e.g. 5"
              />
              {errors.minimumOrderQuantity && (
                <span className="text-red-500 text-xs mt-1">{errors.minimumOrderQuantity}</span>
              )}
            </div>

            {/* ── Low Stock Settings ── */}
            <div
              style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--primary-muted)',
                borderRadius: 10,
                padding: '14px 16px',
                marginTop: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FiBell style={{ color: 'var(--primary)', fontSize: 16 }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                  Low Stock Alert
                </span>
              </div>

              {/* Enable toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: formData.lowStockAlertEnabled ? 12 : 0,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Alert when stock falls below threshold
                </span>
                <label className="toggle" style={{ flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={formData.lowStockAlertEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, lowStockAlertEnabled: e.target.checked })
                    }
                  />
                  <span className="toggle__track" />
                </label>
              </div>

              {/* Threshold input — only shown when alert is enabled */}
              {formData.lowStockAlertEnabled && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={field('lowStockThreshold', String(formData.lowStockThreshold))}
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowStockThreshold: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                  {errors.lowStockThreshold && (
                    <span className="text-red-500 text-xs mt-1">{errors.lowStockThreshold}</span>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    You'll be alerted when quantity ≤ this number
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-gray-50 flex justify-end gap-3 p-4 rounded-b-2xl">
            <button
              type="button"
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-100"
            >
              {initialData ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
