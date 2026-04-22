import React from 'react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import { InventoryFilterState } from '../types';

interface InventoryHeaderProps {
  filters: InventoryFilterState;
  updateFilter: (key: keyof InventoryFilterState, value: any) => void;
  onAddClick: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({ filters, updateFilter, onAddClick }) => {
  return (
    <div className="inventory-header">
      <div className="inventory-title">
        <h1>Inventory Management</h1>
        <p>Manage your entire stock, prices, and categories efficiently.</p>
      </div>
      <div className="inventory-actions">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={onAddClick}>
          <FiPlus />
          Add Product
        </button>
      </div>
    </div>
  );
};
