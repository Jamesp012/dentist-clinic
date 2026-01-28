import { useState, useEffect } from 'react';
import { Patient, Appointment, TreatmentRecord, PhotoUpload, Announcement, ServicePrice, Payment } from '../App';
import { Calendar, FileText, User as UserIcon, Clock, Image, X, Upload, Edit, Save, XCircle, Info, CheckCircle, AlertCircle, Camera, Sparkles, Heart, Smile, Shield, Megaphone, Send, Plus, CreditCard, Settings, Check, Eye, EyeOff, Menu, LogOut, History } from 'lucide-react';
import { PesoSign } from './icons/PesoSign';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { appointmentAPI } from '../api';

type PatientPortalProps = {
  patient: Patient;
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  treatmentRecords: TreatmentRecord[];
  onUpdatePatient?: (updatedPatient: Patient) => void;
  billingBalance?: number;
  photos: PhotoUpload[];
  setPhotos: (photos: PhotoUpload[]) => void;
  announcements: Announcement[];
  servicePrices: ServicePrice[];
  payments: Payment[];
  currentUserId: string;
  onLogout?: () => void;
  onDataChanged?: () => Promise<void>;
};

const API_BASE = 'http://localhost:5000/api';

export function PatientPortal({ patient, appointments, setAppointments, treatmentRecords, onUpdatePatient, billingBalance = 5000, photos, setPhotos, announcements, servicePrices, payments, currentUserId, onLogout, onDataChanged }: PatientPortalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'appointments' | 'records' | 'photos' | 'balance' | 'care-guide' | 'announcements' | 'services'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<Patient>(patient);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoUpload | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadType, setUploadType] = useState<'before' | 'after' | 'xray'>('before');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newFullName, setNewFullName] = useState(patient.name);
  const [newUsername, setNewUsername] = useState(patient.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Appointment booking state
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);

  const checkUsernameAvailability = async (username: string) => {
    if (username === (patient.username || '')) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }
    
    if (username.trim().length < 3) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsernameAvailable(data.available);
      } else {
        // If API returns an error, username is invalid
        setUsernameAvailable(null);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    }
    setCheckingUsername(false);
  };

  const handleSaveSettings = async () => {
    // Validation
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error('Current password is required to change password');
      return;
    }

    // Check if username was changed and is unavailable (only false means unavailable, null means still checking)
    if (newUsername !== currentUser.username && usernameAvailable === false) {
      toast.error('Username is not available');
      return;
    }

    // Check if username was changed and availability check is still in progress
    if (newUsername !== currentUser.username && checkingUsername) {
      toast.error('Please wait for username availability check to complete');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/update-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser.id,
          fullName: newFullName,
          username: newUsername,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        })
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseError) {
        console.error('Failed to parse update-settings response', parseError, raw);
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully!');
      
      // Update currentUser object
      currentUser.fullName = data.user.fullName;
      currentUser.username = data.user.username;
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSettings(false);
      
      // Refresh the page to reflect changes
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    }
  };

  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    setUsernameAvailable(null);
    
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }
    
    const timeout = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
    
    setUsernameCheckTimeout(timeout);
  };

  const patientAppointments = appointments.filter(apt => String(apt.patientId) === String(patient.id));
  // treatmentRecords are already filtered in App.tsx for this patient, so use directly
  const patientRecords = treatmentRecords;
  const patientPhotos = photos.filter(photo => String(photo.patientId) === String(patient.id));

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: UserIcon, color: 'from-blue-500 to-blue-600' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'from-emerald-500 to-emerald-600' },
    { id: 'records', label: 'Records', icon: FileText, color: 'from-purple-500 to-purple-600' },
    { id: 'photos', label: 'Photos', icon: Camera, color: 'from-pink-500 to-pink-600' },
    { id: 'balance', label: 'Balance', icon: CreditCard, color: 'from-orange-500 to-orange-600' },
    { id: 'care-guide', label: 'Care Guide', icon: Sparkles, color: 'from-cyan-500 to-cyan-600' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, color: 'from-indigo-500 to-indigo-600' },
    { id: 'services', label: 'Services', icon: PesoSign, color: 'from-teal-500 to-teal-600' },
  ] as const;

  const upcomingAppointments = patientAppointments.filter(
    apt => apt.status === 'scheduled' && new Date(apt.date) >= new Date()
  );

  const pastAppointments = patientAppointments.filter(
    apt => apt.status === 'completed' || new Date(apt.date) < new Date()
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

  const totalSpent = patientRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const totalPaid = patientRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  const currentBalance = patient.totalBalance !== undefined ? Number(patient.totalBalance) : (totalSpent - totalPaid);

  // Debug logging
  useEffect(() => {
    console.log('PatientPortal - Treatment Records:', patientRecords);
    console.log('PatientPortal - Calculations:', { totalSpent, totalPaid, currentBalance });
  }, [patientRecords, totalSpent, totalPaid, currentBalance]);

  const handleSaveProfile = () => {
    if (onUpdatePatient) {
      onUpdatePatient(editedPatient);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedPatient(patient);
    setIsEditing(false);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handlePhotoUpload = () => {
    // Simulate photo upload
    const newPhoto: PhotoUpload = {
      id: Date.now().toString(),
      patientId: patient.id,
      type: uploadType,
      url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400',
      date: new Date().toISOString(),
      notes: uploadNotes
    };
    setPhotos([...photos, newPhoto]);
    setUploadNotes('');
    toast.success('Photo uploaded successfully!');
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentTime || !appointmentType) {
      toast.error('Please fill in all appointment details');
      return;
    }

    setIsBookingAppointment(true);
    
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      patientId: patient.id,
      patientName: patient.name,
      date: appointmentDate,
      time: appointmentTime,
      type: appointmentType,
      duration: 60,
      status: 'scheduled',
      notes: appointmentNotes
    };

    try {
      // Save appointment to API
      const createdAppointment = await appointmentAPI.create(newAppointment);
      
      // Update local state with the created appointment (or use the one we created if API just returns success)
      setAppointments([...appointments, createdAppointment as Appointment || newAppointment]);
      
      setAppointmentDate('');
      setAppointmentTime('');
      setAppointmentType('');
      setAppointmentNotes('');
      toast.success('Appointment request submitted! The clinic will confirm your appointment soon.');
      
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to book appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsBookingAppointment(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none"></div>
        
        <div className="p-6 flex items-center justify-between border-b border-slate-700/50 relative z-10">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowSettings(true)}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                {patient.name?.charAt(0) || 'P'}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden text-ellipsis">{patient.name}</h1>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  Patient
                  <Settings className="w-3 h-3" />
                </p>
              </div>
            </motion.div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 hover:bg-slate-700/50 rounded-xl transition-all duration-200 backdrop-blur-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto relative z-10">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl mb-2 transition-all duration-200 group relative overflow-hidden ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r ' + item.color + ' shadow-lg shadow-blue-500/20'
                    : 'hover:bg-slate-700/30 hover:translate-x-1'
                }`}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className={`p-2 rounded-lg ${activeTab === item.id ? 'bg-white/20' : 'bg-slate-700/30 group-hover:bg-slate-600/40'} transition-all`}>
                  <Icon className="w-5 h-5" />
                </div>
                {sidebarOpen && (
                  <span className={`text-sm font-medium ${activeTab === item.id ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </span>
                )}
                {activeTab === item.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-slate-700/50 relative z-10">
          {sidebarOpen ? (
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🦷</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">Patient Portal</p>
                    <p className="text-xs text-blue-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Health Dashboard
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-3 hover:bg-slate-700/50 rounded-xl flex items-center justify-center transition-all group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-5 flex justify-between items-center shadow-sm relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Welcome back, {patient.name}
            </h2>
            <p className="text-sm text-blue-600 font-medium flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Patient - Your Health Dashboard
            </p>
          </div>
        </motion.div>
        
        {/* Main Content Area with Animation */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'profile' && (
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Personal Information
                    </h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Full Name</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedPatient.name}
                        onChange={(e) => setEditedPatient({...editedPatient, name: e.target.value})}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      />
                    ) : (
                      <p className="font-medium">{patient.name}</p>
                    )}
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Age</p>
                    <p className="font-medium">{calculateAge(patient.dateOfBirth)} years old</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sex</p>
                    <p className="font-medium">{patient.sex}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
                    <p className="font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Phone</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedPatient.phone}
                        onChange={(e) => handlePhoneInput(e.target.value, (formatted) => setEditedPatient({...editedPatient, phone: formatted}))}
                        onBlur={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          if (formatted !== e.target.value) {
                            setEditedPatient({...editedPatient, phone: formatted});
                          }
                        }}
                        placeholder="+63 912 345 6789"
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      />
                    ) : (
                      <p className="font-medium">{patient.phone}</p>
                    )}
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedPatient.email}
                        onChange={(e) => setEditedPatient({...editedPatient, email: e.target.value})}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      />
                    ) : (
                      <p className="font-medium">{patient.email}</p>
                    )}
                  </div>
                  <div className="col-span-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedPatient.address}
                        onChange={(e) => setEditedPatient({...editedPatient, address: e.target.value})}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      />
                    ) : (
                      <p className="font-medium">{patient.address}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Medical Information
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Medical History</p>
                      {isEditing ? (
                        <textarea
                          value={editedPatient.medicalHistory}
                          onChange={(e) => setEditedPatient({...editedPatient, medicalHistory: e.target.value})}
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                          rows={3}
                        />
                      ) : (
                        <p className="font-medium">{patient.medicalHistory || 'None'}</p>
                      )}
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Allergies</p>
                      {isEditing ? (
                        <textarea
                          value={editedPatient.allergies}
                          onChange={(e) => setEditedPatient({...editedPatient, allergies: e.target.value})}
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                          rows={3}
                        />
                      ) : (
                        <p className={`font-medium ${patient.allergies !== 'None' ? 'text-red-600' : ''}`}>
                          {patient.allergies || 'None'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="p-8 space-y-6">
                {/* Book New Appointment Form */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-lg">
                  <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                    <Plus className="w-6 h-6 text-blue-600" />
                    Book New Appointment
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Appointment Date</label>
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Preferred Time</label>
                      <select
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      >
                        <option value="">Select time...</option>
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:00 AM">11:00 AM</option>
                        <option value="01:00 PM">01:00 PM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="03:00 PM">03:00 PM</option>
                        <option value="04:00 PM">04:00 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Service Type</label>
                      <select
                        value={appointmentType}
                        onChange={(e) => setAppointmentType(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      >
                        <option value="">Select service...</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Extraction">Extraction</option>
                        <option value="Pasta">Pasta</option>
                        <option value="Braces">Braces</option>
                        <option value="Pustiso/Dentures">Pustiso/Dentures</option>
                        <option value="Check-up">Check-up</option>
                        <option value="Consultation">Consultation</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Notes (Optional)</label>
                      <input
                        type="text"
                        value={appointmentNotes}
                        onChange={(e) => setAppointmentNotes(e.target.value)}
                        placeholder="Any special requests..."
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleBookAppointment}
                    disabled={isBookingAppointment}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Calendar className="w-5 h-5" />
                    {isBookingAppointment ? 'Booking...' : 'Request Appointment'}
                  </button>
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    <Info className="w-4 h-4 inline-block mr-1" />
                    Your appointment request will be reviewed by our staff and you'll receive a confirmation.
                  </p>
                </div>

                {upcomingAppointments.length > 0 && (
                  <div>
                    <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Upcoming Appointments
                    </h2>
                    <div className="space-y-3">
                      {upcomingAppointments.map(apt => (
                        <div key={apt.id} className="p-4 border-2 border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-lg mb-1">{apt.type}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(apt.date).toLocaleDateString()}</span>
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{apt.time}</span>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              {apt.status}
                            </span>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-gray-600 mt-2">{apt.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div>
                    <h2 className="text-xl mb-4 text-gray-700">
                      Past Appointments
                    </h2>
                    <div className="space-y-3">
                      {pastAppointments.slice(-5).reverse().map(apt => (
                        <div key={apt.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-lg mb-1">{apt.type}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(apt.date).toLocaleDateString()}</span>
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{apt.time}</span>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Treatment Records Tab */}
            {activeTab === 'records' && (
              <div className="p-8 space-y-4">
                <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Treatment History
                </h2>
                {patientRecords.length > 0 ? (
                  <div className="space-y-3">
                    {patientRecords.map(record => (
                      <div key={record.id} className="p-4 border border-purple-200 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-lg mb-1">{record.treatment}</p>
                            {record.tooth && (
                              <p className="text-sm text-gray-600">Tooth: {record.tooth}</p>
                            )}
                            <p className="text-sm text-gray-500">Dr. {record.dentist}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 mb-1">
                              {new Date(record.date).toLocaleDateString()}
                            </p>
                            <p className="text-lg">₱{record.cost.toFixed(2)}</p>
                          </div>
                        </div>
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No treatment records available</p>
                  </div>
                )}
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div className="p-8 space-y-6">
                <h2 className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Treatment Photos & X-Rays
                </h2>

                {/* Photos Grid */}
                {patientPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {patientPhotos.map(photo => (
                      <motion.div
                        key={photo.id}
                        className="relative group cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img
                          src={photo.url}
                          alt={photo.type}
                          className="w-full h-48 object-cover rounded-lg border-2 border-purple-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                          <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                            <p className="font-semibold capitalize">{photo.type}</p>
                            <p className="text-sm">{new Date(photo.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded capitalize">
                          {photo.type}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">Photos Unavailable</p>
                    <p className="text-sm mt-2">No photos have been uploaded yet. Photos will be available once uploaded by clinic staff.</p>
                  </div>
                )}
              </div>
            )}

            {/* Billing Balance Tab */}
            {activeTab === 'balance' && (
              <div className="p-8 space-y-6">
                <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Billing Summary
                </h2>

                {/* Balance Card */}
                <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                      <p className="text-4xl text-red-600">₱{currentBalance.toLocaleString()}</p>
                    </div>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">As of {new Date().toLocaleDateString()}</p>
                  {currentBalance > 0 && (
                    <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        You have an outstanding balance. Please contact the clinic to arrange payment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Total Billed</p>
                    <p className="text-2xl">₱{totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                    <p className="text-2xl text-green-600">₱{totalPaid.toLocaleString()}</p>
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    Recent Payments
                  </h3>
                  <div className="space-y-2">
                    {payments
                      .filter(p => String(p.patientId) === String(patient.id))
                      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                      .slice(0, 10)
                      .map(payment => (
                        <div key={payment.id} className="p-4 bg-white rounded-lg border border-gray-100 flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Payment Received</p>
                              <p className="text-xs text-gray-500">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                              {payment.notes && <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>}
                            </div>
                          </div>
                          <p className="text-lg font-bold text-green-600">₱{payment.amount}</p>
                        </div>
                      ))}
                    {payments.filter(p => String(p.patientId) === String(patient.id)).length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">No payment records found.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treatment Charges */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Treatment Charges
                  </h3>
                  <div className="space-y-2">
                    {patientRecords.slice().reverse().map(record => (
                      <div key={record.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{record.treatment}</p>
                          <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-lg">₱{record.cost}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Care Guide Tab */}
            {activeTab === 'care-guide' && (
              <div className="p-8 space-y-6">
                <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dental Care Guide
                </h2>

                {/* Before Treatment */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl">Before Your Appointment</h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Brush and Floss</p>
                        <p className="text-sm text-gray-600">Clean your teeth thoroughly before your visit</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">List Your Concerns</p>
                        <p className="text-sm text-gray-600">Write down any dental issues or questions you have</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Bring Your Records</p>
                        <p className="text-sm text-gray-600">Have your medical history and current medications ready</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Arrive Early</p>
                        <p className="text-sm text-gray-600">Come 10-15 minutes before your scheduled time</p>
                      </div>
                    </li>
                  </ul>
                </motion.div>

                {/* During Treatment */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl">During Your Appointment</h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Communicate Openly</p>
                        <p className="text-sm text-gray-600">Tell your dentist if you feel any discomfort or pain</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Ask Questions</p>
                        <p className="text-sm text-gray-600">Don't hesitate to ask about the procedure or treatment plan</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Stay Relaxed</p>
                        <p className="text-sm text-gray-600">Take deep breaths and try to stay calm during treatment</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Follow Instructions</p>
                        <p className="text-sm text-gray-600">Listen carefully to your dentist's guidance during the procedure</p>
                      </div>
                    </li>
                  </ul>
                </motion.div>

                {/* After Treatment */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <Smile className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl">After Your Appointment</h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Follow Post-Treatment Instructions</p>
                        <p className="text-sm text-gray-600">Carefully follow all care instructions provided by your dentist</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Take Prescribed Medications</p>
                        <p className="text-sm text-gray-600">If prescribed, take all medications as directed</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Manage Discomfort</p>
                        <p className="text-sm text-gray-600">Use ice packs and pain relievers as recommended for any swelling or pain</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Watch Your Diet</p>
                        <p className="text-sm text-gray-600">Stick to soft foods and avoid hot beverages for the first 24 hours</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Contact If Needed</p>
                        <p className="text-sm text-gray-600">Call the clinic if you experience severe pain, bleeding, or other concerns</p>
                      </div>
                    </li>
                  </ul>
                </motion.div>

                {/* General Daily Care */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl">Daily Dental Care Tips</h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Brush Twice Daily</p>
                        <p className="text-sm text-gray-600">Brush for 2 minutes, morning and night, with fluoride toothpaste</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Floss Daily</p>
                        <p className="text-sm text-gray-600">Floss at least once a day to remove plaque between teeth</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Use Mouthwash</p>
                        <p className="text-sm text-gray-600">Rinse with antibacterial mouthwash to kill bacteria and freshen breath</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Limit Sugary Foods</p>
                        <p className="text-sm text-gray-600">Reduce consumption of candy, soda, and sugary snacks</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Regular Check-ups</p>
                        <p className="text-sm text-gray-600">Visit your dentist every 6 months for cleaning and examination</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Replace Your Toothbrush</p>
                        <p className="text-sm text-gray-600">Change your toothbrush every 3-4 months or when bristles fray</p>
                      </div>
                    </li>
                  </ul>
                </motion.div>
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="p-8 space-y-6">
                <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Announcements
                </h2>

                {/* Announcements List */}
                <div className="space-y-4">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-lg mb-2">{ann.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{new Date(ann.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-700">{ann.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Services
                </h2>

                {/* Services List */}
                <div className="space-y-4">
                  {servicePrices.map(service => (
                    <div key={service.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-lg mb-2">{service.serviceName}</h3>
                      <p className="text-sm text-gray-600 mb-2">Price: ₱{service.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-700">{service.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <>
        {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-8"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-full bg-white rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.type}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="p-6 bg-white">
                <p className="font-semibold text-lg capitalize mb-2">{selectedPhoto.type} Photo</p>
                <p className="text-sm text-gray-600 mb-2">Date: {new Date(selectedPhoto.date).toLocaleDateString()}</p>
                {selectedPhoto.notes && (
                  <p className="text-sm text-gray-700">{selectedPhoto.notes}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Account Settings</h2>
                      <p className="text-sm text-blue-100">Manage your profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Full Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Username Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your username"
                    />
                    {checkingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {!checkingUsername && usernameAvailable === true && newUsername !== (patient.username || '') && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                        <X className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-sm text-red-600 mt-1">Username is already taken</p>
                  )}
                  {usernameAvailable === true && newUsername !== (patient.username || '') && (
                    <p className="text-sm text-green-600 mt-1">Username is available</p>
                  )}
                  {newUsername.trim().length > 0 && newUsername.trim().length < 3 && (
                    <p className="text-sm text-gray-600 mt-1">Username must be at least 3 characters</p>
                  )}
                </div>

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter new password (leave blank to keep current)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                {newPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {newPassword !== confirmPassword && confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setNewFullName(patient.name);
                    setNewUsername(patient.username || '');
                    setNewPassword('');
                    setConfirmPassword('');
                    setCurrentPassword('');
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newPassword && newPassword !== confirmPassword) {
                      toast.error('Passwords do not match!');
                      return;
                    }
                    if (usernameAvailable === false) {
                      toast.error('Username is already taken. Please choose a different username.');
                      return;
                    }
                    if (newUsername.trim().length < 3) {
                      toast.error('Username must be at least 3 characters long.');
                      return;
                    }
                    handleSaveSettings();
                  }}
                  disabled={checkingUsername || (newUsername !== currentUser.username && usernameAvailable === false)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
    </div>
  );
}