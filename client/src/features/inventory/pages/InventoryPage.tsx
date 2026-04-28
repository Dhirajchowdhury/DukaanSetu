import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { InventoryLayout } from '../components/InventoryLayout';
import { ProductTable } from '../components/ProductTable';
import { ProductFormModal } from '../components/ProductFormModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { Product } from '../types';
import '../styles/inventory.css';
import { toast } from 'react-hot-toast';

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

  const handleFormSubmit = (productData: Omit<Product, 'id' | 'sku' | 'lastUpdated'>) => {
    if (editingProduct) {
      inventory.editProduct(editingProduct.id, productData);
      toast.success('Product updated successfully!');
    } else {
      inventory.addProduct(productData);
      toast.success('Product added successfully!');
    }
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      inventory.deleteProduct(productToDelete.id);
      toast.success('Product deleted successfully!');
    }
  };

  return (
    <InventoryLayout 
      filters={inventory.filters} 
      updateFilter={inventory.updateFilter}
      onAddClick={handleAddClick}
    >
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
