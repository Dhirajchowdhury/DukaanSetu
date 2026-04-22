import React from 'react';
import { InventoryFilterState } from '../types';
import { mockCategories } from '../data/mockData';

interface CategorySidebarProps {
  filters: InventoryFilterState;
  updateFilter: (key: keyof InventoryFilterState, value: any) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ filters, updateFilter }) => {
  return (
    <aside className="category-sidebar">
      <div className="sidebar-header">Categories</div>
      <ul className="category-list">
        <li 
          className={`category-item ${filters.categoryId === null ? 'active' : ''}`}
          onClick={() => updateFilter('categoryId', null)}
        >
          <span>All Categories</span>
        </li>
        {mockCategories.map((category) => (
          <li 
            key={category.id}
            className={`category-item ${filters.categoryId === category.id ? 'active' : ''}`}
            onClick={() => updateFilter('categoryId', category.id)}
          >
            <span>{category.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};
