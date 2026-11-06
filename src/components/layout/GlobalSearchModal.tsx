import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Search, Boxes, ShoppingBag, Building2, MapPin, X, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { products, salesOrders, customers, batches } = useErpStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchingProducts = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 4)
    : [];

  const matchingOrders = q
    ? salesOrders
        .filter((o) => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
        .slice(0, 4)
    : [];

  const matchingCustomers = q
    ? customers
        .filter((c) => c.businessName?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        .slice(0, 4)
    : [];

  const matchingBatches = q
    ? batches
        .filter((b) => b.batchNumber.toLowerCase().includes(q) || b.productName.toLowerCase().includes(q))
        .slice(0, 3)
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  const hasResults =
    matchingProducts.length > 0 ||
    matchingOrders.length > 0 ||
    matchingCustomers.length > 0 ||
    matchingBatches.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] p-4 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across SKUs, orders, customers, batches..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto py-3 space-y-4">
          {!q ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Type at least 2 characters to search across products, orders, customers, and batches.
            </div>
          ) : !hasResults ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No matching records found for "{query}".
            </div>
          ) : (
            <>
              {matchingProducts.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                    Products & SKUs
                  </div>
                  {matchingProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelect('/admin/products')}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Boxes className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-bold text-slate-900">{p.name}</span>
                          <span className="text-slate-500 ml-2 font-mono">SKU: {p.sku}</span>
                        </div>
                      </div>
                      <Badge variant="primary" size="sm">
                        ₹{p.standardSellingPrice.toLocaleString('en-IN')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {matchingOrders.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                    Sales Orders
                  </div>
                  {matchingOrders.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => handleSelect('/admin/orders')}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-4 h-4 text-cyan-600" />
                        <div>
                          <span className="font-bold text-slate-900 font-mono">{o.orderNumber}</span>
                          <span className="text-slate-500 ml-2">— {o.customerName}</span>
                        </div>
                      </div>
                      <Badge variant={o.status === 'dispatched' ? 'success' : 'warning'} size="sm">
                        {o.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {matchingCustomers.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                    Dealers & Customers
                  </div>
                  {matchingCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelect('/admin/dashboard')}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-bold text-slate-900">{c.businessName || c.name}</span>
                          <span className="text-slate-500 ml-2">{c.address}</span>
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {c.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {matchingBatches.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                    Batches & Inventory
                  </div>
                  {matchingBatches.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => handleSelect('/admin/stock')}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="font-bold text-slate-900 font-mono">Batch: {b.batchNumber}</span>
                          <span className="text-slate-500 ml-2">— {b.productName}</span>
                        </div>
                      </div>
                      <span className="text-emerald-700 font-bold">{b.availableQuantity} avail</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
