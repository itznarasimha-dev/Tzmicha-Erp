import { Calendar, Clock, FileText } from 'lucide-react';
import { useSales } from '../../context/SalesContext';

export default function AttendanceWorkSubNav({ currentTab }) {
  const { userRole, activities = [], leaveRequests = [], navigateTo } = useSales();

  const isManagerOrCoordinator = ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);
  const scheduleLabel = isManagerOrCoordinator ? 'Team Schedule' : 'My Schedule';

  const pendingActivitiesCount = activities.filter((a) => a.status === 'Pending').length;
  const pendingLeavesCount = isManagerOrCoordinator
    ? leaveRequests.filter((l) => l.status === 'Pending Approval').length
    : 0;

  const tabs = [
    {
      id: 'schedule',
      label: scheduleLabel,
      icon: Calendar,
      badge: pendingActivitiesCount > 0 ? pendingActivitiesCount : null,
      pageId: 'schedule',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : null,
      pageId: 'attendance',
    },
    {
      id: 'work-updates',
      label: 'Work Updates',
      icon: FileText,
      badge: null,
      pageId: 'work-updates',
    },
  ];

  return (
    <div
      className="attendance-work-subnav-strip"
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
          Attendance &amp; Action Plan
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
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#fee2e2',
                    color: isActive ? '#ffffff' : '#b91c1c',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    lineHeight: '1.2',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px' }}>
        <span
          style={{
            fontSize: '11.5px',
            color: '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }}
          />
          Role Mode: <strong>{isManagerOrCoordinator ? (userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Sales Manager') : (userRole === 'junior_sales' ? 'Junior Sales Employee' : 'Sales Representative')}</strong>
        </span>
      </div>
    </div>
  );
}
