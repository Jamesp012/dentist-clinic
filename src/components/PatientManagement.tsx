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

  // Format patient name as: LASTNAME, Firstname Middlename M.I.
  const formatPatientName = (fullName: string): string => {
    const { first, middle, last } = splitName(fullName);
    const lastNameUpper = last.trim().toUpperCase();
    const firstName = first.trim();
    const middleInitial = middle.trim() ? middle.trim().charAt(0).toUpperCase() + '.' : '';
    
    // Build the formatted name
    const parts = [firstName];
    if (middleInitial) {
      parts.push(middleInitial);
    }
    const displayName = parts.join(' ');
    
    return `${lastNameUpper}, ${displayName}`;
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

  // Sort by last name, then by first name
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const aName = splitName(a.name);
    const bName = splitName(b.name);
    const aLast = aName.last.toLowerCase();
    const bLast = bName.last.toLowerCase();
    
    // First sort by last name
    const lastNameCompare = aLast.localeCompare(bLast);
    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }
    
    // If last names are the same, sort by first name
    const aFirst = aName.first.toLowerCase();
    const bFirst = bName.first.toLowerCase();
    return aFirst.localeCompare(bFirst);
  });

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

  return (
    <div
      className="flex flex-col flex-1 min-h-0 relative overflow-hidden bg-gradient-to-br from-[#f5fbff] via-white to-[#ecfff8]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(45, 212, 191, 0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(14, 165, 233, 0.25), transparent 35%)',
        }}
      />
      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden px-6 py-6 sm:px-10 sm:py-8 gap-6">
        {/* Search & Add Button */}
        <div className="relative rounded-3xl border border-white/70 bg-white/90 px-6 py-6 shadow-[0_35px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-y-0 right-[-80px] w-[260px] bg-gradient-to-b from-teal-50/60 to-cyan-100/30 blur-3xl opacity-60" aria-hidden="true"></div>
          <div className="relative flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
              <input
                type="text"
                placeholder="Search patients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-white/70 border border-white/70 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 placeholder:text-slate-400 text-slate-900 shadow-inner hover:shadow-[inset_0_0_0_rgba(0,0,0,0)]"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="relative group bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 text-white px-7 py-4 rounded-2xl font-semibold tracking-wide shadow-[0_20px_45px_rgba(14,165,233,0.35)] transition-all duration-300 flex items-center justify-center gap-2.5 whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_30px_60px_rgba(14,165,233,0.35)] w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Add Patient</span>
              <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
            </button>
          </div>
        </div>

        {/* Patients List/Table */}
        <div className="flex-1 flex flex-col min-h-0 gap-6 overflow-hidden pb-6">
          {sortedPatients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-16 px-8 bg-white/90 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_30px_70px_rgba(15,23,42,0.08)] max-w-xl">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-5 shadow-inner shadow-white/60">
                  <Users className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                  {searchTerm ? 'No patients found' : 'No patients added yet'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {searchTerm
                    ? 'Adjust your search to explore more patient profiles.'
                    : 'Add your first patient to unlock a full view of the directory.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:flex flex-1 min-h-0 border border-white/70 bg-white/95 rounded-3xl shadow-[0_40px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl overflow-hidden flex-col">
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-teal-200/80 scrollbar-track-transparent">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-gradient-to-r from-white/95 via-teal-50/90 to-white/95 backdrop-blur-md">
                        <th scope="col" className="px-6 py-5 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[18%]">
                          <div className="flex items-center gap-2">
                            Patient Name
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[8%]">Age</th>
                        <th scope="col" className="px-4 py-5 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[12%]">Birthdate</th>
                        <th scope="col" className="px-4 py-5 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[18%]">Email</th>
                        <th scope="col" className="px-4 py-5 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[14%]">Phone</th>
                        <th scope="col" className="px-4 py-5 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[18%]">Address</th>
                        <th scope="col" className="px-4 py-5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-teal-100/50 w-[12%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700 divide-y divide-teal-50/50">
                      {sortedPatients.map((patient) => {
                        const ageValue = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : NaN;
                        const hasAge = Number.isFinite(ageValue);
                        const dobLabel = patient.dateOfBirth ? formatToDD_MM_YYYY(patient.dateOfBirth) : 'N/A';
                        const sexLabel = patient.sex || 'N/A';
                        const { first, last } = splitName(patient.name);

                        return (
                          <tr
                            key={patient.id}
                            className="group transition-all duration-300 hover:bg-teal-50/40"
                          >
                            <td className="px-6 py-4 align-middle">
                              <div className="text-sm font-bold text-slate-900 leading-tight uppercase">{last}</div>
                              <div className="text-xs font-semibold text-slate-500 leading-tight mt-0.5">{first}</div>
                              <div className="text-[10px] font-bold text-teal-600/70 mt-1 uppercase tracking-wider">{sexLabel}</div>
                            </td>
                            <td className="px-4 py-4 align-middle text-center">
                              {hasAge ? (
                                <div className="flex items-baseline justify-center">
                                  <span className="text-lg font-bold text-slate-900">{ageValue}</span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1 uppercase">yrs</span>
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-slate-300">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="text-sm font-semibold text-slate-600">{dobLabel}</span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="text-xs font-medium text-slate-500 truncate block" title={patient.email}>{patient.email}</span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="text-xs font-bold text-slate-700 tracking-tight">{patient.phone}</span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2" title={patient.address}>
                                {patient.address}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-middle text-center">
                              <div className="flex justify-center items-center gap-2">
                                <button
                                  onClick={() => setViewingPatient(patient)}
                                  className="p-2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:scale-110 transition-all"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingPatient(patient)}
                                  className="p-2 rounded-full bg-sky-50 text-sky-600 border border-sky-100 hover:scale-110 transition-all"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingPatient(patient)}
                                  className="p-2 rounded-full bg-rose-50 text-rose-600 border border-rose-100 hover:scale-110 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
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

              {/* Mobile Card View */}
              <div className="md:hidden flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-teal-200 scrollbar-track-transparent">
                {sortedPatients.map((patient) => {
                  const ageValue = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : NaN;
                  const hasAge = Number.isFinite(ageValue);
                  const dobLabel = patient.dateOfBirth ? formatToDD_MM_YYYY(patient.dateOfBirth) : 'N/A';
                  const sexLabel = patient.sex || 'N/A';
                  const { first, last } = splitName(patient.name);

                  return (
                    <div 
                      key={patient.id}
                      className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/70 shadow-lg space-y-4 transition-all active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-slate-900 uppercase leading-tight truncate">{last}</div>
                          <div className="text-sm font-semibold text-slate-600 leading-tight mt-0.5 truncate">{first}</div>
                          <div className="inline-flex items-center px-2 py-0.5 mt-2 rounded-md bg-teal-50 text-[10px] font-bold text-teal-600 uppercase tracking-wider border border-teal-100">
                            {sexLabel}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          {hasAge ? (
                            <div className="flex items-baseline justify-end">
                              <span className="text-2xl font-bold text-slate-900 leading-none">{ageValue}</span>
                              <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">yrs</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Age N/A</span>
                          )}
                          <div className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-tight">
                            {dobLabel}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</div>
                          <div className="text-xs font-bold text-slate-700">{patient.phone}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</div>
                          <div className="text-xs font-medium text-slate-600 truncate" title={patient.email}>
                            {patient.email}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</div>
                        <div className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {patient.address}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => setViewingPatient(patient)}
                          className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs uppercase tracking-wider border border-emerald-100 flex items-center justify-center gap-2 transition-all active:bg-emerald-100"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => setEditingPatient(patient)}
                          className="flex-1 py-3 px-4 rounded-xl bg-sky-50 text-sky-600 font-bold text-xs uppercase tracking-wider border border-sky-100 flex items-center justify-center gap-2 transition-all active:bg-sky-100"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingPatient(patient)}
                          className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 transition-all active:bg-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
