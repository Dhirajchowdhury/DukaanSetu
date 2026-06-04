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

/* ── shared cell padding ── */
const CELL = { padding: '12px 16px', verticalAlign: 'middle' as const };
const HEAD = { ...CELL, textAlign: 'left' as const };

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (filters.sortBy !== field) return null;
    return filters.sortOrder === 'asc'
      ? <FiChevronUp className="inline-block ml-1 text-blue-600" />
      : <FiChevronDown className="inline-block ml-1 text-blue-600" />;
  };

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'In Stock':
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">Healthy</span>;
      case 'Low Stock':
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">Low Stock</span>;
      case 'Out of Stock':
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">Out of Stock</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col w-full">

        {/* Status filter */}
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

        {/* FIX 3 — overflow-x auto so table scrolls horizontally on narrow screens */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', tableLayout: 'fixed' }}>

            {/* FIX 3 — explicit column widths via colgroup */}
            <colgroup>
              <col style={{ width: '22%' }} />  {/* Product Name  */}
              <col style={{ width: '14%' }} />  {/* Category      */}
              <col style={{ width: '11%' }} />  {/* Quantity      */}
              <col style={{ width: '10%' }} />  {/* Price         */}
              <col style={{ width: '10%' }} />  {/* Margin        */}
              <col style={{ width: '12%' }} />  {/* Status        */}
              <col style={{ width: '14%' }} />  {/* Expiry Date   */}
              <col style={{ width: '7%'  }} />  {/* Actions       */}
            </colgroup>

            <thead style={{ background: 'rgba(249,250,251,0.75)', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('name')}>
                  PRODUCT NAME <SortIcon field="name" />
                </th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider">CATEGORY</th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('quantity')}>
                  QUANTITY <SortIcon field="quantity" />
                </th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider">PRICE</th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider">MARGIN</th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('status')}>
                  STATUS <SortIcon field="status" />
                </th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('expiryDate')}>
                  EXPIRY DATE <SortIcon field="expiryDate" />
                </th>
                <th style={HEAD} className="text-xs font-bold text-gray-500 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>

            <tbody style={{ background: '#fff' }}>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...CELL, textAlign: 'center', padding: '64px 24px' }}>
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No products yet</h3>
                      <p className="text-gray-500 text-sm">Clear filters or add a new product.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product, idx) => (
                  <tr
                    key={product.id}
                    style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 1 ? '#fafafa' : '#fff' }}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    {/* Product Name — name bold + SKU muted below, both ellipsis */}
                    <td style={CELL}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                        title={product.name}
                      >
                        {product.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          fontFamily: 'monospace',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                        title={product.sku}
                      >
                        {product.sku}
                      </div>
                    </td>

                    {/* Category */}
                    <td
                      style={{
                        ...CELL,
                        color: '#4b5563',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={product.categoryName}
                    >
                      {product.categoryName}
                    </td>

                    {/* Quantity — value bold, unit muted inline */}
                    <td style={CELL}>
                      {(() => {
                        const threshold = (product as any).reorderPoint || 10;
                        const qty = product.quantity;
                        const unit = (product as any).unit || '';

                        const qtyDisplay = (
                          <span>
                            <span style={{ fontWeight: 700 }}>{qty}</span>
                            {unit && (
                              <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: '3px', fontSize: '12px' }}>
                                {unit}
                              </span>
                            )}
                          </span>
                        );

                        if (qty === 0) {
                          return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">Out (0)</span>;
                        }
                        if (qty <= threshold) {
                          return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">Low ({qty}{unit ? ` ${unit}` : ''})</span>;
                        }
                        return <span style={{ whiteSpace: 'nowrap' }}>{qtyDisplay}</span>;
                      })()}
                    </td>

                    {/* Price */}
                    <td style={{ ...CELL, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                      ₹{product.price.toFixed(2)}
                    </td>

                    {/* Margin */}
                    <td style={CELL}>
                      {(product as any).costPrice ? (() => {
                        const margin = ((product.price - (product as any).costPrice) / product.price) * 100;
                        const color = margin > 20 ? '#16a34a' : margin > 10 ? '#d97706' : '#dc2626';
                        return <span style={{ fontWeight: 600, color }}>{margin.toFixed(1)}%</span>;
                      })() : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={CELL}>{getStatusBadge(product.status)}</td>

                    {/* Expiry Date */}
                    <td style={{ ...CELL, whiteSpace: 'nowrap' }}>
                      {(() => {
                        if (!product.expiryDate) return <span style={{ color: '#6b7280' }}>—</span>;
                        const days = Math.ceil((new Date(product.expiryDate).getTime() - Date.now()) / 86400000);
                        if (days < 0)  return <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatDate(product.expiryDate)} (Expired)</span>;
                        if (days <= 7) return <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatDate(product.expiryDate)} ({days}d)</span>;
                        return <span style={{ color: '#6b7280' }}>{formatDate(product.expiryDate)}</span>;
                      })()}
                    </td>

                    {/* Actions — icon buttons only, gap 8px, no labels */}
                    <td style={CELL}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', transition: 'all .15s' }}
                          onClick={() => onEdit(product)}
                          title="Edit Product"
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2563eb'; (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', transition: 'all .15s' }}
                          onClick={() => onDelete(product.id)}
                          title="Delete Product"
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-sm font-medium text-gray-600">
          <div>
            Page <span className="text-gray-900 font-semibold">{page}</span> of{' '}
            <span className="text-gray-900 font-semibold">{totalPages || 1}</span>
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
