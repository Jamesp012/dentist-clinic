import { Patient, Appointment, InventoryItem, TreatmentRecord } from '../App';
import { Users, Calendar, Package, TrendingUp, AlertTriangle, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { PesoSign } from './icons/PesoSign';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';

type DashboardProps = {
  patients: Patient[];
  appointments: Appointment[];
  inventory: InventoryItem[];
  treatmentRecords: TreatmentRecord[];
  onNavigate?: (tab: string) => void;
};

export function Dashboard({ patients, appointments, inventory, treatmentRecords, onNavigate }: DashboardProps) {
  const isValidDbDate = (dateStr: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const testDate = new Date(year, month - 1, day);
    return testDate.getFullYear() === year && testDate.getMonth() === month - 1 && testDate.getDate() === day;
  };

  const todayAppointments = appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]);
  const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity);
  
  const totalServiceEarnings = treatmentRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);

  // Generate appointment data with 5-day view based on actual appointments
  const getAppointmentsForDate = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateStr).length;
  };

  const appointmentData = [
    { day: 'Two Days Ago', appointments: getAppointmentsForDate(-2) },
    { day: 'Yesterday', appointments: getAppointmentsForDate(-1) },
    { day: 'Today', appointments: getAppointmentsForDate(0) },
    { day: 'Tomorrow', appointments: getAppointmentsForDate(1) },
    { day: 'Day After', appointments: getAppointmentsForDate(2) }
  ];

  // Calculate earnings for last month and this month
  const getEarningsForMonth = (monthOffset: number) => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
    return treatmentRecords.filter(record => {
      const recordDate = new Date(record.date || new Date());
      return recordDate >= targetMonth && recordDate < nextMonth;
    }).reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  };

  const lastMonthEarnings = getEarningsForMonth(-1);
  const thisMonthEarnings = getEarningsForMonth(0);

  const earningsData = [
    { month: 'Last Month', earnings: lastMonthEarnings },
    { month: 'This Month', earnings: thisMonthEarnings },
    { month: 'Total', earnings: totalServiceEarnings }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Stats Cards - Premium Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.button
          onClick={() => onNavigate?.('patients')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="group relative bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#07BEB8]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#07BEB8]/15 transition-all duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#68D8D6]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3.5 bg-gradient-to-br from-[#07BEB8] to-[#3DCCC7] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1.5 text-[#07BEB8] text-xs font-bold tracking-wide uppercase">
                <ArrowUp className="w-4 h-4" />
                <span>+12%</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs mb-3 font-bold tracking-widest uppercase">Total Patients</p>
            <p className="text-4xl font-bold text-slate-900 mb-1">{patients.length}</p>
            <div className="h-1 w-8 bg-gradient-to-r from-[#07BEB8] to-[#3DCCC7] rounded-full"></div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('appointments')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="group relative bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#3DCCC7]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#3DCCC7]/15 transition-all duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#9CEAEF]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3.5 bg-gradient-to-br from-[#3DCCC7] to-[#07BEB8] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1.5 text-[#07BEB8] text-xs font-bold tracking-wide uppercase">
                <Activity className="w-4 h-4" />
                <span>Today</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs mb-3 font-bold tracking-widest uppercase">Today's Appointments</p>
            <p className="text-4xl font-bold text-slate-900 mb-1">{todayAppointments.length}</p>
            <div className="h-1 w-8 bg-gradient-to-r from-[#3DCCC7] to-[#07BEB8] rounded-full"></div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('inventory')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="group relative bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#68D8D6]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#68D8D6]/15 transition-all duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C4FFF9]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3.5 bg-gradient-to-br from-[#68D8D6] to-[#3DCCC7] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Package className="w-6 h-6 text-white" />
              </div>
              {lowStockItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold tracking-wide uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Alert</span>
                </div>
              )}
            </div>
            <p className="text-slate-500 text-xs mb-3 font-bold tracking-widest uppercase">Low Stock Items</p>
            <p className="text-4xl font-bold text-slate-900 mb-1">{lowStockItems.length}</p>
            <div className="h-1 w-8 bg-gradient-to-r from-[#68D8D6] to-[#3DCCC7] rounded-full"></div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('financial')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="group relative bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#9CEAEF]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#9CEAEF]/15 transition-all duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#68D8D6]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3.5 bg-gradient-to-br from-[#9CEAEF] to-[#68D8D6] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <PesoSign className="w-6 h-6 text-white" /></div>
              <div className="flex items-center gap-1.5 text-[#07BEB8] text-xs font-bold tracking-wide uppercase">
                <ArrowUp className="w-4 h-4" />
                <span>+8%</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs mb-3 font-bold tracking-widest uppercase">Service Earnings</p>
            <p className="text-4xl font-bold text-slate-900 mb-1">₱{totalServiceEarnings.toLocaleString()}</p>
            <div className="h-1 w-8 bg-gradient-to-r from-[#9CEAEF] to-[#68D8D6] rounded-full"></div>
          </div>
        </motion.button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
          <div className="mb-6 pb-4 border-b border-white/40 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Appointment Trends</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">5-day appointment overview</p>
            </div>
            <div className="px-3 py-1.5 bg-gradient-to-r from-[#3DCCC7]/20 to-[#07BEB8]/20 border border-[#3DCCC7]/30 rounded-lg">
              <span className="text-xs font-bold text-[#07BEB8]">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 15]} ticks={[3, 6, 9, 12, 15]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
          <div className="mb-6 pb-4 border-b border-white/40 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Earnings Overview</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">Monthly earnings comparison</p>
            </div>
            <div className="px-3 py-1.5 bg-gradient-to-r from-[#9CEAEF]/20 to-[#68D8D6]/20 border border-[#9CEAEF]/30 rounded-lg">
              <span className="text-xs font-bold text-[#07BEB8]">₱</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 50000]} ticks={[10000, 20000, 30000, 40000, 50000]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="earnings" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}