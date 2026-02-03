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
    <div className="w-64 bg-[#e2fcfb] h-screen flex flex-col fixed left-0 top-0 text-gray-800 shadow-2xl scrollbar-light">
      <div className="p-6 flex items-center gap-3 border-b border-teal-300">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
          <Stethoscope className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">DentalFlow</h1>
          <p className="text-xs text-teal-300/70 mt-1 italic">Practice Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 ${
                isActive 
                  ? "bg-teal-200 text-gray-900 font-medium shadow-lg shadow-teal-300/30 translate-x-1" 
                  : "text-gray-700 hover:bg-teal-100 hover:translate-x-0.5"
              }`}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-gray-600"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-teal-300 mt-auto space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-teal-100 hover:text-gray-900 rounded-full transition-all duration-300">
          <Settings size={20} className="text-gray-600" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-full transition-all duration-300">
          <LogOut size={20} className="text-red-600" />
          <span>Logout</span>
        </button>
      </div>

      <div className="p-4 mx-4 mb-6 bg-teal-100 rounded-2xl text-gray-800 border border-teal-300">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">Upgrade Pro</p>
        <p className="text-xs text-gray-600 mb-3">Access advanced patient analytics and secure cloud storage.</p>
        <button className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white text-xs font-medium rounded-lg transition-all duration-300">
          Learn More
        </button>
      </div>
    </div>
  );
};
