import { Patient, Appointment, InventoryItem, TreatmentRecord } from '../App';
import { Users, Calendar, Package, TrendingUp, AlertTriangle, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { PesoSign } from './icons/PesoSign';

type DashboardProps = {
  patients: Patient[];
  appointments: Appointment[];
  inventory: InventoryItem[];
  treatmentRecords: TreatmentRecord[];
  onNavigate?: (tab: string) => void;
};

export function Dashboard({ patients, appointments, inventory, treatmentRecords, onNavigate }: DashboardProps) {
  const todayAppointments = appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]);
  const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity);
  
  const totalRevenue = treatmentRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);

  // Generate appointment data from real appointments
  const appointmentData = appointments.length > 0 ? [
    { month: 'Current', appointments: appointments.length }
  ] : [{ month: 'No Data', appointments: 0 }];

  const revenueData = treatmentRecords.length > 0 ? [
    { month: 'Total', revenue: totalRevenue }
  ] : [{ month: 'No Data', revenue: 0 }];

  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl -z-10"></div>
        <div className="p-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Dashboard Overview
          </h1>
          <p className="text-slate-600">Monitor your dental clinic performance at a glance</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.button
          onClick={() => onNavigate?.('patients')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="group relative bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-blue-100/50 overflow-hidden cursor-pointer text-left hover:scale-105 transform"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <ArrowUp className="w-4 h-4" />
                <span>12%</span>
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-2 font-medium">Total Patients</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              {patients.length}
            </p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('appointments')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="group relative bg-gradient-to-br from-white to-emerald-50/30 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-emerald-100/50 overflow-hidden cursor-pointer text-left hover:scale-105 transform"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                <Activity className="w-4 h-4" />
                <span>Today</span>
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-2 font-medium">Today's Appointments</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
              {todayAppointments.length}
            </p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('inventory')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="group relative bg-gradient-to-br from-white to-orange-50/30 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-orange-100/50 overflow-hidden cursor-pointer text-left hover:scale-105 transform"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Package className="w-7 h-7 text-white" />
              </div>
              {lowStockItems.length > 0 && (
                <div className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Alert</span>
                </div>
              )}
            </div>
            <p className="text-slate-600 text-sm mb-2 font-medium">Low Stock Items</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
              {lowStockItems.length}
            </p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onNavigate?.('financial')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="group relative bg-gradient-to-br from-white to-purple-50/30 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-purple-100/50 overflow-hidden cursor-pointer text-left hover:scale-105 transform"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <PesoSign className="w-7 h-7 text-white" /></div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <ArrowUp className="w-4 h-4" />
                <span>8%</span>
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-2 font-medium">Total Revenue</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              ₱{totalRevenue.toLocaleString()}
            </p>
          </div>
        </motion.button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="mb-4">Appointment Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="mb-4">Revenue Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts and Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2>Low Stock Alerts</h2>
          </div>
          <div className="space-y-3">
            {lowStockItems.length > 0 ? (
              lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-600">{item.quantity} {item.unit}</p>
                    <p className="text-xs text-gray-500">Min: {item.minQuantity}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">All inventory levels are adequate</p>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2>Upcoming Appointments</h2>
          </div>
          <div className="space-y-3">
            {appointments
              .filter(apt => apt.status === 'scheduled')
              .slice(0, 5)
              .map(apt => (
                <div key={apt.id} className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
                  <div>
                    <p>{apt.patientName}</p>
                    <p className="text-sm text-gray-600">{apt.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600">{apt.date}</p>
                    <p className="text-xs text-gray-500">{apt.time}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}