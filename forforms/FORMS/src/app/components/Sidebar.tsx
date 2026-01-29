import React from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Pill, 
  UserRound, 
  Settings, 
  LogOut, 
  PlusCircle,
  Receipt,
  Stethoscope,
  ClipboardList
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Patients", icon: UserRound },
    { id: "receipts", label: "Receipts", icon: Receipt },
    { id: "prescriptions", label: "Prescriptions", icon: Pill },
    { id: "referrals", label: "Referrals", icon: ClipboardList },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Stethoscope className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-none">DentalFlow</h1>
          <p className="text-xs text-slate-500 mt-1 italic">Practice Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-blue-50 text-blue-600 font-medium shadow-sm shadow-blue-100" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={20} className={isActive ? "text-blue-600" : "text-slate-400"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 mt-auto">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
          <Settings size={20} className="text-slate-400" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1">
          <LogOut size={20} className="text-red-500" />
          <span>Logout</span>
        </button>
      </div>

      <div className="p-4 mx-4 mb-6 bg-slate-900 rounded-2xl text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Upgrade Pro</p>
        <p className="text-xs text-slate-300 mb-3">Access advanced patient analytics and secure cloud storage.</p>
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
          Learn More
        </button>
      </div>
    </div>
  );
};
