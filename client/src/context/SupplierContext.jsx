import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supplierService } from '../services/supplier.service';
import toast from 'react-hot-toast';

const SupplierContext = createContext();

export const useSuppliers = () => useContext(SupplierContext);

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supplierService.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const value = {
    suppliers,
    loading,
    fetchSuppliers
  };

  return (
    <SupplierContext.Provider value={value}>
      {children}
    </SupplierContext.Provider>
  );
};
