export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Category {
  id: string;
  name: string;
  count?: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  price: number;
  expiryDate: string | null;
  status: ProductStatus;
  sku: string;
  lastUpdated: string;
}

export type SortField = 'name' | 'quantity' | 'expiryDate' | 'status' | 'lastUpdated';
export type SortOrder = 'asc' | 'desc';

export interface InventoryFilterState {
  searchQuery: string;
  categoryId: string | null;
  status: ProductStatus | 'All';
  sortBy: SortField;
  sortOrder: SortOrder;
}
