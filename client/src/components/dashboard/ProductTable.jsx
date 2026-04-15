import { useEffect, useState } from 'react';
import { useProducts } from '../../context/ProductContext';
import { format } from 'date-fns';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './ProductTable.css';

const ProductTable = () => {
  const { products, loading, fetchProducts, deleteProduct } = useProducts();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts({ search, limit: 20 });
  }, [search]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      fetchProducts({ search, limit: 20 });
    }
  };

  if (loading) {
    return <div className="table-loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="product-table-container card">
      <div className="table-header">
        <h2>Recent Products</h2>
        <div className="table-actions">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button className="btn btn-primary">
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>No products found. Add new Products.. </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="product-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Expiry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div className="product-info">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.productName} className="product-thumb" />
                      )}
                      <div>
                        <div className="product-name">{product.productName}</div>
                        {product.brand && <div className="product-brand">{product.brand}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">
                      {product.categoryId?.icon} {product.categoryId?.name}
                    </span>
                  </td>
                  <td>
                    <span className={`quantity ${product.isLowStock ? 'low-stock' : ''}`}>
                      {product.quantity} {product.unit}
                    </span>
                  </td>
                  <td>
                    {product.expiryDate ? (
                      <span className={product.isExpiringSoon ? 'expiring-soon' : ''}>
                        {format(new Date(product.expiryDate), 'MMM dd, yyyy')}
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon btn-edit" title="Edit">
                        <FaEdit />
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        title="Delete"
                        onClick={() => handleDelete(product._id)}
                      >
                        <FaTrash />
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
  );
};

export default ProductTable;
