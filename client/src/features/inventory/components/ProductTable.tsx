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
    return filters.sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />;
  };

  const getStatusClass = (status: ProductStatus) => {
    switch (status) {
      case 'In Stock': return 'status-in-stock';
      case 'Low Stock': return 'status-low-stock';
      case 'Out of Stock': return 'status-out-of-stock';
      default: return '';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="table-container">
      <div className="table-header-actions">
        <div className="filter-group">
          <select 
            className="select-input"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value as ProductStatus | 'All')}
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>
      
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Product Name {renderSortIcon('name')}</th>
              <th>Category</th>
              <th onClick={() => handleSort('quantity')}>Quantity {renderSortIcon('quantity')}</th>
              <th>Price</th>
              <th onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</th>
              <th onClick={() => handleSort('expiryDate')}>Expiry Date {renderSortIcon('expiryDate')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">No products found matching your criteria.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--inv-text-secondary)' }}>{product.sku}</div>
                  </td>
                  <td>{product.categoryName}</td>
                  <td>{product.quantity}</td>
                  <td>${product.price.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>{formatDate(product.expiryDate)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-btn" onClick={() => onEdit(product)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="icon-btn delete" onClick={() => onDelete(product.id)} title="Delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div>
          Showing page {page} of {totalPages || 1}
        </div>
        <div className="page-buttons">
          <button 
            className="page-btn" 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <button 
            className="page-btn" 
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
