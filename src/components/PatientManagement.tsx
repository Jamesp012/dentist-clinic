import { useState } from 'react';
import { Patient } from '../App';
import { Search, Plus, X, Edit, Trash2, Eye, Users } from 'lucide-react';
import { toast } from 'sonner';
import { patientAPI } from '../api';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { convertToDBDate, formatToDD_MM_YYYY, formatDateInput } from '../utils/dateHelpers';
 

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

  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getStoredUser();
  const canEditName = currentUser && currentUser.role === 'doctor';

  const splitName = (fullName: string) => {
    // Split on internal delimiter (newline) to preserve spaces in names
    // Format: first\nmiddle\nlast or first\nlast (for backward compatibility)
    if (fullName.includes('\n')) {
      const parts = fullName.split('\n');
      if (parts.length === 3) {
        // New format: first\nmiddle\nlast
        return { first: parts[0] || '', middle: parts[1] || '', last: parts[2] || '' };
      } else {
        // Old format: first\nlast
        return { first: parts[0] || '', middle: '', last: parts[1] || '' };
      }
    }
    // Fallback for space-separated format
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    const first = parts.length > 0 ? parts[0] : '';
    const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
    return { first, middle: '', last };
  };

  // Format patient name as: Firstname Middlename Lastname
  const formatPatientName = (fullName: string): string => {
    const { first, middle, last } = splitName(fullName);
    const firstName = first.trim();
    const lastName = last.trim();
    const middleInitial = middle.trim() ? middle.trim().charAt(0).toUpperCase() + '.' : '';
    
    // Build the formatted name
    const parts = [firstName];
    if (middleInitial) {
      parts.push(middleInitial);
    }
    if (lastName) {
      parts.push(lastName);
    }
    
    return parts.join(' ');
  };

  // Display name for sidebar (first and last only)
  const getDisplayName = (fullName: string): string => {
    const { first, last } = splitName(fullName);
    return `${first} ${last}`.trim();
  };

  const filteredPatients = patients.filter(patient => {
    const { first, last } = splitName(patient.name);
    const term = searchTerm.toLowerCase();
    const formattedName = formatPatientName(patient.name).toLowerCase();
    
    return (
      first.toLowerCase().includes(term) ||
      last.toLowerCase().includes(term) ||
      formattedName.includes(term) ||
      patient.email.toLowerCase().includes(term) ||
      patient.phone.includes(searchTerm)
    );
  });

  // Sort by full name (first name first)
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const nameA = formatPatientName(a.name).toLowerCase();
    const nameB = formatPatientName(b.name).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const calculateAge = (dob: string | null | undefined) => {
    if (!dob || dob === '0000-00-00' || dob === '00/00/0000' || dob === '1899-11-30') return 'N/A';
    
    // Parse date safely
    let birthDate: Date;
    if (dob.includes('/')) {
      const [day, month, year] = dob.split('/').map(Number);
      birthDate = new Date(year, month - 1, day);
    } else {
      birthDate = new Date(dob);
    }

    if (isNaN(birthDate.getTime()) || birthDate.getFullYear() <= 1900) return 'N/A';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsLoading(true);
    try {
      const formData = new FormData(form);
      const first = (formData.get('first_name') as string) || '';
      const middle = (formData.get('middle_name') as string) || '';
      const last = (formData.get('last_name') as string) || '';
      const newPatient = {
        name: `${first}\n${middle}\n${last}`,
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
      const first = (formData.get('first_name') as string) || '';
      const middle = (formData.get('middle_name') as string) || '';
      const last = (formData.get('last_name') as string) || '';
      const updatedPatient = {
        ...editingPatient,
        name: `${first}\n${middle}\n${last}`,
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

  const columnWidths = ['220px', '80px', '140px', '200px', '140px', '250px', '120px'];

  return (
    <div
      className="flex flex-col h-full bg-transparent overflow-hidden"
    >
      <div className="relative flex flex-col h-full overflow-hidden gap-0">
        {/* Search & Add Button Responsive */}
        <div className="relative flex items-center gap-2 md:gap-4 border-b border-slate-200/70 bg-transparent px-3 md:px-6 py-3 md:py-4 flex-none">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-12 pr-4 py-2 md:py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 placeholder:text-slate-400 text-xs md:text-sm text-slate-900 shadow-sm hover:shadow-md"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="relative group bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-2.5 md:px-6 md:py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-teal-500/20 flex items-center gap-2 whitespace-nowrap font-semibold text-xs md:text-sm tracking-wide transform hover:scale-105 active:scale-95 flex-none"
            type="button"
            title="Add Patient"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">Add Patient</span>
            <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300" aria-hidden="true"></div>
          </button>
        </div>

        {/* Patients Table Container */}
        <div className="flex-1 flex flex-col min-h-0 px-3 md:px-6 py-4 md:py-6 overflow-hidden">
          {sortedPatients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 bg-white w-full rounded-xl">
              <p className="text-slate-500 text-sm">No patients found</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
                <table className="w-full min-w-[1050px] table-fixed text-sm border-collapse">
                  <colgroup>
                    {columnWidths.map((width, index) => (
                      <col key={`col-${index}`} style={{ width }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-20 bg-white shadow-[0_2px_5px_rgba(0,0,0,0.05)] text-[10px] md:text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-left align-middle bg-slate-50/80 backdrop-blur-sm">Name</th>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-center align-middle bg-slate-50/80 backdrop-blur-sm">Age</th>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-left align-middle bg-slate-50/80 backdrop-blur-sm">Birthdate</th>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-left align-middle bg-slate-50/80 backdrop-blur-sm">Email</th>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-left align-middle bg-slate-50/80 backdrop-blur-sm">Phone</th>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-left align-middle bg-slate-50/80 backdrop-blur-sm">Address</th>
                      <th scope="col" className="px-3 md:px-5 py-3 md:py-4 text-center align-middle bg-slate-50/80 backdrop-blur-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] md:text-sm text-slate-700">
                    {sortedPatients.map((patient) => {
                      const ageDisplay = calculateAge(patient.dateOfBirth);
                      const hasAge = ageDisplay !== 'N/A';
                      const dobLabel = patient.dateOfBirth ? formatToDD_MM_YYYY(patient.dateOfBirth) : 'N/A';
                      const sexLabel = patient.sex || 'N/A';

                      return (
                        <tr
                          key={patient.id}
                          className="transition-colors border-b border-slate-100 last:border-0 odd:bg-white even:bg-[rgba(26,188,156,0.04)] hover:bg-[rgba(26,188,156,0.12)]"
                        >
                          {/* NAME */}
                          <td className="px-3 md:px-5 py-2 md:py-3 align-middle text-left">
                            <div className="leading-tight">
                              <p className="text-[11px] md:text-sm font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis" title={formatPatientName(patient.name)}>
                                {formatPatientName(patient.name)}
                              </p>
                              <p className="text-[10px] md:text-[11px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{sexLabel}</p>
                            </div>
                          </td>

                          {/* AGE */}
                          <td className="px-3 md:px-5 py-2 md:py-3 text-center align-middle">
                            {hasAge ? (
                              <div className="flex items-baseline justify-center gap-0.5">
                                <span className="text-[11px] md:text-sm font-semibold">{ageDisplay}</span>
                                <span className="text-[9px] md:text-[10px] text-slate-400">yr</span>
                              </div>
                            ) : (
                              <span className="text-[10px] md:text-xs text-slate-400">N/A</span>
                            )}
                          </td>

                          {/* DOB */}
                          <td className="px-3 md:px-5 py-2 md:py-3 align-middle text-left whitespace-nowrap">
                            <span className="text-[11px] md:text-sm font-semibold text-slate-900">{dobLabel}</span>
                          </td>

                          {/* EMAIL */}
                          <td className="px-3 md:px-5 py-2 md:py-3 align-middle text-left">
                            <p className="text-[11px] md:text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis" title={patient.email}>
                              {patient.email}
                            </p>
                          </td>

                          {/* PHONE */}
                          <td className="px-3 md:px-5 py-2 md:py-3 align-middle text-left whitespace-nowrap">
                            <p className="text-[11px] md:text-sm font-medium text-slate-900 tracking-wide overflow-hidden text-ellipsis" title={patient.phone}>
                              {patient.phone}
                            </p>
                          </td>

                          {/* ADDRESS */}
                          <td className="px-3 md:px-5 py-2 md:py-3 align-middle text-left">
                            <p className="text-[11px] md:text-sm text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={patient.address}>
                              {patient.address}
                            </p>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-3 md:px-5 py-2 md:py-3 align-middle text-center">
                            <div className="flex justify-center items-center gap-1 md:gap-2">
                              <button
                                onClick={() => setViewingPatient(patient)}
                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-emerald-600 hover:bg-slate-100 transition-colors"
                                title="View Patient"
                              >
                                <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <button
                                onClick={() => setEditingPatient(patient)}
                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-blue-600 hover:bg-slate-100 transition-colors"
                                title="Edit Patient"
                              >
                                <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingPatient(patient)}
                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-rose-600 hover:bg-slate-100 transition-colors"
                                title="Delete Patient"
                              >
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40" data-slot="dialog-content" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
                  Patient Information
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Enrique"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="De La Cruz"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date of Birth *</label>
                  <input
                    type="text"
                    name="dateOfBirth"
                    required
                    placeholder="DD/MM/YYYY"
                    onInput={(e) => (e.target as HTMLInputElement).value = formatDateInput((e.target as HTMLInputElement).value)}
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40" data-slot="dialog-content" role="dialog" aria-modal="true">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    defaultValue={splitName(editingPatient.name).first}
                    disabled={!canEditName}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    defaultValue={splitName(editingPatient.name).middle}
                    disabled={!canEditName}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Enrique"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    defaultValue={splitName(editingPatient.name).last}
                    disabled={!canEditName}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="De La Cruz"
                  />
                </div>
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
                    onInput={(e) => (e.target as HTMLInputElement).value = formatDateInput((e.target as HTMLInputElement).value)}
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
              {formatPatientName(deletingPatient.name)}
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
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40">
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
                <p className="text-2xl font-bold text-slate-900">{formatPatientName(viewingPatient.name)}</p>
              </div>
              
              {/* Age Card */}
              <div className="group bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm p-6 rounded-2xl border border-cyan-200/40 hover:border-cyan-300/60 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10">
                <label className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2 block">Age</label>
                <p className="text-2xl font-bold text-slate-900">
                  {calculateAge(viewingPatient.dateOfBirth)}
                  {calculateAge(viewingPatient.dateOfBirth) !== 'N/A' && (
                    <span className="text-sm text-slate-600 ml-2 font-normal">years old</span>
                  )}
                </p>
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
