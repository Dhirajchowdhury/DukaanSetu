import { Category, Product, ProductStatus } from '../types';

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Electronics' },
  { id: 'cat-2', name: 'Groceries' },
  { id: 'cat-3', name: 'Apparel' },
  { id: 'cat-4', name: 'Home & Kitchen' },
  { id: 'cat-5', name: 'Beauty & Health' },
  { id: 'cat-6', name: 'Sports' },
  { id: 'cat-7', name: 'Automotive' },
  { id: 'cat-8', name: 'Toys & Games' },
];

const generateProducts = (count: number): Product[] => {
  const products: Product[] = [];
  const statusOptions: ProductStatus[] = ['In Stock', 'Low Stock', 'Out of Stock'];
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    const category = mockCategories[Math.floor(Math.random() * mockCategories.length)];
    const quantity = Math.floor(Math.random() * 500);
    let status: ProductStatus = 'In Stock';
    if (quantity === 0) status = 'Out of Stock';
    else if (quantity < 20) status = 'Low Stock';

    const hasExpiry = Math.random() > 0.5;
    const expiryDate = hasExpiry
      ? new Date(now.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString()
      : null;

    products.push({
      id: `prod-${i}`,
      name: `Product ${i} - ${category.name} Item`,
      categoryId: category.id,
      categoryName: category.name,
      quantity,
      price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
      expiryDate,
      status,
      sku: `SKU-${category.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
      lastUpdated: new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  return products;
};

// Generate 2000 products for performance testing
export const mockProducts = generateProducts(2000);
