import { useEffect, useState } from 'react';
import { Appointment, Patient, TreatmentRecord, Service } from '../App';
import { Calendar, Plus, X, Filter, Info } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentAPI } from '../api';
import { PatientSearchInput } from './PatientSearchInput';
import { convertToDBDate, convertToDisplayDate, formatDateInput, isValidDateFormat } from '../utils/dateHelpers';

// Helper function to extract date string without timezone conversion
const getDateString = (date: string | Date): string => {
  if (typeof date === 'string') {
    // If it's a string, extract just the date part (YYYY-MM-DD)
    return date.includes('T') ? date.split('T')[0] : date;
  }
  // If it's a Date object, use UTC methods to avoid timezone conversion
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type AppointmentSchedulerProps = {
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  patients: Patient[];
  treatmentRecords?: TreatmentRecord[];
  setTreatmentRecords?: (records: TreatmentRecord[]) => void;
  onOpenServiceForm?: (appointmentData: { patientId: string; patientName: string; appointmentType: string; appointmentId?: string }) => void;
  onDataChanged?: () => Promise<void>;
  services?: Service[];
};

const getPatientRecordStatus = (patientId: string, treatmentRecords?: TreatmentRecord[]): 'has-record' | 'no-record' => {
  if (!treatmentRecords) return 'has-record';
  return treatmentRecords.some(record => String(record.patientId) === String(patientId)) ? 'has-record' : 'no-record';
};

// Helper function to convert 24-hour time to 12-hour format with AM/PM
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function AppointmentScheduler({ appointments, setAppointments, patients, treatmentRecords, onOpenServiceForm, onDataChanged, services = [] }: AppointmentSchedulerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  // Use local date to avoid timezone conversion issues
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedDateInput, setSelectedDateInput] = useState(() => convertToDisplayDate(selectedDate));
  const [viewMode, setViewMode] = useState<'day' | 'thisWeek' | 'viewAll'>('day');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [closedSchedules, setClosedSchedules] = useState<Set<string>>(new Set(
    JSON.parse(localStorage.getItem('closedSchedules') || '[]')
  ));

  const getScheduleKey = (date: string, period: 'am' | 'pm') => `${date}-${period}`;

  const toggleScheduleClosed = (date: string, period: 'am' | 'pm') => {
    const key = getScheduleKey(date, period);
    const newClosed = new Set(closedSchedules);
    if (newClosed.has(key)) {
      newClosed.delete(key);
    } else {
      newClosed.add(key);
    }
    setClosedSchedules(newClosed);
    localStorage.setItem('closedSchedules', JSON.stringify(Array.from(newClosed)));
    toast.success(newClosed.has(key) ? 'Schedule closed' : 'Schedule reopened');
  };

  const isScheduleClosed = (date: string, period: 'am' | 'pm') => {
    return closedSchedules.has(getScheduleKey(date, period));
  };

  const getBookingCountForPeriod = (date: string, period: 'am' | 'pm') => {
    return appointments.filter(apt => {
      const aptDate = getDateString(apt.date);
      if (aptDate !== date || apt.status === 'cancelled') return false;
      
      const [hours] = apt.time.split(':').map(Number);
      return period === 'am' ? hours < 12 : hours >= 12;
    }).length;
  };

  useEffect(() => {
    setSelectedDateInput(convertToDisplayDate(selectedDate));
  }, [selectedDate]);

  const handleAddAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const patientId = formData.get('patientId') as string;
      const patient = patients.find(p => String(p.id) === patientId);
      const schedulePeriod = formData.get('schedulePeriod') as string;
      const rawDate = String(formData.get('date') || '').trim();
      const normalizedDate = convertToDBDate(rawDate);
      const isDbDateValid = /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate);

      if (!rawDate || (!isValidDateFormat(rawDate) && !isDbDateValid)) {
        toast.error('Please enter a valid date (DD/MM/YYYY)');
        return;
      }
      if (!isDbDateValid) {
        toast.error('Please enter a valid date (DD/MM/YYYY)');
        return;
      }
      
      // For queue system, use a default time based on the period (24-hour format)
      const defaultTime = schedulePeriod === 'am' ? '09:00' : '14:00';

      // Get all selected services
      const types = formData.getAll('types').map(t => String(t));
      const newAppointment = {
        patientId,
        patientName: patient?.name || '',
        date: normalizedDate,
        time: defaultTime,
        // API compatibility: send both `type` (string) and `types` (array)
        type: types.join(', '),
        types,
        notes: formData.get('notes') as string,
        createdByRole: 'staff',
      };

      const createdAppointment = await appointmentAPI.create(newAppointment);
      
      // Ensure the created appointment has the status for immediate filtering
      const raw = (createdAppointment as any) || newAppointment;
      const normalizedType = Array.isArray(raw.types) && raw.types.length > 0
        ? raw.types.map((s: any) => String(s).trim()).filter(Boolean)
        : (typeof raw.type === 'string' && raw.type.trim() ? raw.type.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

      const appointmentWithStatus: Appointment = {
        id: raw.id ?? Date.now().toString(),
        patientId: raw.patientId,
        patientName: raw.patientName,
        date: raw.date,
        time: raw.time,
        type: normalizedType,
        duration: raw.duration,
        status: raw.status || 'scheduled',
        notes: raw.notes || '',
        createdAt: raw.createdAt,
        createdByRole: raw.createdByRole || 'staff'
      };

      setAppointments([...appointments, appointmentWithStatus]);
      setSelectedDate(normalizedDate);
      setShowAddModal(false);
      toast.success('Successfully joined the queue!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to add appointment:', error);
      toast.error('Failed to join queue');
    }
  };

  const updateAppointmentStatus = async (id: string | number, status: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      const appointment = appointments.find(apt => String(apt.id) === String(id));
      if (!appointment) return;

      await appointmentAPI.update(id, { ...appointment, status });
      setAppointments(appointments.map(apt => 
        String(apt.id) === String(id) ? { ...apt, status } : apt
      ));
      toast.success('Appointment updated successfully!');

      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleDoneClick = async (appointment: Appointment) => {
    // Do NOT mark appointment completed here. Open the Record Receipt form first.
    if (onOpenServiceForm) {
      onOpenServiceForm({
        patientId: String(appointment.patientId),
        patientName: appointment.patientName,
        appointmentType: Array.isArray(appointment.type) ? appointment.type.join(', ') : (appointment.type as unknown as string),
        appointmentId: String(appointment.id),
      });
    }
  };

  const deleteAppointment = async (id: string | number) => {
    try {
      await appointmentAPI.delete(id);
      setAppointments(appointments.filter(apt => String(apt.id) !== String(id)));
      toast.success('Appointment deleted successfully!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false;

    const appointmentDate = getDateString(apt.date);
    const targetDate = selectedDate; // selectedDate is already in YYYY-MM-DD format

    if (viewMode === 'day') {
      return appointmentDate === targetDate;
    }

    if (viewMode === 'thisWeek') {
      // Show appointments within 7 days from selected date
      // Parse dates as local dates to avoid timezone issues
      const [apYear, apMonth, apDay] = appointmentDate.split('-').map(Number);
      const aptDate = new Date(apYear, apMonth - 1, apDay);
      const [tYear, tMonth, tDay] = targetDate.split('-').map(Number);
      const startDate = new Date(tYear, tMonth - 1, tDay);
      const endDate = new Date(tYear, tMonth - 1, tDay);
      endDate.setDate(endDate.getDate() + 6);
      return aptDate >= startDate && aptDate <= endDate;
    }

    // viewMode === 'viewAll' - show all appointments regardless of date
    return true;
  });

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = getDateString(a.date);
    const dateB = getDateString(b.date);
    // Sort descending (most recent first)
    const dateCompare = dateB.localeCompare(dateA);
    if (dateCompare !== 0) return dateCompare;
    // Also sort time in reverse for same date
    return b.time.localeCompare(a.time);
  });

  const statusColors = {
    scheduled: 'bg-blue-100 border-blue-500 text-blue-700',
    completed: 'bg-green-100 border-green-500 text-green-700',
    cancelled: 'bg-red-100 border-red-500 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 flex flex-col flex-1">
      <div className="p-4 space-y-4 flex flex-col flex-1">

        {/* Controls */}
        <div className="relative bg-white/70 backdrop-blur-md py-3 px-5 rounded-2xl shadow-md border border-slate-200/60 overflow-x-auto">
          <div className="flex gap-3 items-center whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={selectedDateInput}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setSelectedDateInput(formatted);
                  if (isValidDateFormat(formatted)) {
                    setSelectedDate(convertToDBDate(formatted));
                  }
                }}
                placeholder="DD/MM/YYYY"
                className="w-32 px-2.5 py-2 bg-white border border-slate-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  viewMode === 'day'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Day View
              </button>
              <button
                onClick={() => setViewMode('thisWeek')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  viewMode === 'thisWeek'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setViewMode('viewAll')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  viewMode === 'viewAll'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                View All
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="relative group bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-2.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-teal-500/20 flex items-center gap-2 whitespace-nowrap font-semibold text-sm tracking-wide transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>New Appointment</span>
                <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Day View - Queue System */}
        {viewMode === 'day' && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 border-b border-slate-200/60">
            <h2 className="text-2xl font-bold text-slate-900">
              {(() => {
                const dateObj = new Date(selectedDate + 'T00:00:00Z');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                return `${dayName} • ${dateStr}`;
              })()}
            </h2>
          </div>
          <div className="p-6 space-y-8">
            {/* MORNING QUEUE */}
            <div className={`rounded-2xl border transition-all flex flex-col overflow-hidden ${isScheduleClosed(selectedDate, 'am') ? 'border-red-300/70 bg-red-50/70' : 'border-emerald-200/70 bg-emerald-50/60'}`}>
              <div className="p-5 bg-gradient-to-r from-emerald-100/80 to-teal-100/80 border-b border-emerald-200/70 flex items-center justify-between rounded-t flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">Morning Queue</h3>
                  <p className="text-sm text-emerald-700">8:00 AM - 12:00 PM</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-emerald-900">{getBookingCountForPeriod(selectedDate, 'am')}</div>
                  <p className="text-xs text-emerald-700">in queue</p>
                </div>
              </div>
              <div className="p-5 flex flex-col overflow-hidden">
                {isScheduleClosed(selectedDate, 'am') && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm font-semibold">
                    ⛔ Schedule Closed
                  </div>
                )}
                
                {/* Queue List */}
                <div className="space-y-3 mb-4 overflow-y-auto scrollbar-thumb-emerald-300 scrollbar-track-transparent" style={{ maxHeight: '400px' }}>
                  {appointments.filter(apt => {
                    const aptDate = getDateString(apt.date);
                    if (aptDate !== selectedDate || apt.status === 'cancelled') return false;
                    const [hours] = (apt.time || '09:00').split(':').map(Number);
                    return hours < 12;
                  }).map((apt, index) => (
                    <div key={apt.id} className="flex items-start gap-3 p-4 bg-white/80 rounded-xl border border-emerald-200/60 shadow-sm hover:shadow-md transition-all">
                      <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{apt.patientName}</p>
                          {getPatientRecordStatus(String(apt.patientId), treatmentRecords) === 'no-record' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">No Record</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{apt.type}</p>
                        {apt.notes && <p className="text-xs text-slate-500 mt-1">{apt.notes}</p>}
                      </div>
                      <div className="flex-shrink-0 flex gap-2 items-center">
                        {apt.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleDoneClick(apt)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs rounded-lg hover:from-red-700 hover:to-pink-700 transition-all font-semibold"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {apt.status === 'completed' && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg font-semibold">✓ Completed</span>
                        )}
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="px-2.5 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {getBookingCountForPeriod(selectedDate, 'am') === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No appointments in queue</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleScheduleClosed(selectedDate, 'am')}
                  className={`w-full py-2.5 rounded-xl font-semibold transition-colors ${
                    isScheduleClosed(selectedDate, 'am')
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isScheduleClosed(selectedDate, 'am') ? '✓ Reopen Morning Schedule' : '✕ Close Morning Schedule'}
                </button>
              </div>
            </div>

            {/* AFTERNOON QUEUE */}
            <div className={`rounded-2xl border transition-all flex flex-col overflow-hidden ${isScheduleClosed(selectedDate, 'pm') ? 'border-red-300/70 bg-red-50/70' : 'border-orange-200/70 bg-orange-50/60'}`}>
              <div className="p-5 bg-gradient-to-r from-orange-100/80 to-amber-100/80 border-b border-orange-200/70 flex items-center justify-between rounded-t flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-orange-900">Afternoon Queue</h3>
                  <p className="text-sm text-orange-700">12:30 PM - 8:00 PM</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-orange-900">{getBookingCountForPeriod(selectedDate, 'pm')}</div>
                  <p className="text-xs text-orange-700">in queue</p>
                </div>
              </div>
              <div className="p-5 flex flex-col overflow-hidden">
                {isScheduleClosed(selectedDate, 'pm') && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm font-semibold">
                    ⛔ Schedule Closed
                  </div>
                )}
                
                {/* Queue List */}
                <div className="space-y-3 mb-4 overflow-y-auto scrollbar-thumb-orange-300 scrollbar-track-transparent" style={{ maxHeight: '400px' }}>
                  {appointments.filter(apt => {
                    const aptDate = getDateString(apt.date);
                    if (aptDate !== selectedDate || apt.status === 'cancelled') return false;
                    const [hours] = (apt.time || '09:00').split(':').map(Number);
                    return hours >= 12;
                  }).map((apt, index) => (
                    <div key={apt.id} className="flex items-start gap-3 p-4 bg-white/80 rounded-xl border border-orange-200/60 shadow-sm hover:shadow-md transition-all">
                      <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{apt.patientName}</p>
                          {getPatientRecordStatus(String(apt.patientId), treatmentRecords) === 'no-record' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">No Record</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{apt.type}</p>
                        {apt.notes && <p className="text-xs text-slate-500 mt-1">{apt.notes}</p>}
                      </div>
                      <div className="flex-shrink-0 flex gap-2 items-center">
                        {apt.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleDoneClick(apt)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs rounded-lg hover:from-red-700 hover:to-pink-700 transition-all font-semibold"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {apt.status === 'completed' && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg font-semibold">✓ Completed</span>
                        )}
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="px-2.5 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {getBookingCountForPeriod(selectedDate, 'pm') === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No appointments in queue</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleScheduleClosed(selectedDate, 'pm')}
                  className={`w-full py-2.5 rounded-xl font-semibold transition-colors ${
                    isScheduleClosed(selectedDate, 'pm')
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isScheduleClosed(selectedDate, 'pm') ? '✓ Reopen Afternoon Schedule' : '✕ Close Afternoon Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week View - List */}
      {(viewMode === 'thisWeek' || viewMode === 'viewAll') && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 border-b border-slate-200/60">
            <h2 className="text-2xl font-bold text-slate-900">
              {viewMode === 'thisWeek' ? 'This Week' : 'All Appointments'} • {sortedAppointments.length} {sortedAppointments.length === 1 ? 'appointment' : 'appointments'}
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-400 scrollbar-track-slate-200">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/60 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-widest uppercase text-slate-600">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-widest uppercase text-slate-600">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-widest uppercase text-slate-600">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-widest uppercase text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-widest uppercase text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {sortedAppointments.length > 0 ? (
                  sortedAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-teal-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{getDateString(apt.date)}</p>
                          <p className="text-sm text-slate-600">{formatTime(String(apt.time).substring(0, 5))}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{apt.patientName}</span>
                          {getPatientRecordStatus(String(apt.patientId), treatmentRecords) === 'no-record' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">No Record</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{apt.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[apt.status]}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {apt.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleDoneClick(apt)}
                                className="text-xs px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                className="text-xs px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all font-semibold"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No appointments found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">New Appointment</h2>
                <p className="text-slate-600 text-sm mt-1">Join the queue for a selected time period</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Patient *</label>
                <input type="hidden" name="patientId" value={selectedPatientId} required />
                <PatientSearchInput
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  placeholder="Search patient..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Appointment Date *</label>
                <input
                  type="text"
                  name="date"
                  required
                  defaultValue={convertToDisplayDate(selectedDate)}
                  onChange={(e) => {
                    e.currentTarget.value = formatDateInput(e.currentTarget.value);
                  }}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
              </div>

              {/* Schedule Period Selection (AM/PM Queue) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Select Queue *</label>
                <div className='max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-400 scrollbar-track-slate-200 p-1 rounded-lg'> 
                  <div className="grid grid-cols-2 gap-2">
                    {/* AM Schedule */}
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="schedulePeriod"
                        value="am"
                        required
                        className="peer sr-only"
                      />
                      <div className="p-3.5 rounded-xl border-2 transition-all text-left border-slate-200 bg-white/70 hover:border-emerald-400 peer-checked:border-emerald-500 peer-checked:bg-emerald-50">
                        <p className="font-semibold text-slate-900 text-sm">Morning</p>
                        <p className="text-xs text-slate-600 mb-1">8:00 AM - 12:00 PM</p>
                        <p className="text-base font-bold text-emerald-600">{(() => {
                          const rawDate = (document.querySelector('input[name="date"]') as HTMLInputElement)?.value || convertToDisplayDate(selectedDate);
                          const date = convertToDBDate(rawDate);
                          return getBookingCountForPeriod(date, 'am');
                        })()}
                        <span className="text-xs font-normal text-slate-600"> patients</span></p>
                        <p className="text-xs text-slate-600">in line</p>
                      </div>
                    </label>

                    {/* PM Schedule */}
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="schedulePeriod"
                        value="pm"
                        required
                        className="peer sr-only"
                      />
                      <div className="p-3.5 rounded-xl border-2 transition-all text-left border-slate-200 bg-white/70 hover:border-orange-400 peer-checked:border-orange-500 peer-checked:bg-orange-50">
                        <p className="font-semibold text-slate-900 text-sm">Afternoon</p>
                        <p className="text-xs text-slate-600 mb-1">12:30 PM - 8:00 PM</p>
                        <p className="text-base font-bold text-orange-600">{(() => {
                          const rawDate = (document.querySelector('input[name="date"]') as HTMLInputElement)?.value || convertToDisplayDate(selectedDate);
                          const date = convertToDBDate(rawDate);
                          return getBookingCountForPeriod(date, 'pm');
                        })()}
                        <span className="text-xs font-normal text-slate-600"> patients</span></p>
                        <p className="text-xs text-slate-600">in line</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Service Types *</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl p-3">
                  {[
                    'Dental consultation',
                    'Oral examination',
                    'Diagnosis',
                    'Treatment planning',
                    'Dental cleaning',
                    'Scaling',
                    'Polishing',
                    'Stain removal',
                    'Temporary filling',
                    'Permanent filling',
                    'Tooth repair',
                    'Dental bonding',
                    'Simple tooth extraction',
                    'Surgical extraction',
                    'Impacted tooth removal',
                    'Braces installation',
                    'Braces adjustment',
                    'Retainers',
                    'Orthodontic consultation',
                    'Complete dentures',
                    'Partial dentures'
                  ].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer select-none text-slate-800 text-sm">
                      <input
                        type="checkbox"
                        name="types"
                        value={s}
                        className="accent-teal-500 w-4 h-4"
                        // checked logic handled by browser for formData.getAll
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Notes (Optional)</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Any special requests..."
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                >
                  Join Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
