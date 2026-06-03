import React from 'react';
import { FiSearch, FiPlus, FiTag } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { InventoryFilterState } from '../types';
import VoiceSearch from '../../../components/VoiceSearch';

interface InventoryHeaderProps {
  filters: InventoryFilterState;
  updateFilter: (key: keyof InventoryFilterState, value: any) => void;
  onAddClick: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  filters,
  updateFilter,
  onAddClick,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pb-2 w-full">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your entire stock, prices, and categories efficiently.</p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
        {/* Prominent Search Bar */}
        <div className="relative flex-1 sm:flex-initial min-w-[200px] sm:w-72 flex items-center gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm placeholder-gray-400 transition bg-white shadow-sm"
              placeholder="Search products or SKU..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
            />
          </div>
          <VoiceSearch onResult={(text) => updateFilter('searchQuery', text)} />
        </div>

        {/* Add Category */}
        <button
          className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition text-sm font-semibold flex items-center gap-2 bg-white shadow-sm flex-shrink-0 whitespace-nowrap"
          onClick={() => navigate('/categories')}
          title="Manage categories"
        >
          <FiTag className="w-4 h-4" />
          Add Category
        </button>

        {/* Add Product */}
        <button 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-semibold flex items-center gap-2 shadow-sm shadow-indigo-100 flex-shrink-0 whitespace-nowrap" 
          onClick={onAddClick}
        >
          + Add Product
        </button>
      </div>
    </div>
  );
};
