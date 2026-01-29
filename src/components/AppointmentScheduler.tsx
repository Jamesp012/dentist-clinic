import { useState } from 'react';
import { Appointment, Patient, TreatmentRecord } from '../App';
import { Calendar, Clock, Plus, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentAPI } from '../api';

type AppointmentSchedulerProps = {
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  patients: Patient[];
  treatmentRecords?: TreatmentRecord[];
  setTreatmentRecords?: (records: TreatmentRecord[]) => void;
  onOpenServiceForm?: (appointmentData: { patientId: string; patientName: string; appointmentType: string }) => void;
  onDataChanged?: () => Promise<void>;
};

const getPatientRecordStatus = (patientId: string, treatmentRecords?: TreatmentRecord[]): 'has-record' | 'no-record' => {
  if (!treatmentRecords) return 'has-record';
  return treatmentRecords.some(record => String(record.patientId) === String(patientId)) ? 'has-record' : 'no-record';
};

export function AppointmentScheduler({ appointments, setAppointments, patients, treatmentRecords, onOpenServiceForm, onDataChanged }: AppointmentSchedulerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
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
      const aptDate = String(apt.date).split('T')[0];
      if (aptDate !== date || apt.status === 'cancelled') return false;
      
      const [hours] = apt.time.split(':').map(Number);
      return period === 'am' ? hours < 12 : hours >= 12;
    }).length;
  };

  const handleAddAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const patientId = formData.get('patientId') as string;
      const patient = patients.find(p => String(p.id) === patientId);

      const newAppointment = {
        patientId,
        patientName: patient?.name || '',
        date: formData.get('date') as string,
        time: formData.get('time') as string,
        type: formData.get('type') as string,
        notes: formData.get('notes') as string,
      };

      const createdAppointment = await appointmentAPI.create(newAppointment);
      
      // Ensure the created appointment has the status for immediate filtering
      const appointmentWithStatus = {
        ...(createdAppointment as any),
        status: (createdAppointment as any).status || 'scheduled'
      };

      setAppointments(prev => [...prev, appointmentWithStatus as Appointment]);
      setSelectedDate(newAppointment.date);
      setShowAddModal(false);
      toast.success('Appointment scheduled successfully!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to add appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setIsLoading(false);
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
    // Update appointment status to completed
    await updateAppointmentStatus(appointment.id, 'completed');
    
    // If there's a callback, use it to open the service form in parent component
    if (onOpenServiceForm) {
      onOpenServiceForm({
        patientId: String(appointment.patientId),
        patientName: appointment.patientName,
        appointmentType: appointment.type,
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
    // When filtering by non-scheduled statuses, show all appointments regardless of date
    if (filterStatus !== 'all' && filterStatus !== 'scheduled') {
      return true;
    }

    // Normalize dates for comparison (YYYY-MM-DD)
    const normalizeDate = (dateVal: any) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal).split('T')[0];
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const appointmentDate = normalizeDate(apt.date);
    const targetDate = normalizeDate(selectedDate);

    if (viewMode === 'day') {
      return appointmentDate === targetDate;
    }
    // For week view, show appointments within 7 days from selected date
    const aptDate = new Date(appointmentDate);
    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 6);
    return aptDate >= startDate && aptDate <= endDate;
  });

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = String(a.date).split('T')[0];
    const dateB = String(b.date).split('T')[0];
    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const timeSlots = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'
  ];

  const getAppointmentForTimeSlot = (time: string) => {
    return filteredAppointments.find(apt => {
      if (!apt.time) return false;
      // Compare HH:mm parts only. Supports both "08:00" and "08:00:00"
      const aptTimeParts = String(apt.time).split(':');
      if (aptTimeParts.length < 2) return false;
      const aptTimeShort = `${aptTimeParts[0].padStart(2, '0')}:${aptTimeParts[1].padStart(2, '0')}`;
      return aptTimeShort === time;
    });
  };

  const statusColors = {
    scheduled: 'bg-blue-100 border-blue-500 text-blue-700',
    completed: 'bg-green-100 border-green-500 text-green-700',
    cancelled: 'bg-red-100 border-red-500 text-red-700',
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl mb-2">Appointment Scheduler</h1>
          <p className="text-gray-600">Automated scheduling system</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Appointment
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week View
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Day View - Time Slots Grid */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {(() => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              })()}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timeSlots.map((time) => {
                const appointment = getAppointmentForTimeSlot(time);
                return (
                  <div 
                    key={time} 
                    className={`rounded-lg border-2 p-4 transition-all ${
                      appointment
                        ? `border-blue-300 bg-gradient-to-br ${statusColors[appointment.status].includes('green') ? 'from-green-50 to-green-100 border-green-400' : statusColors[appointment.status].includes('red') ? 'from-red-50 to-red-100 border-red-400' : 'from-blue-50 to-blue-100 border-blue-400'}`
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <span className="font-bold text-lg text-gray-900">{time}</span>
                    </div>
                    
                    {appointment ? (
                      <div>
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900">{appointment.patientName}</p>
                            {getPatientRecordStatus(String(appointment.patientId), treatmentRecords) === 'no-record' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">No Record</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 font-medium">{appointment.type}</p>
                          {appointment.notes && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{appointment.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                          {appointment.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleDoneClick(appointment)}
                                className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteAppointment(appointment.id)}
                            className="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm font-medium">Available</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Week View - List */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Date & Time</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Patient</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Type</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAppointments.length > 0 ? (
                  sortedAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p>{String(apt.date).split('T')[0]}</p>
                          <p className="text-sm text-gray-600">{String(apt.time).substring(0, 5)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span>{apt.patientName}</span>
                          {getPatientRecordStatus(String(apt.patientId), treatmentRecords) === 'no-record' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">No Record</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{apt.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[apt.status]}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {apt.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleDoneClick(apt)}
                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
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
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl">New Appointment</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Patient *</label>
                <select
                  name="patientId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={selectedDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Time * <span className="text-xs text-gray-500">(08:00 AM - 08:00 PM)</span></label>
                  <input
                    type="time"
                    name="time"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="08:00"
                    max="20:00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Appointment Type *</label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Check-up">Check-up</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Filling">Filling</option>
                    <option value="Root Canal">Root Canal</option>
                    <option value="Extraction">Extraction</option>
                    <option value="Crown">Crown</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Consultation">Consultation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
