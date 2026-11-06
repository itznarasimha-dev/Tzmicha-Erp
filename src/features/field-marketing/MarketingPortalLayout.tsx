import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FieldMarketingDashboard } from './FieldMarketingDashboard';
import { VisitPlanner } from './VisitPlanner';
import { MarketSurveys } from './MarketSurveys';
import { DealerProspectDirectory } from './DealerProspectDirectory';
import { MarketingWalletAndExpenses } from './MarketingWalletAndExpenses';
import { MarketingTargets } from './MarketingTargets';
import {
  Compass,
  MapPin,
  ClipboardList,
  Building2,
  Wallet,
  Target,
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { RoleQueriesChatView } from '../shared/RoleQueriesChatView';

type MarketingTab = 'overview' | 'visits' | 'surveys' | 'dealers' | 'wallet' | 'targets' | 'queries';

export const MarketingPortalLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from location pathname
  const getTabFromPath = (path: string): MarketingTab => {
    if (path.includes('/visits')) return 'visits';
    if (path.includes('/surveys')) return 'surveys';
    if (path.includes('/dealers')) return 'dealers';
    if (path.includes('/wallet')) return 'wallet';
    if (path.includes('/targets')) return 'targets';
    if (path.includes('/queries') || path.includes('/chat')) return 'queries';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<MarketingTab>(getTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tab: MarketingTab) => {
    setActiveTab(tab);
    if (tab === 'overview') navigate('/marketing');
    else navigate(`/marketing/${tab}`);
  };

  const navTabs: { id: MarketingTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Ground Overview', icon: <Compass className="w-4 h-4" /> },
    { id: 'visits', label: 'Dealer Visit Planner', icon: <MapPin className="w-4 h-4" /> },
    { id: 'surveys', label: 'Market Price Surveys', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'dealers', label: 'Dealer Directory', icon: <Building2 className="w-4 h-4" /> },
    { id: 'wallet', label: 'Wallet & Expenses', icon: <Wallet className="w-4 h-4" /> },
    { id: 'targets', label: 'Visit Targets', icon: <Target className="w-4 h-4" /> },
    { id: 'queries', label: 'Helpdesk & Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto pb-12">
      {/* Navigation Ribbon in Modern White Card with Rounded-2xl */}
      <nav className="bg-white border border-slate-100 rounded-3xl p-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-150 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-slate-950 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              )}
            >
              <span className={clsx(activeTab === tab.id ? 'text-lime-400' : 'text-slate-400')}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Workspace Content */}
      <div>
        {activeTab === 'overview' && <FieldMarketingDashboard />}
        {activeTab === 'visits' && <VisitPlanner />}
        {activeTab === 'surveys' && <MarketSurveys />}
        {activeTab === 'dealers' && <DealerProspectDirectory />}
        {activeTab === 'wallet' && <MarketingWalletAndExpenses />}
        {activeTab === 'targets' && <MarketingTargets />}
        {activeTab === 'queries' && <RoleQueriesChatView roleContext="marketing" />}
      </div>
    </div>
  );
};
