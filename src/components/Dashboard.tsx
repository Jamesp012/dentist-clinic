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
      const recordDate = new Date(record.createdAt || new Date());
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
            <p className="text-slate-500 text-xs mb-3 font-bold tracking-widest uppercase">Total Revenue</p>
            <p className="text-4xl font-bold text-slate-900 mb-1">₱{totalRevenue.toLocaleString()}</p>
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
              <h2 className="text-lg font-bold text-slate-900">Revenue Overview</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">Monthly revenue comparison</p>
            </div>
            <div className="px-3 py-1.5 bg-gradient-to-r from-[#9CEAEF]/20 to-[#68D8D6]/20 border border-[#9CEAEF]/30 rounded-lg">
              <span className="text-xs font-bold text-[#07BEB8]">₱</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 50000]} ticks={[10000, 20000, 30000, 40000, 50000]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts and Upcoming - Premium Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/40">
            <div className="p-2.5 bg-gradient-to-br from-[#68D8D6]/20 to-[#68D8D6]/10 rounded-lg border border-[#68D8D6]/30">
              <AlertTriangle className="w-5 h-5 text-[#07BEB8]" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900">Low Stock Alerts</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Items below minimum threshold</p>
            </div>
          </div>
          <div className="space-y-2">
            {lowStockItems.length > 0 ? (
              lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-[#C4FFF9]/40 to-[#C4FFF9]/20 rounded-xl border border-[#68D8D6]/40 hover:border-[#68D8D6]/60 hover:bg-gradient-to-r hover:from-[#C4FFF9]/60 hover:to-[#C4FFF9]/40 transition-all duration-300 group backdrop-blur-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{item.category}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-[#07BEB8] text-sm">{item.quantity} {item.unit}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Min: {item.minQuantity}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#3DCCC7]/20 to-[#07BEB8]/20 flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">All Stocked</p>
                <p className="text-xs text-slate-500 mt-1">All inventory levels are adequate</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/40">
            <div className="p-2.5 bg-gradient-to-br from-[#3DCCC7]/20 to-[#3DCCC7]/10 rounded-lg border border-[#3DCCC7]/30">
              <Calendar className="w-5 h-5 text-[#07BEB8]" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900">Upcoming Appointments</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Next 4 scheduled appointments</p>
            </div>
          </div>
          <div className="space-y-3">
            {appointments
              .filter(apt => apt.status === 'scheduled')
              .filter(apt => isValidDbDate(apt.date))
              .filter(apt => {
                const [year, month, day] = apt.date.split('-').map(Number);
                const aptDate = new Date(year, month - 1, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return aptDate >= today;
              })
              .sort((a, b) => {
                // Sort by date first, then by time (parse as local dates)
                const [aYear, aMonth, aDay] = a.date.split('-').map(Number);
                const [aHour, aMin] = (a.time || '00:00').split(':').map(Number);
                const aDateTime = new Date(aYear, aMonth - 1, aDay, aHour, aMin);
                
                const [bYear, bMonth, bDay] = b.date.split('-').map(Number);
                const [bHour, bMin] = (b.time || '00:00').split(':').map(Number);
                const bDateTime = new Date(bYear, bMonth - 1, bDay, bHour, bMin);
                
                return aDateTime.getTime() - bDateTime.getTime();
              })
              .slice(0, 4)
              .map(apt => {
                // Format date as readable format (e.g., "30/01/2026")
                const [year, month, day] = apt.date.split('-').map(Number);
                const [hour, min] = (apt.time || '00:00').split(':').map(Number);
                const appointmentDate = new Date(year, month - 1, day, hour, min);
                const formattedDate = formatToDD_MM_YYYY(appointmentDate);
                const periodLabel = appointmentDate.getHours() < 12 ? 'Morning' : 'Afternoon';
                
                return (
                  <div key={apt.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-[#9CEAEF]/40 to-[#9CEAEF]/20 rounded-xl border border-[#3DCCC7]/40 hover:border-[#3DCCC7]/60 hover:bg-gradient-to-r hover:from-[#9CEAEF]/60 hover:to-[#9CEAEF]/40 transition-all duration-300 group backdrop-blur-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{apt.patientName}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{periodLabel}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-[#07BEB8] text-sm">{formattedDate}</p>
                    </div>
                  </div>
                );
              })}
            {appointments
              .filter(apt => apt.status === 'scheduled')
              .filter(apt => isValidDbDate(apt.date))
              .filter(apt => {
                const [year, month, day] = apt.date.split('-').map(Number);
                const aptDate = new Date(year, month - 1, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return aptDate >= today;
              }).length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#3DCCC7]/20 to-[#07BEB8]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#07BEB8]" />
                </div>
                <p className="text-sm font-semibold text-slate-900">No Appointments</p>
                <p className="text-xs text-slate-500 mt-1">No upcoming appointments scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}