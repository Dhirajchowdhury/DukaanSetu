import { useEffect, useState, useCallback } from 'react';
import { useProducts } from '../../context/ProductContext';
import { format } from 'date-fns';
import {
  FiEdit2, FiTrash2, FiPlus, FiSearch, FiFilter,
  FiChevronUp, FiChevronDown, FiX,
} from 'react-icons/fi';
import ProductModal from '../products/ProductModal';
import './ProductTable.css';

const STOCK_FILTERS = [
  { value: '', label: 'All Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
];

const ProductTable = ({ compact = false }) => {
  const { products, categories, loading, fetchProducts, deleteProduct } = useProducts();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(() => {
    fetchProducts({
      search,
      category: categoryFilter,
      stockLevel: stockFilter,
      sortBy,
      order,
      limit: compact ? 8 : 50,
    });
  }, [search, categoryFilter, stockFilter, sortBy, order, compact]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col) => {
    if (sortBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setOrder('asc'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    load();
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditProduct(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditProduct(null);
    load();
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return null;
    return order === 'asc' ? <FiChevronUp /> : <FiChevronDown />;
  };

  const getStockBadge = (product) => {
    if (product.quantity === 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (product.isLowStock) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
  };

  return (
    <>
      <div className="product-table-card card">
        {/* Header */}
        <div className="pt-header">
          <div>
            <h2 className="pt-title">{compact ? 'Recent Products' : 'All Products'}</h2>
            <p className="pt-subtitle">{products.length} items</p>
          </div>
          <div className="pt-actions">
            <div className="pt-search-wrap">
              <FiSearch className="pt-search-icon" />
              <input
                className="pt-search"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="pt-search-clear" onClick={() => setSearch('')}>
                  <FiX />
                </button>
              )}
            </div>
            <button
              className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(f => !f)}
            >
              <FiFilter /> Filters
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>
              <FiPlus /> Add Product
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="pt-filters">
            <select
              className="form-select pt-filter-select"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <select
              className="form-select pt-filter-select"
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
            >
              {STOCK_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {(categoryFilter || stockFilter) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setCategoryFilter(''); setStockFilter(''); }}
              >
                <FiX /> Clear
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No products found</h3>
            <p>Add your first product to get started</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={handleAdd}>
              <FiPlus /> Add Product
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('productName')}>
                    Product <SortIcon col="productName" />
                  </th>
                  <th>Category</th>
                  <th className="sortable" onClick={() => handleSort('quantity')}>
                    Qty <SortIcon col="quantity" />
                  </th>
                  <th>Status</th>
                  <th className="sortable" onClick={() => handleSort('expiryDate')}>
                    Expiry <SortIcon col="expiryDate" />
                  </th>
                  <th className="sortable" onClick={() => handleSort('sellingPrice')}>
                    Price <SortIcon col="sellingPrice" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product._id}>
                    <td>
                      <div className="pt-product-cell">
                        <div className="pt-product-name">{product.productName}</div>
                        {product.brand && <div className="pt-product-brand">{product.brand}</div>}
                      </div>
                    </td>
                    <td>
                      {product.categoryId ? (
                        <span className="badge badge-neutral">
                          {product.categoryId.icon} {product.categoryId.name}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`pt-qty ${product.quantity === 0 ? 'pt-qty--out' : product.isLowStock ? 'pt-qty--low' : ''}`}>
                        {product.quantity} {product.unit}
                      </span>
                    </td>
                    <td>{getStockBadge(product)}</td>
                    <td>
                      {product.expiryDate ? (
                        <span className={product.isExpiringSoon ? 'pt-expiry--soon' : ''}>
                          {format(new Date(product.expiryDate), 'dd MMM yyyy')}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {product.sellingPrice
                        ? `₹${product.sellingPrice.toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td>
                      <div className="pt-row-actions">
                        <button
                          className="btn-icon pt-btn-edit"
                          title="Edit"
                          onClick={() => handleEdit(product)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn-icon pt-btn-delete"
                          title="Delete"
                          onClick={() => handleDelete(product._id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ProductModal
          product={editProduct}
          onClose={handleModalClose}
        />
      )}
    </>
  );
};

export default ProductTable;
