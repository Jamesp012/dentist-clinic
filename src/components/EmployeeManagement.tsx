import { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Trash2, Key, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { convertToDBDate, formatToDD_MM_YYYY, formatDateInput } from '../utils/dateHelpers';

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

  const currentUser = getStoredUser();
  const canEditName = currentUser && currentUser.role === 'doctor';

  const splitName = (fullName: string) => {
    // Split on internal delimiter (newline) to preserve spaces in names
    // Format: first\nmiddle\nlast (or first\nlast for backward compatibility)
    const parts = (fullName || '').split('\n').map(p => p || '');
    
    if (parts.length >= 3) {
      // New format: first\nmiddle\nlast
      return { first: parts[0], middle: parts[1], last: parts[2] };
    } else if (parts.length === 2) {
      // Old format: first\nlast (no middle name)
      return { first: parts[0], middle: '', last: parts[1] };
    } else {
      // Fallback for space-separated format
      const spaceParts = (fullName || '').trim().split(/\s+/).filter(Boolean);
      const first = spaceParts.length > 0 ? spaceParts[0] : '';
      const last = spaceParts.length > 1 ? spaceParts.slice(1).join(' ') : '';
      return { first, middle: '', last };
    }
  };

  const formatEmployeeName = (fullName: string): string => {
    // Extract first, middle, and last name components
    const { first, middle, last } = splitName(fullName);
    
    // Format: LASTNAME, Firstname Secondname M.I.
    // Where M.I. is only the first letter of the middle name
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

  useEffect(() => {
    if (token) {
      fetchEmployees();
    }
  }, [token]);

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees with token:', token ? 'Present' : 'Missing');
      const response = await fetch('http://localhost:5000/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Employees fetched:', data);
        setEmployees(data);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch employees:', response.status, errorData);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const { first, last } = splitName(employee.name);
    const term = searchTerm.toLowerCase();
    return (
      first.toLowerCase().includes(term) ||
      last.toLowerCase().includes(term) ||
      employee.email.toLowerCase().includes(term) ||
      employee.position.toLowerCase().includes(term)
    );
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aParts = splitName(a.name);
    const bParts = splitName(b.name);
    
    // Sort by last name first
    const lastNameCompare = aParts.last.toLowerCase().localeCompare(bParts.last.toLowerCase());
    if (lastNameCompare !== 0) return lastNameCompare;
    
    // If last names are equal, sort by first name
    const firstNameCompare = aParts.first.toLowerCase().localeCompare(bParts.first.toLowerCase());
    if (firstNameCompare !== 0) return firstNameCompare;
    
    // If first names are equal, sort by middle name
    const middleNameCompare = aParts.middle.toLowerCase().localeCompare(bParts.middle.toLowerCase());
    return middleNameCompare;
  });

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsLoading(true);
    try {
      const formData = new FormData(form);
      const first = (formData.get('first_name') as string) || '';
      const middle = (formData.get('middle_name') as string) || '';
      const last = (formData.get('last_name') as string) || '';
      const newEmployee = {
        name: `${first}\n${middle}\n${last}`,
        position: formData.get('position') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        dateHired: convertToDBDate(formData.get('dateHired') as string),
        dateOfBirth: convertToDBDate(formData.get('dateOfBirth') as string),
        sex: formData.get('sex') as 'Male' | 'Female',
        accessLevel: formData.get('accessLevel') as string,
      };

      console.log('Submitting new employee:', newEmployee);
      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmployee)
      });

      console.log('Add employee response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Employee added successfully:', result);
        form.reset();
        await fetchEmployees();
        setShowAddModal(false);
        toast.success('Employee added successfully!');
      } else {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Failed to add employee:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const first = (formData.get('first_name') as string) || '';
      const middle = (formData.get('middle_name') as string) || '';
      const last = (formData.get('last_name') as string) || '';
      const updatedEmployee = {
        name: `${first}\n${middle}\n${last}`,
        position: formData.get('position') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        dateHired: convertToDBDate(formData.get('dateHired') as string),
        dateOfBirth: convertToDBDate(formData.get('dateOfBirth') as string),
        sex: formData.get('sex') as 'Male' | 'Female',
        accessLevel: formData.get('accessLevel') as string,
      };

      const response = await fetch(`http://localhost:5000/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedEmployee)
      });

      if (response.ok) {
        await fetchEmployees();
        setEditingEmployee(null);
        toast.success('Employee updated successfully!');
      } else {
        throw new Error('Failed to update employee');
      }
    } catch (error) {
      console.error('Failed to update employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/employees/${deletingEmployee.id}`, {
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
      const response = await fetch(`http://localhost:5000/api/employees/${employeeId}/generate-credentials`, {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 flex flex-col flex-1">
      <div className="p-8 space-y-8 flex flex-col flex-1">
        {/* Search & Add Button */}
        <div className="relative flex items-center justify-between gap-4 sticky top-0 bg-gradient-to-b from-white/80 via-white/60 to-transparent backdrop-blur-lg z-30 -mx-8 px-8 py-4 mb-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Search employees by name, position, or email..."
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
            <span>Add Employee</span>
            <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
          </button>
        </div>

        {/* Employees List */}
        <div className="flex-1 flex flex-col min-h-0">
          {sortedEmployees.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-16 px-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-teal-600">EM</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {searchTerm ? 'No employees found' : 'No employees added yet'}
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  {searchTerm
                    ? 'Try adjusting your search criteria'
                    : 'Add your first team member to get started'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
              {sortedEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="group relative bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-teal-500/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-teal-400/10 to-transparent rounded-full -translate-y-20 translate-x-20 group-hover:scale-125 transition-transform duration-500 blur-2xl pointer-events-none"></div>

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-10 gap-6 items-center">
                    <div className="xl:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Name</p>
                      <p className="text-lg font-bold text-slate-900">{formatEmployeeName(employee.name)}</p>
                    </div>

                    <div className="xl:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Position</p>
                      <p className="text-sm font-medium text-slate-700">{employee.position}</p>
                    </div>

                    <div className="xl:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Access</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                        employee.accessLevel === 'Super Admin' ? 'bg-purple-100 text-purple-800' :
                        employee.accessLevel === 'Admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.accessLevel || 'Default Accounts'}
                      </span>
                    </div>

                    <div className="xl:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm text-slate-700 truncate" title={employee.email}>{employee.email}</p>
                    </div>

                    <div className="xl:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm font-medium text-slate-700">{employee.phone}</p>
                    </div>

                    <div className="xl:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Date Hired</p>
                      <p className="text-sm font-medium text-slate-700">{formatToDD_MM_YYYY(employee.dateHired)}</p>
                    </div>

                    <div className="xl:col-span-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      {employee.user_id ? (
                        employee.accountStatus === 'pending' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        ) : employee.accountStatus === 'active' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-gray-100 text-gray-800">
                          No Account
                        </span>
                      )}
                    </div>

                    <div className="xl:col-span-1 flex items-center justify-end gap-2">
                      {(!employee.user_id || employee.accountStatus === 'pending' || !employee.isCodeUsed) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateCredentials(employee.id);
                          }}
                          className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 hover:from-emerald-100 hover:to-teal-100 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                          title={employee.accountStatus === 'pending' ? 'Regenerate Login Credentials' : 'Generate Login Credentials'}
                          type="button"
                        >
                          <Key className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingEmployee(employee)}
                        className="p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 hover:from-blue-100 hover:to-cyan-100 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Edit Employee"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeletingEmployee(employee)}
                        className="p-2.5 rounded-lg bg-gradient-to-br from-red-50 to-pink-50 text-red-600 hover:from-red-100 hover:to-pink-100 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
