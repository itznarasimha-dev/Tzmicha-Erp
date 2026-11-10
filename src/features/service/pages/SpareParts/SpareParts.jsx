import React, { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import PartDetailModal from './components/PartDetailModal';
import AdjustStockModal from './components/AdjustStockModal';
import AddEditPartModal from './components/AddEditPartModal';
import NewPartRequestModal from './components/NewPartRequestModal';
import ProposeNewItemModal from './components/ProposeNewItemModal';
import CollectionChecklistModal from './components/CollectionChecklistModal';
import RecordConsumptionModal from './components/RecordConsumptionModal';
import DeliveryStatusModal from './components/DeliveryStatusModal';
import DirectStockUsageModal from './components/DirectStockUsageModal';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import { useSchedule } from '../../context/ScheduleContext';
import { useRole } from '../../context/RoleContext';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  Eye,
  PackagePlus,
  Package,
  Layers,
  CheckCircle2,
  FileText,
  Plus,
  Edit3,
  Send,
  Check,
  PackageCheck,
  Sparkles,
  Truck,
  RotateCcw,
  History,
  CheckSquare,
  Wrench,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function SpareParts() {
  const { roleId } = useRole();
  const {
    spareParts,
    sparePartRequests,
    inventoryProposals = [],
    stockMovements = [],
    updateSparePartStock,
    editSparePart,
    addSparePartRequest,
    approveSparePartRequest,
    rejectSparePartRequest,
    issueSparePart,
    markPartCollected,
    recordPartConsumption,
    updateDeliveryStatus,
    recordDirectStockUsage,
    proposeInventoryItem,
    approveInventoryProposal,
    rejectInventoryProposal,
    storeApproveInventoryProposal,
    storeRejectInventoryProposal,
    addProposalToInventory
  } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';

  // Tabs: 'inventory' | 'requests' | 'proposals' | 'movements'
  const [activeTab, setActiveTab] = useState('inventory');

  // Inventory Filters
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    category: 'all',
    warehouse: 'all',
    status: 'all'
  });

  // Modals state
  const [selectedPart, setSelectedPart] = useState(null);
  const [adjustingPart, setAdjustingPart] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isDirectUsageOpen, setIsDirectUsageOpen] = useState(false);

  // Material request action modals
  const [checklistReq, setChecklistReq] = useState(null);
  const [consumptionReq, setConsumptionReq] = useState(null);
  const [deliveryReq, setDeliveryReq] = useState(null);

  // Extract unique categories & warehouses
  const categories = useMemo(() => {
    return Array.from(new Set(spareParts.map((p) => p.category))).map((c) => ({
      value: c,
      label: c
    }));
  }, [spareParts]);

  const warehouses = useMemo(() => {
    return Array.from(
      new Set(spareParts.map((p) => p.location?.split('(')[0]?.trim()).filter(Boolean))
    ).map((w) => ({
      value: w,
      label: w
    }));
  }, [spareParts]);

  const filters = [
    {
      key: 'category',
      label: 'Part Category',
      options: categories
    },
    {
      key: 'warehouse',
      label: 'Warehouse Hub',
      options: warehouses
    },
    {
      key: 'status',
      label: 'Stock Availability',
      options: [
        { value: 'In Stock', label: 'In Stock' },
        { value: 'Low Stock', label: 'Low Stock' },
        { value: 'Out of Stock', label: 'Out of Stock' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ category: 'all', warehouse: 'all', status: 'all' });
  };

  // 6 Summary KPI metrics
  const metrics = useMemo(() => {
    const totalSKUs = spareParts.length;
    const availableStock = spareParts.reduce((sum, p) => sum + Number(p.availableQty || 0), 0);
    const lowStock = spareParts.filter((p) => p.status === 'Low Stock').length;
    const outOfStock = spareParts.filter((p) => p.status === 'Out of Stock').length;
    const partsIssued = spareParts.reduce((sum, p) => sum + Number(p.usedQty || 0), 0);
    const pendingRequestsCount = sparePartRequests.filter(
      (r) => r.approvalStatus === 'Pending Manager Approval' || r.approvalStatus === 'Pending Store Manager Approval'
    ).length;

    return {
      totalSKUs,
      availableStock,
      lowStock,
      outOfStock,
      partsIssued,
      pendingRequestsCount
    };
  }, [spareParts, sparePartRequests]);

  // Filtered inventory list
  const filteredParts = useMemo(() => {
    return spareParts.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q) ||
        (p.specification && p.specification.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.compatibleProductId.toLowerCase().includes(q) ||
        p.compatibleProductName.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q));

      const matchesCat =
        filterValues.category === 'all' || p.category === filterValues.category;
      const matchesWh =
        filterValues.warehouse === 'all' || (p.location && p.location.includes(filterValues.warehouse));
      const matchesStatus =
        filterValues.status === 'all' || p.status === filterValues.status;

      return matchesSearch && matchesCat && matchesWh && matchesStatus;
    });
  }, [spareParts, search, filterValues]);

  // Filtered material requests list
  const filteredRequests = useMemo(() => {
    return sparePartRequests.filter((r) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.serviceRequestId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.partName.toLowerCase().includes(q) ||
        (r.partCode && r.partCode.toLowerCase().includes(q)) ||
        r.requestedBy.toLowerCase().includes(q)
      );
    });
  }, [sparePartRequests, search]);

  // Filtered proposals list
  const filteredProposals = useMemo(() => {
    return inventoryProposals.filter((p) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        p.id.toLowerCase().includes(q) ||
        p.partName.toLowerCase().includes(q) ||
        (p.partCode && p.partCode.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.proposedBy.toLowerCase().includes(q)
      );
    });
  }, [inventoryProposals, search]);

  // Filtered stock movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        m.id.toLowerCase().includes(q) ||
        m.partName.toLowerCase().includes(q) ||
        (m.partId && m.partId.toLowerCase().includes(q)) ||
        m.movementType.toLowerCase().includes(q) ||
        (m.serviceRequestId && m.serviceRequestId.toLowerCase().includes(q)) ||
        (m.customerName && m.customerName.toLowerCase().includes(q)) ||
        (m.performedBy && m.performedBy.toLowerCase().includes(q))
      );
    });
  }, [stockMovements, search]);

  // 1. Inventory Table Columns (Exact columns with Specification & UOM)
  const inventoryColumns = [
    {
      header: 'Part ID / Code',
      key: 'id',
      width: '120px',
      render: (p) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '12px', display: 'block' }}>
            {p.id}
          </span>
          {p.code && p.code !== p.id && (
            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
              {p.code}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Category',
      key: 'category',
      width: '140px',
      render: (p) => <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{p.category}</span>
    },
    {
      header: 'Part Name',
      key: 'name',
      width: '210px',
      render: (p) => (
        <div>
          <button
            type="button"
            className="font-semibold text-slate-900 hover:underline"
            onClick={() => setSelectedPart(p)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              display: 'block'
            }}
          >
            {p.name}
          </button>
        </div>
      )
    },
    {
      header: 'Specification',
      key: 'specification',
      width: '220px',
      render: (p) => (
        <span style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4', display: 'block' }}>
          {p.specification || 'Standard OEM Specification'}
        </span>
      )
    },
    {
      header: 'Compatible Equipment',
      key: 'compatibleProductName',
      width: '190px',
      render: (p) => (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 500, color: '#1e293b' }}>{p.compatibleProductName}</div>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
            {p.compatibleProductId}
          </span>
        </div>
      )
    },
    {
      header: 'Location / Warehouse',
      key: 'location',
      width: '170px',
      render: (p) => (
        <span style={{ fontSize: '11px', color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
          {p.location || 'Central Store'}
        </span>
      )
    },
    {
      header: 'Available Qty',
      key: 'availableQty',
      width: '110px',
      align: 'right',
      render: (p) => {
        const isOut = p.availableQty === 0;
        const isLow = p.availableQty <= p.minThreshold && p.availableQty > 0;
        return (
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isOut ? '#ef4444' : isLow ? '#d97706' : '#16a34a'
              }}
            >
              {p.availableQty}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Reserved Qty',
      key: 'reservedQty',
      width: '100px',
      align: 'right',
      render: (p) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>
          {p.reservedQty || 0}
        </span>
      )
    },
    {
      header: 'Min Stock',
      key: 'minThreshold',
      width: '100px',
      align: 'right',
      render: (p) => (
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {p.minThreshold || 5}
        </span>
      )
    },
    {
      header: 'UOM',
      key: 'uom',
      width: '80px',
      align: 'center',
      render: (p) => (
        <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
          {p.uom || 'Pcs'}
        </span>
      )
    },
    {
      header: 'Unit Price',
      key: 'unitPrice',
      width: '110px',
      align: 'right',
      render: (p) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
          {formatINR(p.unitPrice)}
        </span>
      )
    },
    {
      header: 'Stock Status',
      key: 'status',
      width: '115px',
      align: 'center',
      render: (p) => <StatusBadge status={p.status} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '110px',
      align: 'center',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => setSelectedPart(p)}
            title="Inspect full specifications & history"
          >
            <Eye size={15} />
          </button>
          {isManager && (
            <button
              type="button"
              className="table-action-icon-btn text-primary"
              onClick={() => setAdjustingPart(p)}
              title="Stock Adjustment / Inward Receipt"
            >
              <PackagePlus size={15} />
            </button>
          )}
        </div>
      )
    }
  ];

  // 2. Material Requests Columns
  const requestsColumns = [
    {
      header: 'Request ID',
      key: 'id',
      width: '110px',
      render: (r) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '12px' }}>
          {r.id}
        </span>
      )
    },
    {
      header: 'Service Request ID',
      key: 'serviceRequestId',
      width: '125px',
      render: (r) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>
          {r.serviceRequestId}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '170px',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>
          {r.customerName}
        </span>
      )
    },
    {
      header: 'Part Name & Code',
      key: 'partName',
      width: '190px',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px', display: 'block' }}>{r.partName}</span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>{r.partCode || r.partId}</span>
        </div>
      )
    },
    {
      header: 'Fulfilment Method',
      key: 'fulfilmentMethod',
      width: '160px',
      render: (r) => {
        const isCollect = r.fulfilmentMethod === 'engineer_collect';
        return (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600,
              backgroundColor: isCollect ? '#eff6ff' : '#f0fdf4',
              color: isCollect ? '#1d4ed8' : '#15803d',
              border: `1px solid ${isCollect ? '#bfdbfe' : '#bbf7d0'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isCollect ? <Wrench size={11} /> : <Truck size={11} />}
            <span>{isCollect ? 'Engineer Collects' : 'Store Delivers'}</span>
          </span>
        );
      }
    },
    {
      header: 'Req Qty',
      key: 'requestedQty',
      width: '75px',
      align: 'center',
      render: (r) => <span style={{ fontSize: '12px', fontWeight: 600 }}>{r.requestedQty}</span>
    },
    {
      header: 'Appr Qty',
      key: 'approvedQty',
      width: '75px',
      align: 'center',
      render: (r) => (
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
          {r.approvedQty || 0}
        </span>
      )
    },
    {
      header: 'Issued / Deliv',
      key: 'collectedQty',
      width: '95px',
      align: 'center',
      render: (r) => {
        const qty = r.fulfilmentMethod === 'store_deliver' ? r.dispatchedQty || 0 : r.collectedQty || 0;
        return <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>{qty}</span>;
      }
    },
    {
      header: 'Used',
      key: 'consumedQty',
      width: '65px',
      align: 'center',
      render: (r) => <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{r.consumedQty || 0}</span>
    },
    {
      header: 'Returned',
      key: 'returnedQty',
      width: '75px',
      align: 'center',
      render: (r) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: r.returnedQty > 0 ? '#15803d' : '#94a3b8' }}>
          {r.returnedQty || 0}
        </span>
      )
    },
    {
      header: 'Approval Status',
      key: 'approvalStatus',
      width: '130px',
      align: 'center',
      render: (r) => <StatusBadge status={r.approvalStatus} size="small" />
    },
    {
      header: 'Issue / Delivery Status',
      key: 'issueStatus',
      width: '130px',
      align: 'center',
      render: (r) => {
        const text = r.fulfilmentMethod === 'store_deliver' ? r.deliveryStatus || 'Pending' : r.issueStatus;
        return <StatusBadge status={text} size="small" />;
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '190px',
      align: 'center',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Manager Approval */}
          {isManager && r.approvalStatus === 'Pending Manager Approval' && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '2px 6px', height: '24px' }}
                onClick={() => approveSparePartRequest(r.id)}
                title="Approve Requisition"
              >
                <Check size={12} />
                <span>Approve</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '2px 6px', height: '24px', color: '#dc2626' }}
                onClick={() => {
                  const reason = window.prompt('Enter rejection reason:', 'Requisition denied by Service Manager.');
                  if (reason) rejectSparePartRequest(r.id, reason);
                }}
                title="Reject Requisition"
              >
                Reject
              </button>
            </>
          )}

          {/* Store Manager Issue Action */}
          {(isManager || isCoordinator) && r.approvalStatus === 'Pending Store Manager Approval' && r.issueStatus !== 'Issued' && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
              onClick={() => issueSparePart(r.id)}
              title="Store Manager: Issue Component and Deduct Stock"
            >
              <PackageCheck size={12} />
              <span>Issue Part</span>
            </button>
          )}

          {/* Option A: Engineer Collection Checklist */}
          {r.fulfilmentMethod === 'engineer_collect' && (r.approvalStatus === 'Pending Store Manager Approval' || r.issueStatus === 'Issued') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '2px 6px', height: '24px' }}
              onClick={() => setChecklistReq(r)}
              title="Open Collection Checklist"
            >
              <CheckSquare size={12} />
              <span>{r.collectionStatus === 'Collected' ? 'Collected' : 'Checklist'}</span>
            </button>
          )}

          {/* Option B: Store Delivery Status */}
          {r.fulfilmentMethod === 'store_deliver' && r.approvalStatus !== 'Rejected' && r.approvalStatus !== 'Pending Manager Approval' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '2px 6px', height: '24px' }}
              onClick={() => setDeliveryReq(r)}
              title="Update Delivery Tracking"
            >
              <Truck size={12} />
              <span>Delivery</span>
            </button>
          )}

          {/* Record Consumption on job */}
          {(r.collectionStatus === 'Collected' || r.deliveryStatus === 'Delivered' || r.issueStatus === 'Issued') && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11px', padding: '2px 6px', height: '24px' }}
              onClick={() => setConsumptionReq(r)}
              title="Record parts consumed on customer job and return remainder"
            >
              <RotateCcw size={12} />
              <span>Consume/Return</span>
            </button>
          )}
        </div>
      )
    }
  ];

  // 3. New Item Proposals Columns
  const proposalColumns = [
    {
      header: 'Proposal ID',
      key: 'id',
      width: '110px',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#8b5cf6', fontSize: '12px' }}>
          {p.id}
        </span>
      )
    },
    {
      header: 'Part Code',
      key: 'partCode',
      width: '100px',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
          {p.partCode}
        </span>
      )
    },
    {
      header: 'Part Name',
      key: 'partName',
      width: '200px',
      render: (p) => <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>{p.partName}</span>
    },
    {
      header: 'Category',
      key: 'category',
      width: '140px',
      render: (p) => <span style={{ fontSize: '12px', color: '#475569' }}>{p.category}</span>
    },
    {
      header: 'Specification',
      key: 'specification',
      width: '200px',
      render: (p) => <span style={{ fontSize: '11px', color: '#334155' }}>{p.specification}</span>
    },
    {
      header: 'Compatible Equipment',
      key: 'compatibleProductName',
      width: '180px',
      render: (p) => (
        <div style={{ fontSize: '11px' }}>
          <div style={{ fontWeight: 500, color: '#1e293b' }}>{p.compatibleProductName}</div>
          <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{p.compatibleProductId}</span>
        </div>
      )
    },
    {
      header: 'UOM',
      key: 'uom',
      width: '70px',
      align: 'center',
      render: (p) => (
        <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>
          {p.uom || 'Pcs'}
        </span>
      )
    },
    {
      header: 'Min Stock',
      key: 'minThreshold',
      width: '80px',
      align: 'right',
      render: (p) => <span style={{ fontSize: '12px' }}>{p.minThreshold}</span>
    },
    {
      header: 'Unit Price',
      key: 'unitPrice',
      width: '100px',
      align: 'right',
      render: (p) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
          {formatINR(p.unitPrice)}
        </span>
      )
    },
    {
      header: 'Proposed By & Date',
      key: 'proposedBy',
      width: '170px',
      render: (p) => (
        <div style={{ fontSize: '11px' }}>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.proposedBy}</div>
          <span style={{ color: '#64748b' }}>{formatDate(p.proposedDate)}</span>
        </div>
      )
    },
    {
      header: 'Proposal Status',
      key: 'status',
      width: '160px',
      align: 'center',
      render: (p) => <StatusBadge status={p.status} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '180px',
      align: 'center',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          {/* Manager Tier */}
          {isManager && p.status === 'Pending Manager Approval' && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
                onClick={() => approveInventoryProposal(p.id)}
                title="Manager Approve & Forward to Store"
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px', height: '24px', color: '#dc2626' }}
                onClick={() => {
                  const r = window.prompt('Rejection Reason:');
                  if (r) rejectInventoryProposal(p.id, r);
                }}
              >
                Reject
              </button>
            </>
          )}

          {/* Store Manager Tier */}
          {(isManager || isCoordinator) && p.status === 'Pending Store Manager Approval' && (
            <>
              <button
                type="button"
                className="btn btn-success btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
                onClick={() => storeApproveInventoryProposal(p.id)}
                title="Store Manager Approval"
              >
                Store Approve
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px', height: '24px', color: '#dc2626' }}
                onClick={() => {
                  const r = window.prompt('Rejection Reason:');
                  if (r) storeRejectInventoryProposal(p.id, r);
                }}
              >
                Reject
              </button>
            </>
          )}

          {/* Add to Active Inventory Catalog */}
          {(isManager || isCoordinator) && p.status === 'Approved' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
              onClick={() => addProposalToInventory(p.id)}
              title="Add into live Spare Parts Catalog"
            >
              <Plus size={12} />
              <span>Add to Inventory</span>
            </button>
          )}

          {p.status === 'Added to Inventory' && (
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
              Added to Catalog
            </span>
          )}
        </div>
      )
    }
  ];

  // 4. Stock Movements Columns
  const movementColumns = [
    {
      header: 'Movement ID',
      key: 'id',
      width: '110px',
      render: (m) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '12px' }}>
          {m.id}
        </span>
      )
    },
    {
      header: 'Date & Time',
      key: 'date',
      width: '110px',
      align: 'center',
      render: (m) => <span style={{ fontSize: '12px' }}>{formatDate(m.date)}</span>
    },
    {
      header: 'Movement Type',
      key: 'movementType',
      width: '180px',
      render: (m) => {
        let badgeColor = '#eff6ff';
        let textColor = '#1d4ed8';
        if (m.movementType.includes('Issue') || m.movementType.includes('Usage')) {
          badgeColor = '#fef2f2';
          textColor = '#b91c1c';
        } else if (m.movementType.includes('Return') || m.movementType.includes('Receipt')) {
          badgeColor = '#f0fdf4';
          textColor = '#15803d';
        }
        return (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 600,
              backgroundColor: badgeColor,
              color: textColor
            }}
          >
            {m.movementType}
          </span>
        );
      }
    },
    {
      header: 'Part Name & Code',
      key: 'partName',
      width: '200px',
      render: (m) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px', display: 'block' }}>{m.partName}</span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{m.partId}</span>
        </div>
      )
    },
    {
      header: 'Specification',
      key: 'specification',
      width: '180px',
      render: (m) => <span style={{ fontSize: '11px', color: '#475569' }}>{m.specification || 'OEM Standard'}</span>
    },
    {
      header: 'Qty Change',
      key: 'quantity',
      width: '100px',
      align: 'center',
      render: (m) => {
        const isDeduct = m.movementType.includes('Issue') || m.movementType.includes('Usage') || m.movementType.includes('Consumption');
        return (
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: isDeduct ? '#b91c1c' : '#15803d'
            }}
          >
            {isDeduct ? `-${m.quantity}` : `+${m.quantity}`}
          </span>
        );
      }
    },
    {
      header: 'Service Request',
      key: 'serviceRequestId',
      width: '125px',
      render: (m) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>
          {m.serviceRequestId || '—'}
        </span>
      )
    },
    {
      header: 'Customer',
      key: 'customerName',
      width: '160px',
      render: (m) => <span style={{ fontSize: '12px', color: '#334155' }}>{m.customerName || '—'}</span>
    },
    {
      header: 'Performed By',
      key: 'performedBy',
      width: '150px',
      render: (m) => <span style={{ fontSize: '12px', color: '#475569' }}>{m.performedBy}</span>
    },
    {
      header: 'Remarks',
      key: 'remarks',
      width: '200px',
      render: (m) => <span style={{ fontSize: '11px', color: '#64748b' }}>{m.remarks || '—'}</span>
    }
  ];

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Inventory"
        description="Manage company spare parts and materials directory, material requisitions, new item proposals and stock movements."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={() => setIsNewRequestOpen(true)}
            >
              <Send size={14} />
              <span>Request Parts for Job</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm btn-icon-text"
              onClick={() => setIsProposeOpen(true)}
              title="Propose New Inventory Item for Multi-tier Review"
            >
              <Sparkles size={14} />
              <span>Propose New Inventory Item</span>
            </button>
            {activeTab === 'movements' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon-text"
                onClick={() => setIsDirectUsageOpen(true)}
              >
                <Wrench size={14} />
                <span>Record Direct Stock Usage</span>
              </button>
            )}
          </div>
        }
      />

      {/* 6 Summary Cards */}
      <div
        className="kpi-grid-6"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Inventory SKUs</div>
          <div className="summary-kpi-value">{metrics.totalSKUs}</div>
          <div className="summary-kpi-sub">Active catalog components</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Available Stock</div>
          <div className="summary-kpi-value text-success">{metrics.availableStock}</div>
          <div className="summary-kpi-sub">Total physical units</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Low Stock Items</div>
          <div className="summary-kpi-value text-warning">{metrics.lowStock}</div>
          <div className="summary-kpi-sub">At or below reorder level</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">Out of Stock Items</div>
          <div className="summary-kpi-value text-danger">{metrics.outOfStock}</div>
          <div className="summary-kpi-sub">Depleted zero inventory</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">Parts Issued</div>
          <div className="summary-kpi-value text-primary">{metrics.partsIssued}</div>
          <div className="summary-kpi-sub">Consumed on service jobs</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #64748b' }}>
          <div className="summary-kpi-label">Pending Material Requests</div>
          <div className="summary-kpi-value">{metrics.pendingRequestsCount}</div>
          <div className="summary-kpi-sub">Awaiting review & dispatch</div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('inventory');
            handleReset();
          }}
        >
          <Package size={16} />
          <span>Inventory Directory ({spareParts.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('requests');
            handleReset();
          }}
        >
          <FileText size={16} />
          <span>Material Requests ({sparePartRequests.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('proposals');
            handleReset();
          }}
        >
          <Sparkles size={16} />
          <span>New Item Proposals ({inventoryProposals.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('movements');
            handleReset();
          }}
        >
          <History size={16} />
          <span>Stock Movements ({stockMovements.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeTab === 'inventory'
            ? 'Search by part ID, code, name, specification or compatible machine...'
            : activeTab === 'requests'
            ? 'Search by request ID, ticket, customer, or part...'
            : activeTab === 'proposals'
            ? 'Search by proposal ID, proposed part or category...'
            : 'Search by movement ID, part, ticket, or engineer...'
        }
        filters={activeTab === 'inventory' ? filters : []}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Tables based on active tab */}
      {activeTab === 'inventory' && (
        <DataTable
          columns={inventoryColumns}
          data={filteredParts}
          keyField="id"
          minWidth="1780px"
          emptyMessage="No inventory items match your filter criteria."
          defaultPageSize={10}
        />
      )}

      {activeTab === 'requests' && (
        <DataTable
          columns={requestsColumns}
          data={filteredRequests}
          keyField="id"
          minWidth="1680px"
          emptyMessage="No material requests found."
          defaultPageSize={10}
        />
      )}

      {activeTab === 'proposals' && (
        <DataTable
          columns={proposalColumns}
          data={filteredProposals}
          keyField="id"
          minWidth="1640px"
          emptyMessage="No inventory proposals submitted yet."
          defaultPageSize={10}
        />
      )}

      {activeTab === 'movements' && (
        <DataTable
          columns={movementColumns}
          data={filteredMovements}
          keyField="id"
          minWidth="1600px"
          emptyMessage="No stock movements logged yet."
          defaultPageSize={10}
        />
      )}

      {/* Modals */}
      <PartDetailModal
        isOpen={Boolean(selectedPart)}
        onClose={() => setSelectedPart(null)}
        part={selectedPart}
        onAdjustStock={(part) => setAdjustingPart(part)}
        onEditPart={(part) => setEditingPart(part)}
      />

      <AdjustStockModal
        isOpen={Boolean(adjustingPart)}
        onClose={() => setAdjustingPart(null)}
        part={adjustingPart}
        onSave={updateSparePartStock}
      />

      {editingPart && (
        <AddEditPartModal
          isOpen={Boolean(editingPart)}
          onClose={() => setEditingPart(null)}
          part={editingPart}
          onSave={(updates) => editSparePart(editingPart.id, updates)}
        />
      )}

      {isProposeOpen && (
        <ProposeNewItemModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          onPropose={(payload) => proposeInventoryItem(payload, roleId)}
        />
      )}

      {isNewRequestOpen && (
        <NewPartRequestModal
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
          onSubmit={(payload, rId) => addSparePartRequest(payload, rId || roleId)}
        />
      )}

      {checklistReq && (
        <CollectionChecklistModal
          isOpen={Boolean(checklistReq)}
          onClose={() => setChecklistReq(null)}
          request={checklistReq}
          onConfirm={(reqId, data) => markPartCollected(reqId, data)}
        />
      )}

      {consumptionReq && (
        <RecordConsumptionModal
          isOpen={Boolean(consumptionReq)}
          onClose={() => setConsumptionReq(null)}
          request={consumptionReq}
          onSave={(reqId, data) => recordPartConsumption(reqId, data)}
        />
      )}

      {deliveryReq && (
        <DeliveryStatusModal
          isOpen={Boolean(deliveryReq)}
          onClose={() => setDeliveryReq(null)}
          request={deliveryReq}
          onSave={(reqId, data) => updateDeliveryStatus(reqId, data)}
        />
      )}

      {isDirectUsageOpen && (
        <DirectStockUsageModal
          isOpen={isDirectUsageOpen}
          onClose={() => setIsDirectUsageOpen(false)}
          onSave={recordDirectStockUsage}
        />
      )}
    </PageContainer>
  );
}
