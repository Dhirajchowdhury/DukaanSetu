import { useState, useMemo, useCallback } from 'react';
import { Product, InventoryFilterState, SortField, SortOrder } from '../types';
import { mockProducts } from '../data/mockData';
import { useDebounce } from './useDebounce';

export function useInventory() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [filters, setFilters] = useState<InventoryFilterState>({
    searchQuery: '',
    categoryId: null,
    status: 'All',
    sortBy: 'lastUpdated',
    sortOrder: 'desc',
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const debouncedSearch = useDebounce(filters.searchQuery, 300);

  // Filter and Sort
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.sku.toLowerCase().includes(lowerQuery) ||
          p.categoryName.toLowerCase().includes(lowerQuery)
      );
    }

    // Category
    if (filters.categoryId) {
      result = result.filter((p) => p.categoryId === filters.categoryId);
    }

    // Status
    if (filters.status !== 'All') {
      result = result.filter((p) => p.status === filters.status);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[filters.sortBy];
      let bVal = b[filters.sortBy];

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return filters.sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [products, debouncedSearch, filters.categoryId, filters.status, filters.sortBy, filters.sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedProducts, page]);

  // Actions
  const updateFilter = useCallback((key: keyof InventoryFilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset page on filter change
  }, []);

  const addProduct = useCallback((newProduct: Omit<Product, 'id' | 'sku' | 'lastUpdated'>) => {
    const id = `prod-${Date.now()}`;
    const sku = `SKU-${newProduct.categoryName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
    const lastUpdated = new Date().toISOString();
    
    setProducts((prev) => [{ ...newProduct, id, sku, lastUpdated }, ...prev]);
  }, []);

  const editProduct = useCallback((id: string, updatedProduct: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedProduct, lastUpdated: new Date().toISOString() } : p))
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products: paginatedProducts,
    totalProducts: filteredAndSortedProducts.length,
    totalPages,
    page,
    setPage,
    filters,
    updateFilter,
    addProduct,
    editProduct,
    deleteProduct,
  };
}
