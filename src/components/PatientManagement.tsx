import { useState } from 'react';
import { Patient } from '../App';
import { Search, Plus, X, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { patientAPI } from '../api';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { convertToDBDate, formatToDD_MM_YYYY } from '../utils/dateHelpers';

type PatientManagementProps = {
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  onDataChanged?: () => Promise<void>;
};

export function PatientManagement({ patients, setPatients, onDataChanged }: PatientManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsLoading(true);
    try {
      const formData = new FormData(form);
      const newPatient = {
        name: formData.get('name') as string,
        dateOfBirth: convertToDBDate(formData.get('dateOfBirth') as string),
        sex: formData.get('sex') as 'Male' | 'Female',
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        medicalHistory: formData.get('medicalHistory') as string,
        allergies: formData.get('allergies') as string,
      };

      const createdPatient = await patientAPI.create(newPatient);
      setPatients([...patients, createdPatient as Patient]);
      form.reset();
      setShowAddModal(false);
      toast.success('Patient added successfully!');
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to add patient:', error);
      toast.error('Failed to add patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updatedPatient = {
        ...editingPatient,
        name: formData.get('name') as string,
        dateOfBirth: convertToDBDate(formData.get('dateOfBirth') as string),
        sex: formData.get('sex') as 'Male' | 'Female',
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        medicalHistory: formData.get('medicalHistory') as string,
        allergies: formData.get('allergies') as string,
      };

      await patientAPI.update(updatedPatient.id, updatedPatient);
      setPatients(patients.map(p => String(p.id) === String(updatedPatient.id) ? updatedPatient : p));
      setEditingPatient(null);
      toast.success('Patient updated successfully!');
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to update patient:', error);
      toast.error('Failed to update patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!deletingPatient) return;

    setIsLoading(true);
    try {
      await patientAPI.delete(deletingPatient.id);
      setPatients(patients.filter(p => String(p.id) !== String(deletingPatient.id)));
      setDeletingPatient(null);
      toast.success('Patient deleted successfully!');
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to delete patient:', error);
      toast.error('Failed to delete patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50/40 flex flex-col flex-1">
      <div className="p-8 space-y-8 flex flex-col flex-1">
        {/* Header Section */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-teal-700 bg-clip-text text-transparent">
            Patient Management
          </h1>
          <p className="text-slate-600 font-medium text-sm tracking-wide">
            Manage and organize your patient database
          </p>
        </div>

        {/* Search & Add Button */}
        <div className="relative flex items-center justify-between gap-4 sticky top-0 bg-gradient-to-b from-white/80 via-white/60 to-transparent backdrop-blur-lg z-30 -mx-8 px-8 py-4 mb-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Search patients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 placeholder:text-slate-400 text-slate-900 shadow-sm hover:shadow-md group-focus-within:bg-white group-focus-within:shadow-lg"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400/0 via-teal-400/0 to-cyan-400/0 group-focus-within:from-teal-400/10 group-focus-within:via-cyan-400/10 group-focus-within:to-teal-400/10 pointer-events-none transition-all duration-300"></div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="relative group bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-teal-500/20 flex items-center gap-2.5 whitespace-nowrap font-semibold text-sm tracking-wide transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Add Patient</span>
            <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
          </button>
        </div>

        {/* Patients Grid/List */}
        <div className="flex-1 flex flex-col min-h-0">
          {filteredPatients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-16 px-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {searchTerm ? 'No patients found' : 'No patients added yet'}
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search criteria' 
                    : 'Get started by adding your first patient'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
              {filteredPatients.map((patient, idx) => (
                <div
                  key={patient.id}
                  className="group relative bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-teal-500/10 overflow-hidden"
                >
                  {/* Gradient accent background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-teal-400/10 to-transparent rounded-full -translate-y-20 translate-x-20 group-hover:scale-125 transition-transform duration-500 blur-2xl pointer-events-none"></div>
                  
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
                    {/* Name Column */}
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Name</p>
                      <p className="text-lg font-bold text-slate-900">{patient.name}</p>
                    </div>

                    {/* Age Column */}
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Age</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">{calculateAge(patient.dateOfBirth)}</span>
                        <span className="text-xs text-slate-500">years</span>
                      </div>
                    </div>

                    {/* Email Column */}
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm text-slate-700 truncate hover:text-teal-600 transition-colors cursor-help" title={patient.email}>{patient.email}</p>
                    </div>

                    {/* Phone Column */}
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm font-medium text-slate-700">{patient.phone}</p>
                    </div>

                    {/* Actions Column */}
                    <div className="md:col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingPatient(patient)}
                        className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 hover:from-emerald-100 hover:to-teal-100 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="View Patient"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingPatient(patient)}
                        className="p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 hover:from-blue-100 hover:to-cyan-100 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Edit Patient"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeletingPatient(patient)}
                        className="p-2.5 rounded-lg bg-gradient-to-br from-red-50 to-pink-50 text-red-600 hover:from-red-100 hover:to-pink-100 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Delete Patient"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Address (hidden on mobile, shown on hover for desktop) */}
                  <div className="mt-4 pt-4 border-t border-slate-200/40 hidden md:block group-hover:block">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Address</p>
                    <p className="text-sm text-slate-600 line-clamp-1">{patient.address}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full my-auto shadow-2xl border border-white/40">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
                  Add New Patient
                </h3>
                <p className="text-slate-600 text-sm mt-1">Enter patient information to create a new record</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date of Birth *</label>
                  <input
                    type="text"
                    name="dateOfBirth"
                    required
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Sex *</label>
                  <select
                    name="sex"
                    required
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+63 912 345 6789"
                    onChange={(e) => handlePhoneInput(e.target.value, (formatted) => e.target.value = formatted)}
                    onBlur={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      if (formatted !== e.target.value) {
                        e.target.value = formatted;
                      }
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Address *</label>
                <textarea
                  name="address"
                  rows={2}
                  required
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md resize-none"
                  placeholder="Enter complete address"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Medical History</label>
                <textarea
                  name="medicalHistory"
                  rows={2}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md resize-none"
                  placeholder="Enter any relevant medical history (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  placeholder="Enter allergies or 'None' (optional)"
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-200/40">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? 'Adding...' : 'Add Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-bold text-sm tracking-wide uppercase text-slate-900 hover:border-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
                  Edit Patient
                </h3>
                <p className="text-slate-600 text-sm mt-1">Update patient information</p>
              </div>
              <button 
                onClick={() => setEditingPatient(null)} 
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdatePatient} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingPatient.name}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date of Birth *</label>
                  <input
                    type="text"
                    name="dateOfBirth"
                    required
                    defaultValue={formatToDD_MM_YYYY(editingPatient.dateOfBirth)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Sex *</label>
                  <select
                    name="sex"
                    required
                    defaultValue={editingPatient.sex}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={editingPatient.phone}
                    placeholder="+63 912 345 6789"
                    onChange={(e) => handlePhoneInput(e.target.value, (formatted) => e.target.value = formatted)}
                    onBlur={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      if (formatted !== e.target.value) {
                        e.target.value = formatted;
                      }
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingPatient.email}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Address *</label>
                <textarea
                  name="address"
                  rows={2}
                  required
                  defaultValue={editingPatient.address}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Medical History</label>
                <textarea
                  name="medicalHistory"
                  rows={2}
                  defaultValue={editingPatient.medicalHistory}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  defaultValue={editingPatient.allergies}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-200/40">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? 'Updating...' : 'Update Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-6 py-3.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-bold text-sm tracking-wide uppercase text-slate-900 hover:border-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPatient && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/40">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-900 mb-3">Delete Patient?</h3>
            <p className="text-center text-slate-600 mb-2">
              Are you sure you want to delete
            </p>
            <p className="text-center font-bold text-slate-900 mb-6">
              {deletingPatient.name}
            </p>
            <p className="text-center text-sm text-red-600 mb-8 leading-relaxed">
              This action cannot be undone. All patient records and associated data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeletePatient}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3.5 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-red-500/20 transform hover:scale-105 active:scale-95"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeletingPatient(null)}
                className="flex-1 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-bold text-sm tracking-wide uppercase text-slate-900 hover:border-slate-300 py-3.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Patient Modal */}
      {viewingPatient && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
                  Patient Details
                </h3>
                <p className="text-slate-600 text-sm mt-1">Complete patient information</p>
              </div>
              <button 
                onClick={() => setViewingPatient(null)} 
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Patient Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Name Card */}
              <div className="group bg-gradient-to-br from-emerald-50/80 to-teal-50/80 backdrop-blur-sm p-6 rounded-2xl border border-teal-200/40 hover:border-teal-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-teal-500/10">
                <label className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-2 block">Full Name</label>
                <p className="text-2xl font-bold text-slate-900">{viewingPatient.name}</p>
              </div>
              
              {/* Age Card */}
              <div className="group bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm p-6 rounded-2xl border border-cyan-200/40 hover:border-cyan-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10">
                <label className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2 block">Age</label>
                <p className="text-2xl font-bold text-slate-900">{calculateAge(viewingPatient.dateOfBirth)}<span className="text-sm text-slate-600 ml-2 font-normal">years old</span></p>
              </div>
              
              {/* Date of Birth Card */}
              <div className="group bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm p-6 rounded-2xl border border-pink-200/40 hover:border-pink-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-pink-500/10">
                <label className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-2 block">Date of Birth</label>
                <p className="text-lg font-bold text-slate-900">{formatToDD_MM_YYYY(viewingPatient.dateOfBirth)}</p>
              </div>
              
              {/* Sex Card */}
              <div className="group bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-sm p-6 rounded-2xl border border-amber-200/40 hover:border-amber-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-amber-500/10">
                <label className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-2 block">Sex</label>
                <p className="text-lg font-bold text-slate-900">{viewingPatient.sex}</p>
              </div>
              
              {/* Email Card */}
              <div className="group bg-gradient-to-br from-indigo-50/80 to-blue-50/80 backdrop-blur-sm p-6 rounded-2xl border border-indigo-200/40 hover:border-indigo-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10">
                <label className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-2 block">Email</label>
                <p className="text-sm font-semibold text-slate-900 truncate" title={viewingPatient.email}>{viewingPatient.email}</p>
              </div>
              
              {/* Phone Card */}
              <div className="group bg-gradient-to-br from-rose-50/80 to-red-50/80 backdrop-blur-sm p-6 rounded-2xl border border-red-200/40 hover:border-red-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-red-500/10">
                <label className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-2 block">Phone</label>
                <p className="text-lg font-bold text-slate-900">{viewingPatient.phone}</p>
              </div>
              
              {/* Address Card - Full Width */}
              <div className="group md:col-span-2 bg-gradient-to-br from-slate-50/80 to-gray-50/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/40 hover:border-slate-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-slate-500/10">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">Address</label>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">{viewingPatient.address}</p>
              </div>
              
              {/* Medical History Card - Full Width */}
              <div className="group md:col-span-2 bg-gradient-to-br from-lime-50/80 to-green-50/80 backdrop-blur-sm p-6 rounded-2xl border border-green-200/40 hover:border-green-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-green-500/10">
                <label className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2 block">Medical History</label>
                <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{viewingPatient.medicalHistory || <span className="text-slate-500 italic">No medical history recorded</span>}</p>
              </div>
              
              {/* Allergies Card - Full Width */}
              <div className="group md:col-span-2 bg-gradient-to-br from-yellow-50/80 to-orange-50/80 backdrop-blur-sm p-6 rounded-2xl border border-orange-200/40 hover:border-orange-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-orange-500/10">
                <label className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-2 block">Allergies</label>
                <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{viewingPatient.allergies || <span className="text-slate-500 italic">No known allergies</span>}</p>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-6 border-t border-slate-200/40">
              <button
                onClick={() => setViewingPatient(null)}
                className="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
