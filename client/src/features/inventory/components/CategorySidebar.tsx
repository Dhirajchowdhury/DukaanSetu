import React, { useState, useEffect } from 'react';
import { InventoryFilterState } from '../types';
import api from '../../../services/api';

interface Category {
  id: string;
  name: string;
}

interface CategorySidebarProps {
  filters: InventoryFilterState;
  updateFilter: (key: keyof InventoryFilterState, value: any) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ filters, updateFilter }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

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
        {categories.map((category) => (
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
