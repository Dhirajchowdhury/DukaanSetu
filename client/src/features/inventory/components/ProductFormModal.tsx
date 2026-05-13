import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { Product, ProductStatus } from '../types';
import api from '../../../services/api';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: any) => void;
  initialData?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    quantity: 0,
    price: 0,
    expiryDate: '',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCats(true);
      try {
        const { data } = await api.get('/categories');
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCats(false);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        categoryId: initialData.categoryId,
        quantity: initialData.quantity,
        price: initialData.price,
        expiryDate: initialData.expiryDate ? initialData.expiryDate.split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        categoryId: '',
        quantity: 0,
        price: 0,
        expiryDate: '',
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

    // Map to backend expected fields
    const payload = {
      productName: formData.name,
      categoryId: formData.categoryId,
      quantity: formData.quantity,
      sellingPrice: formData.price,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null
    };

    onSubmit(payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-xl font-bold">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input 
                type="text" 
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Enter product name"
              />
              {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name}</span>}
            </div>
            
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.categoryId ? 'border-red-500' : 'border-gray-200'}`}
                value={formData.categoryId}
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
              >
                <option value="" disabled>Select a category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className="text-red-500 text-xs mt-1">{errors.categoryId}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input 
                  type="number" 
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.quantity ? 'border-red-500' : 'border-gray-200'}`}
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  min="0"
                />
                {errors.quantity && <span className="text-red-500 text-xs mt-1">{errors.quantity}</span>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input 
                  type="number" 
                  step="0.01"
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.price ? 'border-red-500' : 'border-gray-200'}`}
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  min="0"
                />
                {errors.price && <span className="text-red-500 text-xs mt-1">{errors.price}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
              <input 
                type="date" 
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
              />
            </div>
          </div>
          <div className="modal-footer bg-gray-50 flex justify-end gap-3 p-4 rounded-b-2xl">
            <button type="button" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-100">
              {initialData ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
