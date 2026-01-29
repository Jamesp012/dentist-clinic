import { useState } from 'react';
import { Appointment, Patient, TreatmentRecord } from '../App';
import { Calendar, Plus, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentAPI } from '../api';

// Helper function to extract date string without timezone conversion
const getDateString = (date: string | Date): string => {
  if (typeof date === 'string') {
    // If it's a string, extract just the date part (YYYY-MM-DD)
    return date.includes('T') ? date.split('T')[0] : date;
  }
  // If it's a Date object, extract the local date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDate = (date: string | Date) => {
  const normalized = getDateString(date);
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day);
};

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
  const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
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

  const handleAddAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

      setAppointments([...appointments, appointmentWithStatus as Appointment]);
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

    const appointmentDate = getDateString(apt.date);
    const targetDate = selectedDate; // selectedDate is already in YYYY-MM-DD format

    if (viewMode === 'day') {
      return appointmentDate === targetDate;
    }
    // For week view, show appointments within 7 days from selected date
    const aptDate = getLocalDate(appointmentDate);
    const startDate = getLocalDate(targetDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return aptDate >= startDate && aptDate <= endDate;
  });

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = getDateString(a.date);
    const dateB = getDateString(b.date);
    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

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

      {/* Day View - Queue System */}
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
          <div className="p-6 space-y-8">
            {/* MORNING QUEUE */}
            <div className={`rounded-lg border-2 transition-all ${isScheduleClosed(selectedDate, 'am') ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'}`}>
              <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 border-b-2 border-emerald-300 flex items-center justify-between rounded-t">
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">Morning Queue</h3>
                  <p className="text-sm text-emerald-700">8:00 AM - 12:00 PM</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-emerald-900">{getBookingCountForPeriod(selectedDate, 'am')}</div>
                  <p className="text-xs text-emerald-700">in queue</p>
                </div>
              </div>
              <div className="p-4">
                {isScheduleClosed(selectedDate, 'am') && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm font-semibold">
                    ⛔ Schedule Closed
                  </div>
                )}
                
                {/* Queue List */}
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                  {appointments.filter(apt => {
                    const aptDate = getDateString(apt.date);
                    if (aptDate !== selectedDate || apt.status === 'cancelled') return false;
                    const [hours] = (apt.time || '09:00').split(':').map(Number);
                    return hours < 12;
                  }).map((apt, index) => (
                    <div key={apt.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{apt.patientName}</p>
                          {getPatientRecordStatus(String(apt.patientId), treatmentRecords) === 'no-record' && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">No Record</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{apt.type}</p>
                        {apt.notes && <p className="text-xs text-gray-500 mt-1">{apt.notes}</p>}
                      </div>
                      <div className="flex-shrink-0 flex gap-1">
                        {apt.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleDoneClick(apt)}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors font-medium"
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
                  className={`w-full py-2 rounded font-semibold transition-colors ${
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
            <div className={`rounded-lg border-2 transition-all ${isScheduleClosed(selectedDate, 'pm') ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
              <div className="p-4 bg-gradient-to-r from-orange-100 to-amber-100 border-b-2 border-orange-300 flex items-center justify-between rounded-t">
                <div>
                  <h3 className="text-lg font-bold text-orange-900">Afternoon Queue</h3>
                  <p className="text-sm text-orange-700">12:30 PM - 8:00 PM</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-orange-900">{getBookingCountForPeriod(selectedDate, 'pm')}</div>
                  <p className="text-xs text-orange-700">in queue</p>
                </div>
              </div>
              <div className="p-4">
                {isScheduleClosed(selectedDate, 'pm') && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm font-semibold">
                    ⛔ Schedule Closed
                  </div>
                )}
                
                {/* Queue List */}
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                  {appointments.filter(apt => {
                    const aptDate = getDateString(apt.date);
                    if (aptDate !== selectedDate || apt.status === 'cancelled') return false;
                    const [hours] = (apt.time || '09:00').split(':').map(Number);
                    return hours >= 12;
                  }).map((apt, index) => (
                    <div key={apt.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{apt.patientName}</p>
                          {getPatientRecordStatus(String(apt.patientId), treatmentRecords) === 'no-record' && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">No Record</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{apt.type}</p>
                        {apt.notes && <p className="text-xs text-gray-500 mt-1">{apt.notes}</p>}
                      </div>
                      <div className="flex-shrink-0 flex gap-1">
                        {apt.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleDoneClick(apt)}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors font-medium"
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
                  className={`w-full py-2 rounded font-semibold transition-colors ${
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
                          <p>{getDateString(apt.date)}</p>
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
