import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { Product, ProductStatus } from '../types';
import { mockCategories } from '../data/mockData';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Omit<Product, 'id' | 'sku' | 'lastUpdated'>) => void;
  initialData?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    quantity: 0,
    price: 0,
    expiryDate: '',
    status: 'In Stock' as ProductStatus
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        categoryId: initialData.categoryId,
        quantity: initialData.quantity,
        price: initialData.price,
        expiryDate: initialData.expiryDate ? initialData.expiryDate.split('T')[0] : '',
        status: initialData.status
      });
    } else {
      setFormData({
        name: '',
        categoryId: '',
        quantity: 0,
        price: 0,
        expiryDate: '',
        status: 'In Stock'
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (formData.price < 0) newErrors.price = 'Price cannot be negative';
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const categoryName = mockCategories.find(c => c.id === formData.categoryId)?.name || 'Unknown';
    let autoStatus: ProductStatus = formData.status;
    
    // Auto calculate status based on quantity if it wasn't manually overridden (basic logic)
    if (formData.quantity === 0) autoStatus = 'Out of Stock';
    else if (formData.quantity < 20) autoStatus = 'Low Stock';
    else autoStatus = 'In Stock';

    onSubmit({
      ...formData,
      categoryName,
      status: autoStatus,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Product Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Enter product name"
              />
              {errors.name && <span style={{color: 'var(--inv-danger)', fontSize: '12px'}}>{errors.name}</span>}
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select 
                value={formData.categoryId}
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
              >
                <option value="" disabled>Select a category</option>
                {mockCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <span style={{color: 'var(--inv-danger)', fontSize: '12px'}}>{errors.categoryId}</span>}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Quantity</label>
                <input 
                  type="number" 
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  min="0"
                />
                {errors.quantity && <span style={{color: 'var(--inv-danger)', fontSize: '12px'}}>{errors.quantity}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Price</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  min="0"
                />
                {errors.price && <span style={{color: 'var(--inv-danger)', fontSize: '12px'}}>{errors.price}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Expiry Date (Optional)</label>
              <input 
                type="date" 
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{initialData ? 'Save Changes' : 'Add Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
