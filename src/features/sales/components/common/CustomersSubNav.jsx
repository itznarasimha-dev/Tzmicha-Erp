import { Users, UserPlus } from 'lucide-react';
import { useSales } from '../../context/SalesContext';

export default function CustomersSubNav({ currentTab }) {
  const { userRole, marketingLeads = [], navigateTo } = useSales();

  const isJunior = userRole === 'junior_sales';
  const canAccessMarketing = userRole !== 'junior_sales';
  const newMarketingLeadsCount = marketingLeads.filter((l) => l.status === 'New').length;

  const tabs = [
    {
      id: 'sales-customers',
      label: 'Sales Customers',
      icon: Users,
      badge: null,
      pageId: 'customers',
    },
    ...(canAccessMarketing
      ? [
          {
            id: 'marketing-leads',
            label: 'Marketing Leads',
            icon: UserPlus,
            badge: newMarketingLeadsCount > 0 ? newMarketingLeadsCount : null,
            pageId: 'marketing-leads',
          },
        ]
      : []),
  ];

  return (
    <div
      className="customers-subnav-strip"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '6px 8px',
        marginBottom: '18px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748b',
            padding: '4px 10px',
          }}
        >
          Customers Module
        </span>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '12.5px',
                fontWeight: isActive ? '600' : '500',
                padding: '6px 14px',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
              onClick={() => navigateTo(tab.pageId)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>

              {tab.badge && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#dbeafe',
                    color: isActive ? '#ffffff' : '#1d4ed8',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    marginLeft: '2px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
