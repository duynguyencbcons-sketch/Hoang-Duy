import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, FileSpreadsheet, HardHat } from 'lucide-react';

interface Props {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  projectName: string;
}

const Navbar: React.FC<Props> = ({ currentView, setCurrentView, projectName }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard & Biểu Đồ', icon: LayoutDashboard },
    { id: AppView.DATA_SHEET, label: 'Sổ Thu Chi (Data)', icon: FileSpreadsheet },
  ];

  const displayTitle = projectName && projectName !== 'SiteCost AI' 
    ? `Quản lý chi phí dự án : ${projectName}` 
    : 'SiteCost AI';

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-yellow-500 p-2 rounded-lg flex-shrink-0">
                <HardHat className="w-6 h-6 text-slate-900" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg sm:text-xl tracking-tight leading-none truncate" title={displayTitle}>
                {displayTitle}
              </span>
              <span className="text-xs text-slate-400 font-light truncate">Kiểm soát chi phí công trình</span>
            </div>
          </div>
          
          <div className="flex space-x-1 sm:space-x-4 items-center flex-shrink-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  currentView === item.id
                    ? 'bg-yellow-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 sm:mr-2`} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;