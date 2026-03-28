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
  
  const totalRevenue = treatmentRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);

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

  // Calculate revenue for last month and this month
  const getRevenueForMonth = (monthOffset: number) => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
    return treatmentRecords.filter(record => {
      const recordDate = new Date(record.date || new Date());
      return recordDate >= targetMonth && recordDate < nextMonth;
    }).reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  };

  const lastMonthRevenue = getRevenueForMonth(-1);
  const thisMonthRevenue = getRevenueForMonth(0);

  const revenueData = [
    { month: 'Last Month', revenue: lastMonthRevenue },
    { month: 'This Month', revenue: thisMonthRevenue },
    { month: 'Total', revenue: totalRevenue }
  ];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100 hover:scrollbar-thumb-teal-600">
      <div className="p-4 md:p-8 space-y-4 md:space-y-8">
        {/* Stats Cards - Premium Glassmorphism */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <motion.button
            onClick={() => onNavigate?.('patients')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#07BEB8]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#07BEB8]/15 transition-all duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#68D8D6]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="p-2.5 md:p-3.5 bg-gradient-to-br from-[#07BEB8] to-[#3DCCC7] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[#07BEB8] text-[10px] md:text-xs font-bold tracking-wide uppercase">
                  <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                  <span>+12%</span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] md:text-xs mb-2 md:mb-3 font-bold tracking-widest uppercase">Total Patients</p>
              <p className="text-2xl md:text-4xl font-bold text-slate-900 mb-1">{patients.length}</p>
              <div className="h-1 w-8 bg-gradient-to-r from-[#07BEB8] to-[#3DCCC7] rounded-full"></div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => onNavigate?.('appointments')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#3DCCC7]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#3DCCC7]/15 transition-all duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#9CEAEF]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="p-2.5 md:p-3.5 bg-gradient-to-br from-[#3DCCC7] to-[#07BEB8] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[#07BEB8] text-[10px] md:text-xs font-bold tracking-wide uppercase">
                  <Activity className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Today</span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] md:text-xs mb-2 md:mb-3 font-bold tracking-widest uppercase">Today's Appts</p>
              <p className="text-2xl md:text-4xl font-bold text-slate-900 mb-1">{todayAppointments.length}</p>
              <div className="h-1 w-8 bg-gradient-to-r from-[#3DCCC7] to-[#07BEB8] rounded-full"></div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => onNavigate?.('inventory')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#68D8D6]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#68D8D6]/15 transition-all duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C4FFF9]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="p-2.5 md:p-3.5 bg-gradient-to-br from-[#68D8D6] to-[#3DCCC7] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                {lowStockItems.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 text-red-600 text-[10px] md:text-xs font-bold tracking-wide uppercase">
                    <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Alert</span>
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-[10px] md:text-xs mb-2 md:mb-3 font-bold tracking-widest uppercase">Low Stock</p>
              <p className="text-2xl md:text-4xl font-bold text-slate-900 mb-1">{lowStockItems.length}</p>
              <div className="h-1 w-8 bg-gradient-to-r from-[#68D8D6] to-[#3DCCC7] rounded-full"></div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => onNavigate?.('financial')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/60 overflow-hidden cursor-pointer text-left hover:border-white/80 transform hover:-translate-y-1 hover:bg-white/70"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#9CEAEF]/10 via-transparent to-transparent rounded-2xl group-hover:from-[#9CEAEF]/15 transition-all duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#68D8D6]/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="p-2.5 md:p-3.5 bg-gradient-to-br from-[#9CEAEF] to-[#68D8D6] rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <PesoSign className="w-5 h-5 md:w-6 md:h-6 text-white" /></div>
                <div className="hidden sm:flex items-center gap-1.5 text-[#07BEB8] text-[10px] md:text-xs font-bold tracking-wide uppercase">
                  <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                  <span>+8%</span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] md:text-xs mb-2 md:mb-3 font-bold tracking-widest uppercase">Revenue</p>
              <p className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-1">₱{totalRevenue.toLocaleString()}</p>
              <div className="h-1 w-8 bg-gradient-to-r from-[#9CEAEF] to-[#68D8D6] rounded-full"></div>
            </div>
          </motion.button>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 md:mb-6 pb-2 md:pb-4 border-b border-white/40 flex items-center justify-between">
              <div>
                <h2 className="text-sm md:text-lg font-bold text-slate-900">Appointment Trends</h2>
                <p className="text-[10px] md:text-xs text-slate-500 mt-1 font-medium">5-day overview</p>
              </div>
              <div className="px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-r from-[#3DCCC7]/20 to-[#07BEB8]/20 border border-[#3DCCC7]/30 rounded-lg">
                <span className="text-[10px] md:text-xs font-bold text-[#07BEB8]">Live</span>
              </div>
            </div>
            <div className="h-[200px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={appointmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: isMobile ? 8 : 12 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 15]} 
                    ticks={[5, 10, 15]} 
                    tick={{ fontSize: isMobile ? 8 : 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="appointments" stroke="#3DCCC7" strokeWidth={3} dot={{ fill: '#3DCCC7', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 md:mb-6 pb-2 md:pb-4 border-b border-white/40 flex items-center justify-between">
              <div>
                <h2 className="text-sm md:text-lg font-bold text-slate-900">Revenue Overview</h2>
                <p className="text-[10px] md:text-xs text-slate-500 mt-1 font-medium">Monthly comparison</p>
              </div>
              <div className="px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-r from-[#9CEAEF]/20 to-[#68D8D6]/20 border border-[#9CEAEF]/30 rounded-lg">
                <span className="text-[10px] md:text-xs font-bold text-[#07BEB8]">₱</span>
              </div>
            </div>
            <div className="h-[200px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: isMobile ? 8 : 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 50000]} 
                    ticks={[25000, 50000]} 
                    tick={{ fontSize: isMobile ? 8 : 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#07BEB8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Alerts and Today's Appointments - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Low Stock Alerts */}
          <div className="bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 md:pb-4 border-b border-white/40">
              <div className="p-2 bg-gradient-to-br from-[#68D8D6]/20 to-[#68D8D6]/10 rounded-lg border border-[#68D8D6]/30">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-[#07BEB8]" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm md:text-base font-bold text-slate-900">Low Stock Alerts</h2>
              </div>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-teal-500/30">
              {lowStockItems.length > 0 ? (
                lowStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-[#C4FFF9]/40 to-[#C4FFF9]/20 rounded-xl border border-[#68D8D6]/40 hover:border-[#68D8D6]/60 transition-all duration-300">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-[11px] md:text-sm">{item.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{item.category}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-[#07BEB8] text-[11px] md:text-sm">{item.quantity} {item.unit}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-[11px] md:text-sm font-semibold text-slate-900">All Stocked</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Appointments - Horizontal Row on Mobile */}
          <div className="bg-white/60 backdrop-blur-xl p-4 md:p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 md:pb-4 border-b border-white/40">
              <div className="p-2 bg-gradient-to-br from-[#3DCCC7]/20 to-[#3DCCC7]/10 rounded-lg border border-[#3DCCC7]/30">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#07BEB8]" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm md:text-base font-bold text-slate-900">Today's Appointments</h2>
              </div>
            </div>
            
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-teal-500/30 -mx-1 px-1">
              {todayAppointments.length > 0 ? (
                todayAppointments
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map(apt => {
                    const [hour, min] = (apt.time || '00:00').split(':').map(Number);
                    const isPM = hour >= 12;
                    const displayHour = hour % 12 || 12;
                    const formattedTime = `${displayHour}:${min.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                    
                    return (
                      <div key={apt.id} className="flex-none w-[160px] md:w-full flex md:justify-between items-center p-3 bg-gradient-to-r from-[#9CEAEF]/40 to-[#9CEAEF]/20 rounded-xl border border-[#3DCCC7]/40 hover:border-[#3DCCC7]/60 transition-all duration-300">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-[11px] md:text-sm truncate">{apt.patientName}</p>
                          <p className="text-[10px] text-[#07BEB8] font-bold mt-0.5">{formattedTime}</p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="w-full text-center py-4">
                  <p className="text-[11px] md:text-sm font-semibold text-slate-900">No appointments today</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
  );
}