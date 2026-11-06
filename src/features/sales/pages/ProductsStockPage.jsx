import { useState, useMemo } from 'react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import ProductDetailModal from '../components/modals/ProductDetailModal';
import EditProductModal from '../components/modals/EditProductModal';
import { useSales } from '../context/SalesContext';
import { formatINR } from '../utils/formatters';
import { Eye, Edit3, Info } from 'lucide-react';

export default function ProductsStockPage() {
  const { products, invoices = [], orders = [], userRole } = useSales();
  const isStoreManager = userRole === 'sales_manager' || userRole === 'store_manager' || userRole === 'admin';

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    supplyType: 'all',
    category: 'all',
    status: 'all',
    expiry: 'all',
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Stock status determination based on standard inventory rules
  const getProductStockStatus = (p) => {
    const avail = Number(p.availableQty ?? 0);
    const min = Number(p.minStockLevel ?? 0);
    if (avail <= 0 || (p.shortageQty && p.shortageQty > 0)) {
      return p.status === 'Shortage' ? 'Shortage' : 'Critical Shortage';
    }
    if (avail < min) {
      return 'Low Stock';
    }
    return 'In Stock';
  };

  // Extract distinct categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).map((c) => ({
      value: c,
      label: c,
    }));
  }, [products]);

  const filters = [
    {
      key: 'supplyType',
      label: 'Supply Type',
      options: [
        { value: 'Manufactured', label: 'Manufactured' },
        { value: 'Bought for Resale', label: 'Bought for Resale' },
        { value: 'Both', label: 'Both (Mfg & Resale)' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      options: categories,
    },
    {
      key: 'status',
      label: 'Stock Status',
      options: [
        { value: 'In Stock', label: 'In Stock' },
        { value: 'Low Stock', label: 'Low Stock' },
        { value: 'Shortage', label: 'Shortage / Critical' },
      ],
    },
    {
      key: 'expiry',
      label: 'Expiry Status',
      options: [
        { value: 'near_expiry', label: 'Near Expiry (Within 30 Days)' },
        { value: 'has_expiry', label: 'Batch Expiry Tracked' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ supplyType: 'all', category: 'all', status: 'all', expiry: 'all' });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase());

      const matchesSupply =
        filterValues.supplyType === 'all' || p.supplyType === filterValues.supplyType;
      const matchesCategory =
        filterValues.category === 'all' || p.category === filterValues.category;

      const currentStatus = getProductStockStatus(p);
      const matchesStatus =
        filterValues.status === 'all' ||
        (filterValues.status === 'Shortage'
          ? currentStatus === 'Shortage' || currentStatus === 'Critical Shortage'
          : currentStatus === filterValues.status);

      const matchesExpiry =
        filterValues.expiry === 'all' ||
        (filterValues.expiry === 'has_expiry' && Boolean(p.expiryDate)) ||
        (filterValues.expiry === 'near_expiry' && p.expiryDate && p.expiryDate <= '2026-11-20');

      return matchesSearch && matchesSupply && matchesCategory && matchesStatus && matchesExpiry;
    });
  }, [products, search, filterValues]);

  // Columns in exact requested order:
  // Product ID, Product Name, Total Stock, Available to Sell, Selling Price, Invoice Value, Status, Actions
  const columns = [
    {
      header: 'Product ID',
      key: 'code',
      width: '145px',
      minWidth: '135px',
      render: (p) => (
        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {p.code}
        </span>
      ),
    },
    {
      header: 'Product Name',
      key: 'name',
      width: '260px',
      minWidth: '220px',
      render: (p) => (
        <div>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSelectedProduct(p)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            {p.name}
          </button>
          <div className="text-xs text-muted">
            <span>{p.category}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Total Stock',
      key: 'totalQty',
      width: '120px',
      minWidth: '105px',
      align: 'center',
      render: (p) => (
        <span className="font-medium">
          {p.totalQty} {p.uom}
        </span>
      ),
    },
    {
      header: 'Available to Sell',
      key: 'availableQty',
      width: '160px',
      minWidth: '140px',
      align: 'center',
      render: (p) => {
        const avail = Number(p.availableQty ?? (p.totalQty - (p.reservedQty || 0) - (p.unavailableQty || 0)));
        const isShortage = avail <= 0;
        const isLow = avail < p.minStockLevel && !isShortage;
        const hasRestrictions = (p.reservedQty > 0) || (p.unavailableQty > 0);

        return (
          <div>
            <span
              className={`stock-indicator-pill ${
                isShortage ? 'stock-low text-danger' : isLow ? 'stock-warning' : 'stock-ok'
              }`}
            >
              {avail} {p.uom}
            </span>
            {hasRestrictions && (
              <div
                className="text-xxs text-muted mt-0.5"
                style={{ fontSize: '10.5px', color: '#64748b' }}
                title={`On-Hand: ${p.totalQty} | Reserved for orders: ${p.reservedQty} | Restricted (QC/Quarantine): ${p.unavailableQty || 0} => Net Available: ${avail} ${p.uom}`}
              >
                {p.reservedQty > 0 && `${p.reservedQty} res`}
                {p.reservedQty > 0 && p.unavailableQty > 0 && ' • '}
                {p.unavailableQty > 0 && `${p.unavailableQty} in QC`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Selling Price',
      key: 'salePrice',
      width: '130px',
      minWidth: '115px',
      align: 'right',
      render: (p) => (
        <div style={{ textAlign: 'right' }}>
          <span className="font-semibold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(p.salePrice)}
          </span>
          <span className="text-xs text-muted block">+{p.taxRate}% GST</span>
        </div>
      ),
    },
    {
      header: 'Invoice Value',
      key: 'invoiceValue',
      width: '150px',
      minWidth: '135px',
      align: 'right',
      render: (p) => {
        // Basic selling price + applicable GST rate
        const unitInvoiceRate = Math.round(p.salePrice * (1 + (p.taxRate || 18) / 100));

        // Matching posted invoices from actual invoice records
        const matchedInvoices = [];
        let totalInvoicedForProduct = 0;
        invoices.forEach((inv) => {
          const ord = orders.find((o) => o.orderNo === inv.orderNo);
          if (ord && ord.items) {
            ord.items.forEach((item) => {
              if (item.productId === p.id || item.productId === p.code || item.productName === p.name) {
                const lineAmt = item.lineTotal || Math.round(item.unitPrice * (item.orderedQty || item.qty || 1) * (1 + (item.taxRate || 18) / 100));
                totalInvoicedForProduct += lineAmt;
                if (!matchedInvoices.some((m) => m.invoiceNo === inv.invoiceNo)) {
                  matchedInvoices.push(inv);
                }
              }
            });
          }
        });

        return (
          <div style={{ textAlign: 'right' }}>
            <span
              className="font-bold text-slate-900"
              style={{ fontVariantNumeric: 'tabular-nums', display: 'block' }}
            >
              {formatINR(unitInvoiceRate)}
            </span>
            <span
              className="text-xs text-muted block"
              style={{ fontSize: '11px', marginTop: '1px', whiteSpace: 'nowrap' }}
            >
              {matchedInvoices.length > 0 ? (
                <span
                  title={`Linked to Invoice ${matchedInvoices.map((i) => i.invoiceNo).join(', ')} • Total Invoiced: ${formatINR(totalInvoicedForProduct)}`}
                  style={{ color: '#0369a1', fontWeight: '500' }}
                >
                  {matchedInvoices[0].invoiceNo}: {formatINR(totalInvoicedForProduct)}
                </span>
              ) : (
                <span>Incl. {p.taxRate}% GST</span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      width: '135px',
      minWidth: '125px',
      align: 'center',
      render: (p) => {
        const autoStatus = getProductStockStatus(p);
        return <StatusBadge status={autoStatus} size="small" />;
      },
    },
    {
      header: 'Actions',
      width: '80px',
      minWidth: '70px',
      align: 'center',
      render: (p) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => setSelectedProduct(p)}
            title="View product details"
          >
            <Eye size={15} />
          </button>
          {isStoreManager && (
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setEditingProduct(p)}
              title="Store Manager: Adjust inventory stock"
            >
              <Edit3 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Products &amp; Inventory Stock</h2>
          <p className="page-description">
            Complete inventory catalogue supporting multi-warehouse locations, batch/serial tracking, and real-time reservation
          </p>
        </div>
      </div>

      {/* Role Policy Callout */}
      <div className="alert-callout alert-callout-info mb-4">
        <Info size={16} className="callout-icon" />
        <div className="callout-text text-xs">
          <strong>Sales Information Access:</strong> Shows verified selling prices, applicable GST rates, reserved commitments, and net eligible-to-sell stock across all warehouses. Factory internal purchase/production costs are protected from Sales view by default.
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilterBar
        searchPlaceholder="Search by Product ID or Product Name…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Products Table */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        keyField="id"
        emptyMessage="No products match your search or filter criteria"
        pageSize={8}
        minWidth="1050px"
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />

      {/* Edit Product & Adjust Stock Modal */}
      <EditProductModal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
      />
    </div>
  );
}
