import React, { useState, useEffect } from 'react';
import { InventoryFilterState } from '../types';
// @ts-ignore
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 w-full lg:w-60 flex flex-col flex-shrink-0 h-fit">
      <div className="font-bold text-base text-gray-800 pb-3 border-b border-gray-100 px-1 mb-3">
        Categories
      </div>
      <ul className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
        <li 
          className={`px-3.5 py-2.5 rounded-lg cursor-pointer text-sm transition ${
            filters.categoryId === null 
              ? 'bg-indigo-50 text-indigo-600 font-semibold' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          onClick={() => updateFilter('categoryId', null)}
        >
          <span>All Categories</span>
        </li>
        {categories.map((category) => (
          <li 
            key={category.id}
            className={`px-3.5 py-2.5 rounded-lg cursor-pointer text-sm transition ${
              filters.categoryId === category.id 
                ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => updateFilter('categoryId', category.id)}
          >
            <span>{category.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
