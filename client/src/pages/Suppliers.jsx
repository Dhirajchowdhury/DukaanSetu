import React, { useState, useMemo } from 'react';
import { useSuppliers } from '../context/SupplierContext';
import Layout from '../components/layout/Layout';

const Suppliers = () => {
  const { suppliers, loading } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search logic could be added here, but for now simple filter
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  return (
    <Layout>
      <div className="page-header">
        <h1>Suppliers Directory</h1>
        <p>Manage and find your product suppliers.</p>
      </div>

      <div className="filters-section" style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Search suppliers..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading suppliers...</p>
      ) : (
        <div className="grid-cards">
          {filteredSuppliers.map(supplier => (
            <div key={supplier._id} className="card supplier-card" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3>{supplier.name}</h3>
              <p>Rating: {supplier.rating} / 5</p>
              <p>Contact: {supplier.contact?.phone || 'N/A'}</p>
              <button className="btn btn-primary" style={{ marginTop: '10px' }}>View Details</button>
            </div>
          ))}
          {filteredSuppliers.length === 0 && <p>No suppliers found.</p>}
        </div>
      )}
    </Layout>
  );
};

export default Suppliers;
