import React from 'react';
import { InventoryHeader } from './InventoryHeader';
import { CategorySidebar } from './CategorySidebar';
import { InventoryFilterState } from '../types';

interface InventoryLayoutProps {
  children: React.ReactNode;
  filters: InventoryFilterState;
  updateFilter: (key: keyof InventoryFilterState, value: any) => void;
  onAddClick: () => void;
}

export const InventoryLayout: React.FC<InventoryLayoutProps> = ({ 
  children, 
  filters, 
  updateFilter,
  onAddClick 
}) => {
  return (
    <div className="inventory-container">
      <div className="inventory-main">
        <InventoryHeader 
          filters={filters} 
          updateFilter={updateFilter} 
          onAddClick={onAddClick} 
        />
        <div className="inventory-content">
          <CategorySidebar filters={filters} updateFilter={updateFilter} />
          {children}
        </div>
      </div>
    </div>
  );
};
