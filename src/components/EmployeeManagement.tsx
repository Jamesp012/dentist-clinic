import { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Trash2, Key, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '../api';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { convertToDBDate, formatToDD_MM_YYYY, formatDateInput, parseDateString } from '../utils/dateHelpers';

type Employee = {
  id: number;
  name: string;
  position: string;
  phone: string;
  email: string;
  address: string;
  dateHired: string;
  dateOfBirth?: string;
  sex?: 'Male' | 'Female';
  accessLevel?: 'Admin' | 'Super Admin' | 'Default Accounts';
  user_id?: number;
  username?: string;
  generatedCode?: string;
  isCodeUsed?: boolean;
  isFirstLogin?: boolean;
  accountStatus?: 'pending' | 'active' | 'inactive';
};

type EmployeeManagementProps = {
  token: string;
};

export function EmployeeManagement({ token }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };

  // Format name for display using splitName
  const formatEmployeeName = (name: string) => {
    const parts = splitName(name);
    return [parts.first, (parts as any).middle, parts.last].filter(Boolean).join(' ');
  };

  const normalizeDateField = (
    value: FormDataEntryValue | null,
    label: string,
    options: { required?: boolean } = {}
  ): { value: string | null; valid: boolean } => {
    const raw = typeof value === 'string' ? value.trim() : '';

    if (!raw) {
      if (options.required) {
        toast.error(`Please enter ${label}.`);
        return { value: null, valid: false };
      }
      return { value: null, valid: true };
    }

    if (raw.includes('/')) {
      const parsed = parseDateString(raw);
      if (!parsed) {
        toast.error(`Please enter a valid ${label} in DD/MM/YYYY format.`);
        return { value: null, valid: false };
      }
    }

    const isoCandidate = convertToDBDate(raw);
    const isoValue = isoCandidate || raw;
    const parsedDate = new Date(isoValue);
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error(`Please enter a valid ${label} in DD/MM/YYYY format.`);
      return { value: null, valid: false };
    }

    return { value: isoValue, valid: true };
  };

  const filteredEmployees = employees.filter((employee) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const nameMatch = formatEmployeeName(employee.name).toLowerCase().includes(term);
    const positionMatch = (employee.position || '').toLowerCase().includes(term);
    const emailMatch = (employee.email || '').toLowerCase().includes(term);
    return nameMatch || positionMatch || emailMatch;
  });

  // Sorted view of employees
  const sortedEmployees = filteredEmployees.slice().sort((a, b) => a.name.localeCompare(b.name));

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  // Add employee handler (basic implementation)
  const handleAddEmployee = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const dateOfBirthResult = normalizeDateField(form.get('dateOfBirth'), 'birthdate');
      const dateHiredResult = normalizeDateField(form.get('dateHired'), 'hire date', { required: true });

      if (!dateOfBirthResult.valid || !dateHiredResult.valid || !dateHiredResult.value) {
        setIsLoading(false);
        return;
      }

      const payload: any = {
        name: `${form.get('first_name') || ''}\n${form.get('middle_name') || ''}\n${form.get('last_name') || ''}`,
        position: form.get('position') || '',
        dateOfBirth: dateOfBirthResult.value,
        sex: form.get('sex') || '',
        phone: form.get('phone') || '',
        email: form.get('email') || '',
        address: form.get('address') || '',
        dateHired: dateHiredResult.value
      };
      const res = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchEmployees();
        setShowAddModal(false);
        toast.success('Employee added');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add employee');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to add employee');
    } finally {
      setIsLoading(false);
    }
  };

  // Update employee handler
  const handleUpdateEmployee = async (e: any) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setIsLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const dateOfBirthResult = normalizeDateField(form.get('dateOfBirth'), 'birthdate');
      const dateHiredResult = normalizeDateField(form.get('dateHired'), 'hire date', { required: true });

      if (!dateOfBirthResult.valid || !dateHiredResult.valid) {
        setIsLoading(false);
        return;
      }

      const payload: any = {
        name: `${form.get('first_name') || ''}\n${form.get('middle_name') || ''}\n${form.get('last_name') || ''}`,
        position: form.get('position') || editingEmployee.position,
        dateOfBirth: dateOfBirthResult.value ?? editingEmployee.dateOfBirth ?? null,
        sex: form.get('sex') || editingEmployee.sex,
        phone: form.get('phone') || editingEmployee.phone,
        email: form.get('email') || editingEmployee.email,
        address: form.get('address') || editingEmployee.address,
        dateHired: dateHiredResult.value ?? editingEmployee.dateHired
      };
      const res = await fetch(`${API_BASE}/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchEmployees();
        setEditingEmployee(null);
        toast.success('Employee updated successfully!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update employee');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  const currentUser = getStoredUser();
  const canEditName = currentUser && currentUser.role === 'doctor';

  const splitName = (fullName: string) => {
    const parts = (fullName || '').split('\n').map(p => p || '');
    if (parts.length >= 3) {
      return { first: parts[0], middle: parts.slice(1, parts.length - 1).join(' '), last: parts[parts.length - 1] };
    }
    const [first = '', last = ''] = parts;
    return { first, last };
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchEmployees();
        setDeletingEmployee(null);
        toast.success('Employee deleted successfully!');
      } else {
        throw new Error('Failed to delete employee');
      }
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error('Failed to delete employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCredentials = async (employeeId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/employees/${employeeId}/generate-credentials`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCredentials({
          username: data.username,
          password: data.temporaryPassword
        });
        await fetchEmployees();
        toast.success('Login credentials generated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate credentials');
      }
    } catch (error) {
      console.error('Failed to generate credentials:', error);
      toast.error('Failed to generate credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(`${field === 'username' ? 'Username' : 'Password'} copied to clipboard!`);
  };

  const getAccessConfig = (accessLevel?: Employee['accessLevel']) => {
    const baseLabel = (accessLevel || 'Default Accounts').toUpperCase();
    switch (accessLevel) {
      case 'Super Admin':
        return { label: baseLabel, className: 'text-purple-700' };
      case 'Admin':
        return { label: baseLabel, className: 'text-blue-700' };
      default:
        return { label: baseLabel, className: 'text-slate-600' };
    }
  };

  const getStatusConfig = (employee: Employee) => {
    if (!employee.user_id) {
      return { label: 'No Account', className: 'text-slate-500' };
    }

    switch (employee.accountStatus) {
      case 'pending':
        return { label: 'Pending', className: 'text-amber-600' };
      case 'inactive':
        return { label: 'Inactive', className: 'text-rose-600' };
      case 'active':
      default:
        return { label: 'Active', className: 'text-emerald-600' };
    }
  };

  const columnWidths = ['25%', '20%', '15%', '12%', '10%', '8%', '120px'];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-transparent overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="relative flex flex-wrap items-center gap-4 border-b border-slate-200/70 bg-transparent px-6 py-4">
          <div className="relative flex-1 min-w-0 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Search employees by name, position, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 placeholder:text-slate-400 text-slate-900 shadow-sm hover:shadow-md"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="relative group bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-teal-500/20 flex items-center gap-2.5 whitespace-nowrap font-semibold text-sm tracking-wide transform hover:scale-105 active:scale-95"
            type="button"
          >
            <Plus className="w-5 h-5" />
            <span>Add Employee</span>
            <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300" aria-hidden="true"></div>
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 px-6 py-6 gap-6 overflow-hidden">
          {sortedEmployees.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 bg-white w-full">
              {/* <div className="text-center py-16 px-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-teal-600">EM</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {searchTerm ? 'No employees found' : 'No employees added yet'}
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Add your first team member to get started'}
                </p>
              </div> */}
            </div>
          ) : (
            <div className="flex-1 min-h-0 border border-slate-200 bg-white rounded-none flex flex-col overflow-hidden">
              {/* Table Header */}
              <div className="bg-white shadow-[0_2px_5px_rgba(0,0,0,0.05)] z-20 flex-none overflow-x-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
                <table className="w-full min-w-[700px] table-fixed text-sm">
                  <colgroup>
                    {columnWidths.map((width, index) => (
                      <col key={`col-${index}`} style={{ width }} />
                    ))}
                  </colgroup>
                  <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-4 text-left align-middle">Name</th>
                      <th scope="col" className="px-5 py-4 text-left align-middle">Email</th>
                      <th scope="col" className="px-5 py-4 text-left align-middle">Phone</th>
                      <th scope="col" className="px-5 py-4 text-left align-middle">Date Hired</th>
                      <th scope="col" className="px-5 py-4 text-left align-middle">Access</th>
                      <th scope="col" className="px-5 py-4 text-left align-middle">Status</th>
                      <th scope="col" className="px-5 py-4 text-center align-middle" style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Scrollable Table Body */}
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent max-h-[60vh]">
                <table className="w-full min-w-[700px] table-fixed text-sm">
                  <colgroup>
                    {columnWidths.map((width, index) => (
                      <col key={`col-${index}`} style={{ width }} />
                    ))}
                  </colgroup>
                  <tbody className="text-sm text-slate-700">
                    {sortedEmployees.map((employee) => {
                      const shouldShowKeyAction = !employee.user_id || employee.accountStatus === 'pending' || !employee.isCodeUsed;
                      const accessConfig = getAccessConfig(employee.accessLevel);
                      const statusConfig = getStatusConfig(employee);

                      return (
                        <tr
                          key={employee.id}
                          className="transition-colors border-b border-slate-100 last:border-0 odd:bg-white even:bg-[rgba(26,188,156,0.08)] hover:bg-[rgba(26,188,156,0.18)]"
                          style={{ minHeight: '60px' }}
                        >
                          {/* Name */}
                          <td className="px-3 py-3 align-middle text-left">
                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis" title={formatEmployeeName(employee.name)}>
                                {formatEmployeeName(employee.name)}
                              </p>
                              <p className="text-[11px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={employee.position}>
                                {employee.position || '—'}
                              </p>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-3 py-3 align-middle text-left">
                            <p
                              className="text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis"
                              title={employee.email}
                              style={{ maxWidth: '220px' }}
                            >
                              {employee.email}
                            </p>
                          </td>

                          {/* Phone */}
                          <td className="px-3 py-3 align-middle text-left whitespace-nowrap">
                            <p className="text-sm font-medium text-slate-900 tracking-wide overflow-hidden text-ellipsis" title={employee.phone}>
                              {employee.phone}
                            </p>
                          </td>

                          {/* Date Hired */}
                          <td className="px-3 py-3 align-middle text-left whitespace-nowrap">
                            <span className="text-sm font-semibold text-slate-900">{formatToDD_MM_YYYY(employee.dateHired)}</span>
                          </td>

                          {/* Access Level */}
                          <td className="px-3 py-3 align-middle text-left">
                            <div className={`flex flex-col text-[11px] font-semibold uppercase leading-tight ${accessConfig.className}`}>
                              {accessConfig.label.split(' ').map((word, index) => (
                                <span key={`${employee.id}-access-${index}`} className="whitespace-nowrap">
                                  {word}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 align-middle text-left whitespace-nowrap">
                            <span className={`text-[11px] font-semibold uppercase ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          </td>

                           {/* Actions */}
                          <td className="px-3 py-3 align-middle text-center" style={{ width: '120px' }}>
                            <div className="flex justify-center items-center gap-2">
                              {shouldShowKeyAction ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateCredentials(employee.id);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-slate-100 transition-colors"
                                  title={employee.accountStatus === 'pending' ? 'Regenerate Login Credentials' : 'Generate Login Credentials'}
                                  type="button"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="w-8 h-8 inline-flex items-center justify-center" aria-hidden="true"></span>
                              )}
                              <button
                                onClick={() => setEditingEmployee(employee)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-blue-600 hover:text-blue-800 hover:bg-slate-100 transition-colors"
                                title="Edit Employee"
                                type="button"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingEmployee(employee)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-rose-600 hover:text-rose-800 hover:bg-slate-100 transition-colors"
                                title="Delete Employee"
                                type="button"
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
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40" data-slot="dialog-content" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">Employee Management</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Juan Miguel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Santos"
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
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Position *</label>
                <select
                  name="position"
                  required
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <option value="">Select a position</option>
                  <option value="dentist">Dentist</option>
                  <option value="assistant_dentist">Assistant Dentist</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date of Birth</label>
                  <input
                    type="text"
                    name="dateOfBirth"
                    placeholder="DD/MM/YYYY"
                    onInput={(e) => (e.target as HTMLInputElement).value = formatDateInput((e.target as HTMLInputElement).value)}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Sex</label>
                  <select
                    name="sex"
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
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Address</label>
                <textarea
                  name="address"
                  rows={2}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date Hired *</label>
                <input
                  type="text"
                  name="dateHired"
                  required
                  placeholder="DD/MM/YYYY"
                  onInput={(e) => (e.target as HTMLInputElement).value = formatDateInput((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Access Level *</label>
                <select
                  name="accessLevel"
                  required
                  defaultValue="Default Accounts"
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <option value="Default Accounts">Default Accounts</option>
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-200/40">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? 'Adding...' : 'Add Employee'}
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

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent shadow-2xl border border-white/40" data-slot="dialog-content" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">Edit Employee</h3>
                <p className="text-slate-600 text-sm mt-1">Update staff information</p>
              </div>
              <button onClick={() => setEditingEmployee(null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    defaultValue={splitName(editingEmployee.name).first}
                    disabled={!canEditName}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Juan Miguel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    defaultValue={splitName(editingEmployee.name).middle}
                    disabled={!canEditName}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="Santos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    defaultValue={splitName(editingEmployee.name).last}
                    disabled={!canEditName}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                    placeholder="De La Cruz"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Position *</label>
                <select
                  name="position"
                  required
                  defaultValue={editingEmployee.position}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <option value="">Select a position</option>
                  <option value="dentist">Dentist</option>
                  <option value="assistant_dentist">Assistant Dentist</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date of Birth</label>
                  <input
                    type="text"
                    name="dateOfBirth"
                    placeholder="DD/MM/YYYY"
                    defaultValue={editingEmployee.dateOfBirth ? formatToDD_MM_YYYY(editingEmployee.dateOfBirth) : ''}
                    disabled={!canEditName}
                    onInput={(e) => (e.target as HTMLInputElement).value = formatDateInput((e.target as HTMLInputElement).value)}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Sex</label>
                  <select
                    name="sex"
                    defaultValue={editingEmployee.sex || ''}
                    disabled={!canEditName}
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
                    defaultValue={editingEmployee.phone}
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
                    defaultValue={editingEmployee.email}
                    className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Address</label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingEmployee.address}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Date Hired *</label>
                <input
                  type="text"
                  name="dateHired"
                  required
                  defaultValue={formatToDD_MM_YYYY(editingEmployee.dateHired)}
                  placeholder="DD/MM/YYYY"
                  onInput={(e) => (e.target as HTMLInputElement).value = formatDateInput((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 tracking-wide uppercase">Access Level *</label>
                <select
                  name="accessLevel"
                  required
                  defaultValue={editingEmployee.accessLevel || 'Default Accounts'}
                  className="w-full px-4 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all duration-300 text-slate-900 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Default Accounts">Default Accounts</option>
                </select>
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-200/40">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? 'Updating...' : 'Update Employee'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
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
      {deletingEmployee && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/40">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-900 mb-3">Delete Employee?</h3>
            <p className="text-center text-slate-600 mb-2">
              Are you sure you want to delete
            </p>
            <p className="text-center font-bold text-slate-900 mb-4">
              {`${splitName(deletingEmployee.name).first} ${splitName(deletingEmployee.name).last}`.trim()}
            </p>
            <p className="text-center text-sm text-red-600 mb-8 leading-relaxed">
              This action cannot be undone.{deletingEmployee.user_id ? ' This will also delete their login account.' : ''}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteEmployee}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3.5 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wide uppercase shadow-lg hover:shadow-xl hover:shadow-red-500/20 transform hover:scale-105 active:scale-95"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeletingEmployee(null)}
                className="flex-1 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-bold text-sm tracking-wide uppercase text-slate-900 hover:border-slate-300 py-3.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">Login Credentials Generated!</h3>
                <p className="text-slate-600 text-sm mt-1">Save these details securely</p>
              </div>
              <button onClick={() => setGeneratedCredentials(null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-5">
                <p className="text-sm text-emerald-800 mb-4 font-semibold">
                  ⚠️ Save these credentials! They will only be shown once.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Username</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={generatedCredentials.username}
                        readOnly
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-lg font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedCredentials.username, 'username')}
                        className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all duration-300"
                        title="Copy Username"
                      >
                        {copiedField === 'username' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Temporary Password</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={generatedCredentials.password}
                        readOnly
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-lg font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                        className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all duration-300"
                        title="Copy Password"
                      >
                        {copiedField === 'password' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-700 mt-4">
                  The employee will be prompted to change their password on first login.
                </p>
              </div>
              <button
                onClick={() => setGeneratedCredentials(null)}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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
