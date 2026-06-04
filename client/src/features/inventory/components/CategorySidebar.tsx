import React, { useState, useEffect } from 'react';
import { InventoryFilterState } from '../types';
// @ts-ignore
import api from '../../../services/api';

interface Category {
  id: string;
  _id?: string;
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
        const raw: Category[] = data.categories || [];

        // FIX 1 — deduplicate by id (API sometimes returns defaults + user cats merged)
        const unique = Array.from(
          new Map(raw.map(c => [c.id || c._id, c])).values()
        );

        setCategories(unique);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  return (
    /* FIX 2 — overflow-x hidden on the container */
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col flex-shrink-0 h-fit"
      style={{ width: '220px', minWidth: '180px', overflowX: 'hidden' }}
    >
      <div className="font-bold text-base text-gray-800 pb-3 border-b border-gray-100 px-1 mb-3">
        Categories
      </div>

      <ul className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto overflow-x-hidden">

        {/* All Categories item */}
        <li
          className={`px-3.5 py-2.5 rounded-lg cursor-pointer text-sm transition ${
            filters.categoryId === null
              ? 'bg-indigo-50 text-indigo-600 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          onClick={() => updateFilter('categoryId', null)}
        >
          <span
            style={{
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            All Categories
          </span>
        </li>

        {/* FIX 1 — render deduplicated list; FIX 2 — ellipsis + title tooltip */}
        {categories.map((category) => {
          const catId = category.id || category._id || '';
          return (
            <li
              key={catId}
              title={category.name}   /* FIX 2 — hover shows full name */
              className={`px-3.5 py-2.5 rounded-lg cursor-pointer text-sm transition ${
                filters.categoryId === catId
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => updateFilter('categoryId', catId)}
            >
              <span
                style={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {category.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
