import React from 'react';
import { FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { Product, InventoryFilterState, SortField, SortOrder, ProductStatus } from '../types';

interface ProductTableProps {
  products: Product[];
  totalProducts: number;
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  filters: InventoryFilterState;
  updateFilter: (key: keyof InventoryFilterState, value: any) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  totalPages,
  page,
  setPage,
  filters,
  updateFilter,
  onEdit,
  onDelete,
}) => {
  const handleSort = (field: SortField) => {
    if (filters.sortBy === field) {
      updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      updateFilter('sortBy', field);
      updateFilter('sortOrder', 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (filters.sortBy !== field) return null;
    return filters.sortOrder === 'asc' ? <FiChevronUp className="inline-block ml-1 text-blue-600" /> : <FiChevronDown className="inline-block ml-1 text-blue-600" />;
  };

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'In Stock':
        return (
          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">
            Healthy
          </span>
        );
      case 'Low Stock':
        return (
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
            Low Stock
          </span>
        );
      case 'Out of Stock':
        return (
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full">
      
      {/* Product Table Wrapper */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col w-full">
        {/* Integrated Dropdown Filter */}
        <div className="p-4 border-b border-gray-100 flex items-center bg-white">
          <select 
            className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer font-medium"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value as ProductStatus | 'All')}
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">Healthy</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50/75 text-gray-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-[0_1px_0_rgba(229,231,235,1)] border-b border-gray-200">
              <tr>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold cursor-pointer hover:text-indigo-600 transition-colors select-none" 
                  onClick={() => handleSort('name')}
                >
                  PRODUCT NAME {renderSortIcon('name')}
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold"
                >
                  CATEGORY
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold cursor-pointer hover:text-indigo-600 transition-colors select-none" 
                  onClick={() => handleSort('quantity')}
                >
                  QUANTITY {renderSortIcon('quantity')}
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold"
                >
                  PRICE
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold cursor-pointer hover:text-indigo-600 transition-colors select-none" 
                  onClick={() => handleSort('status')}
                >
                  STATUS {renderSortIcon('status')}
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold cursor-pointer hover:text-indigo-600 transition-colors select-none" 
                  onClick={() => handleSort('expiryDate')}
                >
                  EXPIRY DATE {renderSortIcon('expiryDate')}
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left font-bold"
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-blue-50 transition even:bg-gray-50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-medium">
                      {product.categoryName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                      {product.quantity} <span className="text-xs text-gray-400 font-normal ml-0.5">{product.unit || ''}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-semibold">
                      ₹{product.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-medium">
                      {formatDate(product.expiryDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2.5">
                        <button 
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" 
                          onClick={() => onEdit(product)} 
                          title="Edit Product"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" 
                          onClick={() => onDelete(product.id)} 
                          title="Delete Product"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-sm font-medium text-gray-600">
          <div>
            Showing page <span className="text-gray-900 font-semibold">{page}</span> of <span className="text-gray-900 font-semibold">{totalPages || 1}</span>
          </div>
          <div className="flex gap-2">
            <button 
              className="px-3.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold shadow-sm" 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button 
              className="px-3.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold shadow-sm" 
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
