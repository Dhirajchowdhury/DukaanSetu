import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { Product, InventoryFilterState, ProductStatus } from '../types';
import { useDebounce } from './useDebounce';
import toast from 'react-hot-toast';

export function useInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const [filters, setFilters] = useState<InventoryFilterState>({
    searchQuery: '',
    categoryId: null,
    status: 'All',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const debouncedSearch = useDebounce(filters.searchQuery, 300);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: itemsPerPage,
        search: debouncedSearch,
        sortBy: filters.sortBy === 'name' ? 'productName' : filters.sortBy,
        order: filters.sortOrder,
      };

      if (filters.categoryId) params.category = filters.categoryId;
      if (filters.status === 'Low Stock') params.stockLevel = 'low';
      if (filters.status === 'Out of Stock') params.stockLevel = 'out';

      const { data } = await api.get('/products', { params });
      
      // Map backend fields to frontend Product interface
      const mappedProducts: Product[] = data.products.map((p: any) => ({
        id: p.id,
        name: p.productName,
        categoryId: p.category_id,
        categoryName: p.categories?.name || 'Uncategorized',
        quantity: p.quantity,
        price: p.sellingPrice || 0,
        expiryDate: p.expiryDate,
        status: p.quantity <= 0 ? 'Out of Stock' : p.isLowStock ? 'Low Stock' : 'In Stock',
        sku: p.barcode || 'N/A',
        lastUpdated: p.updatedAt,
      }));

      setProducts(mappedProducts);
      setTotalProducts(data.pagination.total);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.categoryId, filters.status, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilter = useCallback((key: keyof InventoryFilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const addProduct = async (productData: any) => {
    try {
      await api.post('/products', productData);
      toast.success('Product added successfully');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add product');
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const editProduct = async (id: string, productData: any) => {
    try {
      await api.put(`/products/${id}`, productData);
      toast.success('Product updated successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product');
      throw error;
    }
  };

  return {
    products,
    loading,
    totalProducts,
    totalPages,
    page,
    setPage,
    filters,
    updateFilter,
    addProduct,
    editProduct,
    deleteProduct,
    refresh: fetchProducts,
  };
}
