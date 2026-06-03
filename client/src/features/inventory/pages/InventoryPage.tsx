import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { InventoryLayout } from '../components/InventoryLayout';
import { ProductTable } from '../components/ProductTable';
import { ProductFormModal } from '../components/ProductFormModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { Product } from '../types';
import { toast } from 'react-hot-toast';
import { FiPackage, FiClock } from 'react-icons/fi';

export const InventoryPage: React.FC = () => {
  const inventory = useInventory();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const product = inventory.products.find(p => p.id === id);
    if (product) {
      setProductToDelete(product);
      setIsDeleteOpen(true);
    }
  };

  const handleFormSubmit = async (productData: any) => {
    try {
      if (editingProduct) {
        await inventory.editProduct(editingProduct.id, productData);
      } else {
        await inventory.addProduct(productData);
      }
      setIsFormOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      await inventory.deleteProduct(productToDelete.id);
      setIsDeleteOpen(false);
    }
  };

  const nearExpiryCount = inventory.products.filter(p => {
    if (!p.expiryDate) return false;
    const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;

  return (
    <InventoryLayout 
      filters={inventory.filters} 
      updateFilter={inventory.updateFilter}
      onAddClick={handleAddClick}
    >
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <FiPackage className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Products</p>
            <p className="text-lg font-bold text-gray-900">{inventory.totalProducts}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
            <span className="text-lg font-bold">%</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Average Margin</p>
            <p className={`text-lg font-bold ${inventory.averageMargin >= 20 ? 'text-green-600' : inventory.averageMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
              {inventory.averageMargin > 0 ? inventory.averageMargin.toFixed(1) + '%' : '—'}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <FiClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Expiring Soon</p>
            <p className={`text-lg font-bold ${nearExpiryCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {nearExpiryCount}
            </p>
          </div>
        </div>
      </div>

      {/* Sell First Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={inventory.sellFirst}
            onChange={(e) => inventory.setSellFirst(e.target.checked)}
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
        <span className="text-sm font-medium text-gray-700">Sell First (FEFO — nearest expiry first)</span>
      </div>

      <ProductTable 
        products={inventory.products}
        totalProducts={inventory.totalProducts}
        totalPages={inventory.totalPages}
        page={inventory.page}
        setPage={inventory.setPage}
        filters={inventory.filters}
        updateFilter={inventory.updateFilter}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      <ProductFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingProduct}
      />

      <DeleteConfirmationModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        productName={productToDelete?.name}
      />
    </InventoryLayout>
  );
};

export default InventoryPage;
