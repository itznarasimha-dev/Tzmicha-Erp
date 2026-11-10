import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Building, User, MapPin, X, Check, ChevronDown } from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';

/**
 * Reusable Global Searchable Customer Selector Component
 *
 * Supports instant search by Customer ID (e.g. CUS-000001 or 000001) or Business Name.
 * Automatically displays customer details and allows seamless selection across all forms.
 *
 * @param {Object} props
 * @param {string} props.value - Currently selected customerId
 * @param {Function} props.onChange - Callback receiving (customerId, fullCustomerObject)
 * @param {string} [props.placeholder] - Search placeholder text
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.disabled] - Whether field is disabled
 */
export default function CustomerSelect({
  value = '',
  onChange,
  placeholder = 'Type Customer ID (e.g. CUS-000001) or business name...',
  required = false,
  disabled = false
}) {
  const { customers = [] } = useSchedule();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCustomer = useMemo(() => {
    if (!value) return null;
    return customers.find((c) => c.id === value) || null;
  }, [value, customers]);

  // Filter matching customers
  const matches = useMemo(() => {
    if (!searchQuery.trim()) {
      return customers;
    }
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const matchId = c.id.toLowerCase().includes(q) || c.id.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      const matchName = (c.businessName || c.name || '').toLowerCase().includes(q);
      const matchContact = (c.contactPerson || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      return matchId || matchName || matchContact || matchPhone;
    });
  }, [searchQuery, customers]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer) => {
    if (onChange) {
      onChange(customer.id, customer);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('', null);
    }
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={wrapperRef} className="customer-select-wrapper" style={{ position: 'relative', width: '100%' }}>
      {/* If a customer is selected and dropdown is not active in search mode */}
      {selectedCustomer && !isOpen ? (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
          }}
          className="customer-select-selected-box"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Building size={16} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2563eb',
                    backgroundColor: '#dbeafe',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {selectedCustomer.id}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {selectedCustomer.businessName || selectedCustomer.name}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {selectedCustomer.contactPerson} • {selectedCustomer.phone} • {selectedCustomer.city}, {selectedCustomer.state}
              </div>
            </div>
          </div>

          {!disabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleClear}
                title="Clear selected customer"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  borderRadius: '4px'
                }}
              >
                <X size={15} />
              </button>
              <ChevronDown size={15} style={{ color: '#64748b' }} />
            </div>
          )}
        </div>
      ) : (
        /* Search Input Box */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
            padding: '2px 10px'
          }}
        >
          <Search size={16} style={{ color: '#94a3b8', marginRight: '8px', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="customer-select-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            required={required && !value}
            disabled={disabled}
            style={{
              width: '100%',
              height: '36px',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: '#0f172a',
              backgroundColor: 'transparent'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown Suggestions List */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 1050
          }}
        >
          <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            {matches.length} CUSTOMER ACCOUNTS FOUND
          </div>

          {matches.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No customer matches "{searchQuery}". Enter a valid Customer ID (e.g. CUS-000001) or company name.
            </div>
          ) : (
            matches.map((cust) => {
              const isCurrent = cust.id === value;
              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelect(cust)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc',
                    backgroundColor: isCurrent ? '#eff6ff' : '#ffffff',
                    transition: 'background-color 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563eb',
                          backgroundColor: '#dbeafe',
                          padding: '1px 5px',
                          borderRadius: '3px'
                        }}
                      >
                        {cust.id}
                      </span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                        {cust.businessName || cust.name}
                      </strong>
                      <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '10px' }}>
                        {cust.type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {cust.contactPerson} ({cust.designation || 'Contact'})
                      </span>
                      <span>•</span>
                      <span>{cust.phone}</span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={12} />
                        {cust.city}, {cust.state}
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <Check size={16} color="#2563eb" style={{ flexShrink: 0, marginLeft: '8px' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
