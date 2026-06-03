import React, { useState } from 'react';
import { InventoryHeader } from './InventoryHeader';
import { CategorySidebar } from './CategorySidebar';
import { InventoryFilterState, Product } from '../types';
import { useInventory } from '../hooks/useInventory';
import { ProductTable } from './ProductTable';
import { ProductFormModal } from './ProductFormModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
// @ts-ignore
import Sidebar from '../../../components/layout/Sidebar';

interface InventoryLayoutProps {
  children?: React.ReactNode;
  filters?: InventoryFilterState;
  updateFilter?: (key: keyof InventoryFilterState, value: any) => void;
  onAddClick?: () => void;
}

export const InventoryLayout: React.FC<InventoryLayoutProps> = ({ 
  children, 
  filters, 
  updateFilter,
  onAddClick 
}) => {
  const isSelfContained = !children;
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

  const activeFilters = filters || inventory.filters;
  const activeUpdateFilter = updateFilter || inventory.updateFilter;
  const activeOnAddClick = onAddClick || handleAddClick;

  const innerContent = (
    <div className="flex flex-col gap-6 w-full">
      <InventoryHeader 
        filters={activeFilters} 
        updateFilter={activeUpdateFilter} 
        onAddClick={activeOnAddClick} 
      />
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        <CategorySidebar filters={activeFilters} updateFilter={activeUpdateFilter} />
        
        <div className="flex-1 w-full">
          {isSelfContained ? (
            <>
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
            </>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );

  if (isSelfContained) {
    return (
      <div className="dashboard-layout bg-gray-50">
        <Sidebar />
        <main className="dashboard-main bg-gray-50 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {innerContent}
          </div>
        </main>
      </div>
    );
  }

  return innerContent;
};
