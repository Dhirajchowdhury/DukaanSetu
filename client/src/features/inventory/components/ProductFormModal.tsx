import React, { useState, useEffect } from 'react';
import { FiX, FiBell } from 'react-icons/fi';
import { Product } from '../types';
// @ts-ignore
import api from '../../../services/api';

interface Category {
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

const PREDEFINED_UNITS = ["kg", "gram", "litre", "packets", "dozens", "quintal", "ton", "boxes", "lots"];

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  quantity: 0,
  price: 0,
  expiryDate: '',
  lowStockThreshold: 10,
  lowStockAlertEnabled: true,
  minimumOrderQuantity: '',
  brandName: '',
  costPrice: 0,
  batchNumber: '',
  supplierName: '',
  unit: '',
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
  const [selectedUnitOption, setSelectedUnitOption] = useState('');
  const [customUnit, setCustomUnit] = useState('');

  /* ── Fetch categories whenever modal opens ── */
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCats(true);
    api.get('/categories')
      .then(({ data }: any) => setCategories(data.categories || []))
      .catch(() => {})
      .finally(() => setLoadingCats(false));
  }, [isOpen]);

  /* ── Populate form when editing ── */
  useEffect(() => {
    if (initialData) {
      const unitValue = (initialData as any).unit || '';
      const isPredefined = PREDEFINED_UNITS.includes(unitValue);
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
        brandName:            (initialData as any).brand || (initialData as any).brandName || '',
        costPrice:            (initialData as any).costPrice ?? 0,
        batchNumber:          (initialData as any).batchNumber || '',
        supplierName:         (initialData as any).supplier || (initialData as any).supplierName || '',
        unit:                 unitValue,
      });
      if (unitValue === '') {
        setSelectedUnitOption('');
        setCustomUnit('');
      } else if (isPredefined) {
        setSelectedUnitOption(unitValue);
        setCustomUnit('');
      } else {
        setSelectedUnitOption('other');
        setCustomUnit(unitValue);
      }
    } else {
      setFormData(EMPTY_FORM);
      setSelectedUnitOption('');
      setCustomUnit('');
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
    if (formData.price < 0)       e.price      = 'Selling price cannot be negative';
    if (formData.costPrice < 0)   e.costPrice  = 'Cost price cannot be negative';
    if (formData.lowStockThreshold < 1) e.lowStockThreshold = 'Threshold must be at least 1';
    if (formData.minimumOrderQuantity !== '' && parseInt(String(formData.minimumOrderQuantity)) < 1) {
      e.minimumOrderQuantity = 'Minimum order quantity must be at least 1';
    }
    if (selectedUnitOption === 'other' && !customUnit.trim()) {
      e.unit = 'Please specify custom unit';
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const finalUnit = selectedUnitOption === 'other' ? customUnit.trim() : selectedUnitOption;

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
      brandName:            formData.brandName,
      costPrice:            formData.costPrice,
      batchNumber:          formData.batchNumber,
      supplierName:         formData.supplierName,
      unit:                 finalUnit || null,
    });
  };

  const field = (key: string, value: string) =>
    `w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${
      errors[key] ? 'border-red-500' : 'border-gray-200'
    }`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button className="text-gray-400 hover:text-gray-600 transition-colors text-xl" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body p-6 max-h-[75vh] overflow-y-auto">

            {/* Row 1: Product Name & Brand Name */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  className={field('name', formData.name)}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Basmati Rice"
                />
                {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name}</span>}
              </div>

              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  className={field('brandName', formData.brandName)}
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="e.g. Fortune"
                />
                {errors.brandName && <span className="text-red-500 text-xs mt-1 block">{errors.brandName}</span>}
              </div>
            </div>

            {/* Row 2: Category (full width) */}
            <div className="form-group mb-4">
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
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <span className="text-red-500 text-xs mt-1 block">{errors.categoryId}</span>
              )}
            </div>

            {/* Row 3: Quantity & Unit */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  className={field('quantity', String(formData.quantity))}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                {errors.quantity && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.quantity}</span>
                )}
              </div>

              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  className={field('unit', selectedUnitOption)}
                  value={selectedUnitOption}
                  onChange={(e) => {
                    setSelectedUnitOption(e.target.value);
                    if (e.target.value !== 'other') {
                      setFormData({ ...formData, unit: e.target.value });
                    }
                  }}
                >
                  <option value="">Select unit</option>
                  {PREDEFINED_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="other">other</option>
                </select>
                {selectedUnitOption === 'other' && (
                  <input
                    type="text"
                    placeholder="Specify unit"
                    className="w-full mt-2 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                    value={customUnit}
                    onChange={(e) => {
                      setCustomUnit(e.target.value);
                      setFormData({ ...formData, unit: e.target.value });
                    }}
                  />
                )}
                {errors.unit && <span className="text-red-500 text-xs mt-1 block">{errors.unit}</span>}
              </div>
            </div>

            {/* Row 4: Selling Price & Cost Price */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price (₹) *
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
                  <span className="text-red-500 text-xs mt-1 block">{errors.price}</span>
                )}
              </div>

              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={field('costPrice', String(formData.costPrice))}
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
                {errors.costPrice && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.costPrice}</span>
                )}
              </div>
            </div>

            {/* Row 5: Expiry Date & Batch Number */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>

              <div className="form-group mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  className={field('batchNumber', formData.batchNumber)}
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="e.g. BATCH-99"
                />
                {errors.batchNumber && <span className="text-red-500 text-xs mt-1 block">{errors.batchNumber}</span>}
              </div>
            </div>

            {/* Row 6: Supplier Name (full width) */}
            <div className="form-group mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                className={field('supplierName', formData.supplierName)}
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="e.g. Apex Distributors"
              />
              {errors.supplierName && <span className="text-red-500 text-xs mt-1 block">{errors.supplierName}</span>}
            </div>

            {/* Minimum Order Quantity (Optional) */}
            <div className="form-group mb-4">
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
                <span className="text-red-500 text-xs mt-1 block">{errors.minimumOrderQuantity}</span>
              )}
            </div>

            {/* ── Low Stock Settings ── */}
            <div
              className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 mt-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <FiBell className="text-teal-600 text-base" />
                <span className="font-semibold text-sm text-gray-800">
                  Low Stock Alert
                </span>
              </div>

              {/* Enable toggle */}
              <div
                className={`flex items-center justify-between ${
                  formData.lowStockAlertEnabled ? 'mb-3' : 'mb-0'
                }`}
              >
                <span className="text-xs text-gray-500">
                  Alert when stock falls below threshold
                </span>
                <label className="toggle flex-shrink-0">
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
                <div className="form-group mb-0">
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
                    <span className="text-red-500 text-xs mt-1 block">{errors.lowStockThreshold}</span>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    You'll be alerted when quantity ≤ this number
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-gray-50 border-t border-gray-200 flex justify-end gap-3 p-4 rounded-b-2xl">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 transition-colors shadow-md shadow-teal-100"
            >
              {initialData ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
