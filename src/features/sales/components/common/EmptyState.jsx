import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are currently no records to display.',
  action = null,
}) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-box">
        <Icon size={32} className="empty-state-icon" />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
