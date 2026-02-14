import { useState } from 'react';
import { Menu, Users, Calendar, ClipboardList, FileText, LayoutDashboard, Stethoscope, LogOut, Sparkles, UserCog, Settings, X, Check, Eye, EyeOff, Megaphone, Camera, Package, Upload, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { PesoSign } from './icons/PesoSign';
import { Dashboard } from './Dashboard';
import { PatientManagement } from './PatientManagement';
import { AppointmentScheduler } from './AppointmentScheduler';
import { InventoryManagement } from './InventoryManagementNew';
import { DentalChartWebsite } from './DentalChartWebsite';
import { BracesCharting } from './BracesCharting';
import { ReferralGeneration } from './ReferralGeneration';
// import { ReferralManagement } from './ReferralManagement';
import { ServicesForms } from './ServicesForms';
import { FinancialReport } from './FinancialReport';
import { AnnouncementsManagement } from './AnnouncementsManagement';
import { Notifications } from './Notifications';
import { EmployeeManagement } from './EmployeeManagement';
import { motion, AnimatePresence } from 'motion/react';
import { formatToDD_MM_YYYY } from '../utils/dateHelpers';
import type { User } from './AuthPage';
import type { Patient, Appointment, InventoryItem, TreatmentRecord, Referral, PhotoUpload, Payment, Announcement, Service } from '../App';

type DoctorDashboardProps = {
  currentUser: User;
  onLogout: () => void;
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  treatmentRecords: TreatmentRecord[];
  setTreatmentRecords: (records: TreatmentRecord[]) => void;
  referrals: Referral[];
  setReferrals: (referrals: Referral[]) => void;
  photos: PhotoUpload[];
  setPhotos: (photos: PhotoUpload[]) => void;
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  services: Service[];
  setServices: (services: Service[]) => void;
  onDataChanged?: () => Promise<void>;
};

import { API_BASE } from '../api';

// Display name for user (first and last only, no middle name)
const getUserDisplayName = (fullName: string | undefined): string => {
  if (!fullName) return '';
  // Split by whitespace and take first and last names
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) return '';
  if (nameParts.length === 1) return nameParts[0];
  // Return first and last name only
  return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
};

// Helper function to split patient names
const splitPatientName = (fullName: string) => {
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

// Display name for sidebar/dropdowns (first and last only, no middle name)
const getDisplayName = (fullName: string): string => {
  const { first, last } = splitPatientName(fullName);
  return `${first} ${last}`.trim();
};

export function DoctorDashboard({
  currentUser,
  onLogout,
  patients,
  setPatients,
  appointments,
  setAppointments,
  inventory,
  setInventory,
  treatmentRecords,
  setTreatmentRecords,
  referrals,
  setReferrals,
  photos,
  setPhotos,

  payments,
  setPayments,
  announcements,
  setAnnouncements,
  services,
  setServices,
  onDataChanged
}: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newFullName, setNewFullName] = useState(currentUser.fullName);
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<{ patientId: string; patientName: string; appointmentType: string; appointmentId?: string } | null>(null);

  const checkUsernameAvailability = async (username: string) => {
    if (username === currentUser.username) {
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
      alert('New passwords do not match');
      return;
    }

    if (newPassword && !currentPassword) {
      alert('Current password is required to change password');
      return;
    }

    // Check if username was changed and is unavailable (only false means unavailable, null means still checking)
    if (newUsername !== currentUser.username && usernameAvailable === false) {
      alert('Username is not available');
      return;
    }

    // Check if username was changed and availability check is still in progress
    if (newUsername !== currentUser.username && checkingUsername) {
      alert('Please wait for username availability check to complete');
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

      alert('Settings updated successfully!');
      
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
      alert(error instanceof Error ? error.message : 'Failed to update settings');
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

  const handleOpenServiceForm = (appointmentData: { patientId: string; patientName: string; appointmentType: string; appointmentId?: string }) => {
    setPrefilledAppointmentData(appointmentData);
    setActiveTab('services');
  };

  // Photo upload state
  const [selectedPatientForPhoto, setSelectedPatientForPhoto] = useState<string>('');
  const [photoType, setPhotoType] = useState<string>('before');
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null);
  const [showReplacePhotoModal, setShowReplacePhotoModal] = useState<string | number | null>(null);
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState<string | number | null>(null);
  const [replacePhotoFile, setReplacePhotoFile] = useState<File | null>(null);
  const [replacePhotoUrl, setReplacePhotoUrl] = useState<string>('');
  const [isReplacingPhoto, setIsReplacingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [viewAllPhotos, setViewAllPhotos] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Show toast function
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPatientForPhoto || !photoUrl || !photoType) {
      showToast('Please select a patient, provide a photo, and select a photo type', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const response = await fetch(`${API_BASE}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          patientId: selectedPatientForPhoto,
          type: photoType,
          url: photoUrl,
          date: new Date().toISOString().split('T')[0],
          notes: photoNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload photo: ${response.statusText}`);
      }

      const newPhoto = await response.json();
      setPhotos([...photos, newPhoto]);
      showToast('Photo uploaded successfully!', 'success');
      setSelectedPatientForPhoto('');
      setPhotoType('before');
      setPhotoNotes('');
      setPhotoUrl('');
      setPhotoFile(null);

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleReplacePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }
      setReplacePhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setReplacePhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReplacePhoto = async () => {
    if (!showReplacePhotoModal || !replacePhotoUrl) {
      showToast('Please select a new photo', 'error');
      return;
    }

    setIsReplacingPhoto(true);
    try {
      const response = await fetch(`${API_BASE}/photos/${showReplacePhotoModal}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: replacePhotoUrl
        })
      });

      if (!response.ok) throw new Error('Replace failed');

      const updatedPhoto = await response.json();
      setPhotos(photos.map(p => p.id === showReplacePhotoModal ? updatedPhoto : p));
      setShowReplacePhotoModal(null);
      setReplacePhotoFile(null);
      setReplacePhotoUrl('');
      showToast('Photo replaced successfully!', 'success');

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Error replacing photo:', error);
      showToast('Failed to replace photo. Please try again.', 'error');
    } finally {
      setIsReplacingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!showDeletePhotoConfirm) return;

    setIsDeletingPhoto(true);
    try {
      const response = await fetch(`${API_BASE}/photos/${showDeletePhotoConfirm}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Delete failed');

      setPhotos(photos.filter(p => p.id !== showDeletePhotoConfirm));
      setShowDeletePhotoConfirm(null);
      showToast('Photo deleted successfully!', 'success');

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast('Failed to delete photo. Please try again.', 'error');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-teal-500 to-cyan-600' },
    { id: 'patients', label: 'Patients', icon: Users, color: 'from-teal-500 to-teal-600' },
    { id: 'employees', label: 'Employees', icon: UserCog, color: 'from-cyan-600 to-teal-500' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'from-teal-600 to-cyan-600' },
    { id: 'photos', label: 'Patient Photos', icon: Camera, color: 'from-teal-500 to-emerald-600' },
    { id: 'charting', label: 'Dental Charting', icon: ClipboardList, color: 'from-cyan-500 to-teal-500' },
    { id: 'braces', label: 'Braces Charting', icon: Sparkles, color: 'from-teal-500 to-emerald-600' },
    { id: 'referrals', label: 'Referrals', icon: FileText, color: 'from-cyan-500 to-emerald-600' },
    { id: 'services', label: 'Services Forms', icon: Stethoscope, color: 'from-teal-600 to-cyan-600' },
    { id: 'inventory', label: 'Inventory', icon: Package, color: 'from-cyan-600 to-teal-500' },
    { id: 'financial', label: 'Financial Report', icon: PesoSign, color: 'from-emerald-500 to-teal-600' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, color: 'from-cyan-600 to-teal-500' },
  ];

  return (
    <div className="flex h-screen bg-slate-50">{/* Sidebar - Modern Dark Purple Design */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-[#e2fcfb] text-gray-800 transition-all duration-300 flex flex-col shadow-2xl relative overflow-hidden scrollbar-light`}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
        
        <div className={`px-6 py-6 flex items-center justify-start gap-3 border-b border-teal-300 relative z-10 ${sidebarOpen ? 'min-h-[104px]' : 'min-h-[100px]'}`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 hover:bg-teal-200 rounded-lg transition-all duration-200 backdrop-blur-sm text-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowSettings(true)}
            >
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                  {getUserDisplayName(currentUser.fullName) || currentUser.username || 'Doctor'}
                </h1>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                  Doctor
                  <Settings className="w-3 h-3" />
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto relative z-10 sidebar-scroll space-y-2 ${
          sidebarOpen ? 'p-4' : 'p-2'
        }`}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const unreadMessages = 0;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 transition-all duration-300 group relative overflow-visible ${
                  sidebarOpen 
                    ? 'w-full px-4 py-3 rounded-full' 
                    : 'w-16 h-16 justify-center rounded-lg'
                } ${
                  activeTab === item.id
                    ? 'bg-teal-200 shadow-lg shadow-teal-300/30 translate-x-1'
                    : 'hover:bg-teal-100 hover:translate-x-0.5'
                }`}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className={`p-2 rounded-lg flex-shrink-0 transition-all duration-300 relative ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-br ' + item.color + ' text-white shadow-lg' 
                    : 'bg-teal-100 text-gray-700'
                }`}>
                  <Icon className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
                      {unreadMessages}
                    </span>
                  )}
                </div>
                {sidebarOpen && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className={`text-sm font-medium transition-colors duration-300 ${activeTab === item.id ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                    {unreadMessages > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold animate-pulse flex-shrink-0 ml-2">
                        {unreadMessages}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-teal-300 relative z-10">
          {sidebarOpen ? (
            <button
              onClick={onLogout}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-white"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="w-full p-3 hover:bg-teal-200 rounded-lg flex items-center justify-center transition-all group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-teal-600 group-hover:text-teal-700 transition-colors" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col bg-gradient-to-br from-slate-50 via-slate-25 to-[#C4FFF9]/20 scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100 hover:scrollbar-thumb-teal-600">
        {/* Header with Notifications - Premium Design */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`bg-white/80 backdrop-blur-md border-b border-white/40 px-8 py-6 ${sidebarOpen ? 'min-h-[104px]' : 'min-h-[100px]'} flex justify-between items-center shadow-sm relative`}
        >
          {/* Divider between sidebar and header for visual separation */}
          <div aria-hidden className="absolute top-0 bottom-0 pointer-events-none transition-all duration-300" style={{ left: sidebarOpen ? '18rem' : '5rem', width: '1px', backgroundColor: 'rgba(2,6,23,0.06)', boxShadow: sidebarOpen ? '1px 0 8px rgba(2,6,23,0.06)' : '1px 0 6px rgba(2,6,23,0.04)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#9CEAEF]/30 via-transparent to-[#68D8D6]/20 pointer-events-none"></div>
          <div className="relative z-10 flex-1">
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Dashboard</h2>
                <p className="text-sm text-slate-500">Overview of clinic operations</p>
              </div>
            )}
            {activeTab === 'patients' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Patient Management</h2>
                <p className="text-sm text-slate-500">Manage patient records and medical information</p>
              </div>
            )}
            {activeTab === 'employees' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Employee Management</h2>
                <p className="text-sm text-slate-500">Manage clinic staff and their access credentials</p>
              </div>
            )}
            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Appointments</h2>
                <p className="text-sm text-slate-500">Schedule and manage patient appointments</p>
              </div>
            )}
            {activeTab === 'charting' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Dental Charting</h2>
                <p className="text-sm text-slate-500">Track dental conditions and treatments</p>
              </div>
            )}
            {activeTab === 'photos' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-poppins">Upload Patient Photo</h3>
                <p className="text-sm text-slate-500">Add treatment photos to patient records</p>
              </div>
            )}
            {activeTab === 'braces' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Braces Charting</h2>
                <p className="text-sm text-slate-500">Track and manage patient braces records</p>
              </div>
            )}
            {activeTab === 'referrals' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Referrals</h2>
                <p className="text-sm text-slate-500">Generate and manage patient referrals</p>
              </div>
            )}
            {activeTab === 'services' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Services Forms</h2>
                <p className="text-sm text-slate-500">Manage clinic services and treatments</p>
              </div>
            )}
            {activeTab === 'inventory' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Inventory Management</h2>
                <p className="text-sm text-slate-500">Track supplies and manage inventory</p>
              </div>
            )}
            {activeTab === 'financial' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Financial Report</h2>
                <p className="text-sm text-slate-500">View financial data and reports</p>
              </div>
            )}
            {activeTab === 'announcements' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins">Announcements</h2>
                <p className="text-sm text-slate-500">Manage clinic announcements and updates</p>
              </div>
            )}
          </div>
          <div className="relative z-10 ml-auto">
            <Notifications
              patients={patients}
              appointments={appointments}
              referrals={referrals}
              announcements={announcements}
              onNavigate={setActiveTab}
            />
          </div>
        </motion.div>
        
        {/* Main Content Area with Animation */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100 hover:scrollbar-thumb-teal-600">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <Dashboard
                  patients={patients}
                  appointments={appointments}
                  inventory={inventory}
                  treatmentRecords={treatmentRecords}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'employees' && (
                <div className="p-6">
                  <EmployeeManagement token={localStorage.getItem('token') || ''} />
                </div>
              )}
              {activeTab === 'patients' && (
                <PatientManagement
                  patients={patients}
                  setPatients={setPatients}
                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === 'appointments' && (
                <AppointmentScheduler
                  appointments={appointments}
                  setAppointments={setAppointments}
                  patients={patients}
                  treatmentRecords={treatmentRecords}
                  setTreatmentRecords={setTreatmentRecords}
                  onOpenServiceForm={handleOpenServiceForm}
                  onDataChanged={onDataChanged}
                  services={services}
                />
              )}
              {activeTab === 'photos' && (
                <div className="p-6 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100 hover:scrollbar-thumb-teal-600">
                  {/* Upload Form */}
                  <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      {/* Header text moved to top bar */}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Patient Selection - Searchable */}
                      <div className="space-y-2 relative">
                        <label className="block text-sm font-semibold text-slate-700">
                          Select Patient <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search patients..."
                            value={patientSearchQuery}
                            onChange={(e) => {
                              setPatientSearchQuery(e.target.value);
                              setShowPatientDropdown(true);
                            }}
                            onFocus={() => setShowPatientDropdown(true)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium text-slate-700 hover:border-slate-300"
                          />
                          {selectedPatientForPhoto && !patientSearchQuery && (
                            <span className="absolute right-4 top-3.5 text-sm text-teal-600 font-medium">
                              ✓ Selected
                            </span>
                          )}
                          
                          {/* Dropdown */}
                          {showPatientDropdown && patientSearchQuery.trim() && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100">
                              {patients
                                .filter(p => p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()))
                                .map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedPatientForPhoto(String(p.id));
                                      setPatientSearchQuery(getDisplayName(p.name));
                                      setShowPatientDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-b-0 font-medium text-slate-700"
                                  >
                                    {getDisplayName(p.name)}
                                  </button>
                                ))}
                              {patients.filter(p => p.name.toLowerCase().includes(patientSearchQuery.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-slate-500 text-center">No patients found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photo Type */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          Photo Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={photoType}
                          onChange={(e) => setPhotoType(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium text-slate-700 bg-white hover:border-teal-400 cursor-pointer"
                        >
                          <option value="">Select photo type...</option>
                          <option value="before">Before Treatment</option>
                          <option value="after">After Treatment</option>
                          <option value="xray">X-Ray</option>
                        </select>
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Upload Photo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-teal-400 hover:from-teal-50 hover:to-teal-100 transition-all cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mb-3 group-hover:bg-teal-200 transition-colors">
                            <Camera className="w-7 h-7 text-teal-600" />
                          </div>
                          <p className="text-slate-900 font-semibold">Click to upload or drag and drop</p>
                          <p className="text-slate-500 text-sm mt-1">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                      {photoFile && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <Check className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-900">{photoFile.name}</span>
                        </div>
                      )}
                      {photoUrl && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-slate-600 mb-3">Preview</p>
                          <div className="relative w-40 h-40 rounded-xl border-2 border-slate-200 overflow-hidden bg-white shadow-md">
                            <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Notes <span className="text-slate-400">(Optional)</span>
                      </label>
                      <textarea
                        value={photoNotes}
                        onChange={(e) => setPhotoNotes(e.target.value)}
                        placeholder="Add clinical notes or observations about this photo..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium text-slate-700 placeholder-slate-400 hover:border-slate-300 resize-none"
                      />
                    </div>

                    {/* Upload Button */}
                    <button
                      onClick={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-300 text-white rounded-lg transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
                    >
                      <Upload className="w-5 h-5" />
                      {isUploadingPhoto ? 'Uploading...' : 'Save'}
                    </button>
                  </div>

                  {/* Recent Photos or All Patients Photos */}
                  {photos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex justify-between items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {viewAllPhotos ? 'All Patients Photos' : 'Recent Patient Photos'}
                        </h3>
                        <div className="flex items-center gap-3 flex-1 max-w-sm">
                          <input
                            type="text"
                            placeholder="Search photos by patient name..."
                            value={photoSearchQuery}
                            onChange={(e) => setPhotoSearchQuery(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
                          />
                          <button
                            onClick={() => setViewAllPhotos(!viewAllPhotos)}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            {viewAllPhotos ? 'View Recent' : 'View All Patients'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-slate-100 hover:scrollbar-thumb-teal-600">
                        {(viewAllPhotos 
                          ? photos.reverse().filter(photo => {
                              const patient = patients.find(p => String(p.id) === String(photo.patientId));
                              return patient?.name.toLowerCase().includes(photoSearchQuery.toLowerCase());
                            }).sort((a, b) => {
                              const patientA = patients.find(p => String(p.id) === String(a.patientId));
                              const patientB = patients.find(p => String(p.id) === String(b.patientId));
                              const lastNameA = patientA?.name?.split(' ').pop()?.toLowerCase() || '';
                              const lastNameB = patientB?.name?.split(' ').pop()?.toLowerCase() || '';
                              return lastNameA.localeCompare(lastNameB);
                            })
                          : photos.slice(-10).reverse().filter(photo => {
                              const patient = patients.find(p => String(p.id) === String(photo.patientId));
                              return patient?.name.toLowerCase().includes(photoSearchQuery.toLowerCase());
                            }).sort((a, b) => {
                              const patientA = patients.find(p => String(p.id) === String(a.patientId));
                              const patientB = patients.find(p => String(p.id) === String(b.patientId));
                              const lastNameA = patientA?.name?.split(' ').pop()?.toLowerCase() || '';
                              const lastNameB = patientB?.name?.split(' ').pop()?.toLowerCase() || '';
                              return lastNameA.localeCompare(lastNameB);
                            })
                        ).map(photo => {
                          const patient = patients.find(p => String(p.id) === String(photo.patientId));
                          return (
                            <div key={photo.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <p className="font-medium">{patient?.name || 'Unknown Patient'}</p>
                                <p className="text-sm text-gray-600 capitalize">{photo.type} - {formatToDD_MM_YYYY(photo.date)}</p>
                                {photo.notes && <p className="text-sm text-gray-700 mt-1">{photo.notes}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedPhotoForView(photo)}
                                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm"
                                  title="View photo"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setShowReplacePhotoModal(photo.id);
                                    setReplacePhotoUrl('');
                                    setReplacePhotoFile(null);
                                  }}
                                  className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors flex items-center gap-1 text-sm"
                                  title="Replace photo"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  Replace
                                </button>
                                <button
                                  onClick={() => setShowDeletePhotoConfirm(photo.id)}
                                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1 text-sm"
                                  title="Delete photo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'inventory' && (
                <InventoryManagement
                  inventory={inventory}
                  setInventory={setInventory}
                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === 'charting' && (
                <DentalChartWebsite patients={patients} />
              )}
              {activeTab === 'braces' && (
                <BracesCharting
                  patients={patients}
                />
              )}
              {activeTab === 'referrals' && (
                <ReferralGeneration
                  referrals={referrals}
                  setReferrals={setReferrals}
                  patients={patients}
                />
              )}
              {activeTab === 'services' && (
                <ServicesForms
                  patients={patients}
                  treatmentRecords={treatmentRecords}
                  setTreatmentRecords={setTreatmentRecords}
                  payments={payments}
                  prefilledAppointment={prefilledAppointmentData || undefined}
                  onServiceCreated={() => setPrefilledAppointmentData(null)}
                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === 'financial' && (
                <FinancialReport
                  currentUser={currentUser}
                  patients={patients}
                  treatmentRecords={treatmentRecords}
                  setTreatmentRecords={setTreatmentRecords}
                  payments={payments}
                  setPayments={setPayments}
                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === 'announcements' && (
                <AnnouncementsManagement
                  announcements={announcements}
                  setAnnouncements={setAnnouncements}
                  services={services}
                  setServices={setServices}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* View Photo Modal */}
      <AnimatePresence>
        {selectedPhotoForView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhotoForView(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-xl overflow-hidden flex flex-col shadow-2xl"
              style={{ width: '90vw', height: '90vh', maxWidth: '1200px', maxHeight: '800px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-700 via-cyan-600 to-cyan-500 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-xl">Treatment Photo</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm mt-2">
                      <div className="flex items-center gap-2 text-cyan-100">
                        <div className="w-5 h-5 rounded bg-white/25 flex items-center justify-center">
                          <FileText className="w-3 h-3" />
                        </div>
                        <span className="font-medium capitalize">{selectedPhotoForView.type} Photo</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                          <Calendar className="w-3 h-3" />
                        </div>
                        <span className="font-medium">{formatToDD_MM_YYYY(selectedPhotoForView.date)}</span>
                      </div>
                    </div>
                    {selectedPhotoForView.notes && (
                      <div className="mt-3 pt-3 border-t border-white/30">
                        <p className="text-cyan-100 text-sm leading-relaxed">
                          <span className="font-semibold">Notes:</span> {selectedPhotoForView.notes}
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                <button
                  onClick={() => setSelectedPhotoForView(null)}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white flex items-center justify-center transition-all hover:rotate-90 duration-300 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image Container */}
              <div className="flex-1 bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 p-4 flex items-center justify-center overflow-hidden" style={{ minHeight: '600px' }}>
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedPhotoForView.url}
                    alt={selectedPhotoForView.type}
                    className="rounded-xl shadow-2xl"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      maxHeight: '85vh',
                      objectFit: 'contain',
                      imageRendering: 'crisp-edges'
                    }}
                  />
                  {/* Image Badge */}
                  <div className="absolute top-3 left-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 backdrop-blur-md text-white text-xs font-bold rounded-full capitalize shadow-lg">
                    {selectedPhotoForView.type}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replace Photo Modal */}
      <AnimatePresence>
        {showReplacePhotoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReplacePhotoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Replace Photo</h3>
                    <p className="text-amber-100 text-xs">Upload a new version of this photo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReplacePhotoModal(null)}
                  className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* File Upload Area */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Select New Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-amber-400 hover:from-amber-50 hover:to-amber-100 transition-all cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReplacePhotoFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2 group-hover:bg-amber-200 transition-colors">
                        <Camera className="w-6 h-6 text-amber-600" />
                      </div>
                      <p className="text-slate-900 font-semibold text-sm">Click to upload or drag and drop</p>
                      <p className="text-slate-500 text-xs mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                  {replacePhotoFile && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-emerald-900 truncate">{replacePhotoFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {replacePhotoUrl && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Preview</label>
                    <div className="relative w-full h-52 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-100 shadow-md">
                      <img src={replacePhotoUrl} alt="New Preview" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setShowReplacePhotoModal(null)}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplacePhoto}
                  disabled={isReplacingPhoto || !replacePhotoUrl}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-400 disabled:to-slate-300 text-white rounded-lg transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isReplacingPhoto ? 'Replacing...' : 'Replace Photo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Photo Confirmation Modal */}
      <AnimatePresence>
        {showDeletePhotoConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeletePhotoConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Delete Photo</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this photo? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeletePhotoConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePhoto}
                  disabled={isDeletingPhoto}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingPhoto ? 'Deleting...' : 'Delete'}
                </button>
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
              <div className="bg-gradient-to-r from-[rgb(45,200,194)] to-[rgb(45,200,194)] p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Account Settings</h2>
                      <p className="text-sm text-white">Manage your profile</p>
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(45,200,194)] focus:border-transparent transition-all"
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
                    {!checkingUsername && usernameAvailable === true && newUsername !== currentUser.username && (
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
                  {usernameAvailable === true && newUsername !== currentUser.username && (
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
                    setNewFullName(currentUser.fullName);
                    setNewUsername(currentUser.username);
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
                      alert('Passwords do not match!');
                      return;
                    }
                    if (usernameAvailable === false) {
                      alert('Username is already taken. Please choose a different username.');
                      return;
                    }
                    if (newUsername.trim().length < 3) {
                      alert('Username must be at least 3 characters long.');
                      return;
                    }
                    handleSaveSettings();
                  }}
                  disabled={checkingUsername || (newUsername !== currentUser.username && usernameAvailable === false)}
                  className="flex-1 px-4 py-2.5 bg-[rgb(8,182,204)] hover:bg-[#0a97b0] text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 right-6 z-[100] max-w-md"
          >
            <div className={`rounded-xl shadow-2xl p-4 pr-12 flex items-center gap-3 backdrop-blur-sm ${
              toast.type === 'success' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                : 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                toast.type === 'success' ? 'bg-white/20' : 'bg-white/20'
              }`}>
                {toast.type === 'success' ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base">{toast.type === 'success' ? 'Success!' : 'Error'}</p>
                <p className="text-sm opacity-95">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="absolute top-3 right-3 hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}