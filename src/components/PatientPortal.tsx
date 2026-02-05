import { useState, useEffect, useRef } from 'react';
import { Patient, Appointment, TreatmentRecord, PhotoUpload, Announcement, Payment, Service } from '../App';
import { Calendar, FileText, User as UserIcon, Clock, X, Edit, Save, XCircle, Info, CheckCircle, AlertCircle, Camera, Sparkles, Heart, Smile, Shield, Megaphone, Plus, CreditCard, Settings, Check, Eye, EyeOff, Menu, LogOut, History, RotateCcw, Trash2, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { convertToDBDate, convertToDisplayDate, formatDateInput, formatToDD_MM_YYYY, formatToWordedDate } from '../utils/dateHelpers';
import { appointmentAPI } from '../api';
import { Notifications } from './Notifications';
import { PatientNotifications } from './PatientNotifications';
import { generatePrescriptionPDF } from '../utils/pdfGenerator';
import { generateReferralPDF } from '../utils/referralPdfGenerator';
import { SearchableSelect } from './SearchableSelect';

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

type PatientPortalProps = {
  patient: Patient;
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  treatmentRecords: TreatmentRecord[];
  onUpdatePatient?: (updatedPatient: Patient) => void;
  photos: PhotoUpload[];
  setPhotos: (photos: PhotoUpload[]) => void;
  announcements: Announcement[];
  payments: Payment[];
  onLogout?: () => void;
  onDataChanged?: () => Promise<void>;
  services?: Service[];
  userRole?: string;
};

const API_BASE = 'http://localhost:5000/api';

export function PatientPortal({ patient, appointments, setAppointments, treatmentRecords, onUpdatePatient, photos, setPhotos: _, announcements, payments, onLogout, onDataChanged, services = [], userRole }: PatientPortalProps) {
  const birthdatePickerRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'appointments' | 'records' | 'photos' | 'balance' | 'care-guide' | 'announcements' | 'forms'>('profile');
  const [announcementSubTab, setAnnouncementSubTab] = useState<'announcements' | 'services'>('announcements');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<Patient>(patient);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoUpload | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newFullName, setNewFullName] = useState(patient.name);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeletingPhotoId, setIsDeletingPhotoId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState<string | null>(null);
  const [isUploadingReplace, setIsUploadingReplace] = useState(false);

  // Helper function to convert 24-hour time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Appointment booking state
  const [appointmentDate, setAppointmentDate] = useState('');

  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [selectedSchedulePeriod, setSelectedSchedulePeriod] = useState<'am' | 'pm' | null>(null);
  
  // Forms data state
  const [referrals, setReferrals] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  const checkUsernameAvailability = async (username: string) => {
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
    if (newUsername.length > 0 && usernameAvailable === false) {
      toast.error('Username is not available');
      return;
    }

    // Check if username was changed and availability check is still in progress
    if (newUsername.length > 0 && checkingUsername) {
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
          userId: patient.id,
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

  // Helper function to get queue number and list
  const getQueueInfo = (appointment: Appointment) => {
    const appointmentHour = parseInt(appointment.time.split(':')[0]);
    const period = appointmentHour < 12 ? 'AM' : 'PM';
    
    // Get ALL appointments for the same date and period across ALL patients
    const sameQueueAppointments = appointments
      .filter(apt => {
        const aptHour = parseInt(apt.time.split(':')[0]);
        const aptPeriod = aptHour < 12 ? 'AM' : 'PM';
        const dateStr = getDateString(apt.date);
        const apptDateStr = getDateString(appointment.date);
        return dateStr === apptDateStr && aptPeriod === period && (apt.status === 'scheduled' || apt.status === 'completed');
      })
      .sort((a, b) => {
        const timeA = parseInt(a.time.split(':')[0]);
        const timeB = parseInt(b.time.split(':')[0]);
        return timeA - timeB;
      });
    
    const queueNumber = sameQueueAppointments.findIndex(apt => apt.id === appointment.id) + 1;
    return { queueNumber, period, queueList: sameQueueAppointments };
  };

  const patientAppointments = appointments.filter(apt => String(apt.patientId) === String(patient.id));
  // treatmentRecords are already filtered in App.tsx for this patient, so use directly
  const patientRecords = treatmentRecords;
  const patientPhotos = photos.filter(photo => String(photo.patientId) === String(patient.id));

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: UserIcon, color: 'from-teal-500 to-cyan-600' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'from-teal-500 to-teal-600' },
    { id: 'records', label: 'Records', icon: FileText, color: 'from-cyan-500 to-cyan-600' },
    { id: 'forms', label: 'Forms', icon: FileText, color: 'from-indigo-500 to-blue-600' },
    { id: 'photos', label: 'Photos', icon: Camera, color: 'from-teal-600 to-cyan-500' },
    { id: 'balance', label: 'Balance', icon: CreditCard, color: 'from-cyan-500 to-emerald-600' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, color: 'from-cyan-600 to-teal-500' },
    { id: 'care-guide', label: 'Care Guide', icon: Sparkles, color: 'from-teal-500 to-emerald-600' },
  ] as const;

  const upcomingAppointments = patientAppointments.filter(apt => {
    if (apt.status !== 'scheduled') return false;
    // Create date as local date (no 'Z') to avoid timezone conversion issues
    const dateStr = getDateString(apt.date);
    const [year, month, day] = dateStr.split('-').map(Number);
    const aptDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate >= today;
  });

  const pastAppointments = patientAppointments.filter(apt => {
    if (apt.status === 'completed') return true;
    // Create date as local date (no 'Z') to avoid timezone conversion issues
    const dateStr = getDateString(apt.date);
    const [year, month, day] = dateStr.split('-').map(Number);
    const aptDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate < today;
  });

  const calculateAge = (dob: string) => {
    // Parse date string as local date to avoid timezone issues
    const dateStr = dob.includes('T') ? dob.split('T')[0] : dob;
    const [year, month, day] = dateStr.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Default services
  const defaultServices = [
    { id: 'service_1', serviceName: 'ORAL EXAMINATION / CHECK-UP', category: 'Consultation', description: ['Dental consultation', 'Oral examination', 'Diagnosis', 'Treatment planning'], duration: '30 mins', price: 'Price may vary' },
    { id: 'service_2', serviceName: 'ORAL PROPHYLAXIS', category: 'Cleaning', description: ['Dental cleaning', 'Scaling', 'Polishing', 'Stain removal'], duration: '45 mins', price: 'Price may vary' },
    { id: 'service_3', serviceName: 'RESTORATION (PERMANENT / TEMPORARY)', category: 'Restorative', description: ['Temporary filling', 'Permanent filling', 'Tooth repair', 'Dental bonding'], duration: '60 mins', price: 'Price may vary' },
    { id: 'service_4', serviceName: 'TOOTH EXTRACTION', category: 'Extraction', description: ['Simple tooth extraction', 'Surgical extraction', 'Impacted tooth removal'], duration: '45-90 mins', price: 'Price may vary' },
    { id: 'service_5', serviceName: 'ORTHODONTIC TREATMENT', category: 'Orthodontics', description: ['Braces installation', 'Braces adjustment', 'Retainers', 'Orthodontic consultation'], duration: 'Varies', price: 'Price may vary' },
    { id: 'service_6', serviceName: 'PROSTHODONTICS', category: 'Prosthetics', description: ['Complete dentures', 'Partial dentures'], duration: 'Multiple sessions', price: 'Price may vary' }
  ] as Service[];

  const displayServices = services && services.length > 0 ? services : defaultServices;

  const totalSpent = patientRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const totalPaid = patientRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  const currentBalance = patient.totalBalance !== undefined ? Number(patient.totalBalance) : (totalSpent - totalPaid);

  // Debug logging - only when patientRecords changes
  useEffect(() => {
    // Removed: console.log statements to reduce noise
  }, []);

  const handleSaveProfile = () => {
    if (onUpdatePatient) {
      const updatedPatient = {
        ...editedPatient,
        dateOfBirth: convertToDBDate(editedPatient.dateOfBirth)
      };
      onUpdatePatient(updatedPatient);
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

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setIsDeletingPhotoId(photoId);
      const response = await fetch(`${API_BASE}/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Delete failed');

      setSelectedPhoto(null);
      setShowDeleteConfirm(null);
      toast.success('Photo deleted successfully');

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('Failed to delete photo');
    } finally {
      setIsDeletingPhotoId(null);
    }
  };

  const handleReplacePhoto = async (photoId: string, file: File) => {
    try {
      setIsUploadingReplace(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploadedData = await uploadResponse.json();
      const newUrl = uploadedData.url;

      // Update the photo with new URL
      const updateResponse = await fetch(`${API_BASE}/photos/${photoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: newUrl,
          updatedAt: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) throw new Error('Update failed');

      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto({ ...selectedPhoto, url: newUrl });
      }

      setShowReplaceModal(null);
      toast.success('Photo replaced successfully');

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to replace photo:', error);
      toast.error('Failed to replace photo');
    } finally {
      setIsUploadingReplace(false);
    }
  };


  const [closedSchedules, setClosedSchedules] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('closedSchedules') || '[]'));
    } catch {
      return new Set();
    }
  });

  const getScheduleKey = (date: string, period: 'am' | 'pm') => `${getDateString(date)}-${period}`;

  const refreshClosedSchedules = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem('closedSchedules') || '[]');
      setClosedSchedules(new Set(stored));
    } catch {
      setClosedSchedules(new Set());
    }
  };

  useEffect(() => {
    refreshClosedSchedules();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'closedSchedules') {
        refreshClosedSchedules();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load patient forms (referrals and prescriptions)
  useEffect(() => {
    const loadPatientForms = async () => {
      setIsLoadingForms(true);
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        // Fetch referrals for this patient
        const refResponse = await fetch(`${API_BASE}/referrals/patient/${patient.id}`, { headers });
        if (refResponse.ok) {
          const refData = await refResponse.json();
          setReferrals(Array.isArray(refData) ? refData : []);
        } else {
          const text = await refResponse.text();
          console.error('Failed to fetch referrals:', refResponse.status, text);
          setReferrals([]);
        }

        // Fetch prescriptions for this patient
        const presResponse = await fetch(`${API_BASE}/prescriptions/patient/${patient.id}`, { headers });
        if (presResponse.ok) {
          const presData = await presResponse.json();
          setPrescriptions(Array.isArray(presData) ? presData : []);
        } else {
          const text = await presResponse.text();
          console.error('Failed to fetch prescriptions:', presResponse.status, text);
          setPrescriptions([]);
        }
      } catch (error) {
        console.error('Failed to load patient forms:', error);
        setReferrals([]);
        setPrescriptions([]);
        toast.error('Unable to load forms. Please refresh or contact support.');
      } finally {
        setIsLoadingForms(false);
      }
    };

    if (patient.id) {
      loadPatientForms();
    }
  }, [patient.id]);

  const isScheduleClosed = (date: string, period: 'am' | 'pm') => {
    return closedSchedules.has(getScheduleKey(date, period));
  };

  const getBookingCountForPeriod = (date: string, period: 'am' | 'pm') => {
    return appointments.filter(apt => {
      const aptDate = getDateString(apt.date);
      if (aptDate !== date || apt.status === 'cancelled') return false;
      
      const [hours] = (apt.time || '09:00').split(':').map(Number);
      return period === 'am' ? hours < 12 : hours >= 12;
    }).length;
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentType) {
      toast.error('Please fill in all appointment details');
      return;
    }

    if (!selectedSchedulePeriod) {
      toast.error('Please select a queue period (AM or PM)');
      return;
    }

    // Check if schedule is closed
    if (isScheduleClosed(appointmentDate, selectedSchedulePeriod)) {
      toast.error(`The ${selectedSchedulePeriod.toUpperCase()} schedule is closed for this date`);
      return;
    }

    setIsBookingAppointment(true);
    
    // Normalize the appointment date to ensure consistent YYYY-MM-DD format
    const normalizedDate = getDateString(appointmentDate);
    
    // For queue system, use a default time based on the period (24-hour format)
    const defaultTime = selectedSchedulePeriod === 'am' ? '09:00' : '14:00';
    
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      patientId: patient.id,
      patientName: patient.name,
      date: normalizedDate,
      time: defaultTime,
      type: appointmentType,
      duration: 60,
      status: 'scheduled',
      notes: appointmentNotes,
      createdByRole: 'patient'
    };

    try {
      // Save appointment to API
      const createdAppointment = await appointmentAPI.create(newAppointment);
      
      // Ensure the appointment date is normalized before adding to state
      const appointmentToAdd = createdAppointment as Appointment || newAppointment;
      if (appointmentToAdd.date) {
        appointmentToAdd.date = getDateString(appointmentToAdd.date);
      }
      
      // Update local state with the created appointment
      setAppointments([...appointments, appointmentToAdd]);
      
      setAppointmentDate('');
      setAppointmentType('');
      setAppointmentNotes('');
      setSelectedSchedulePeriod(null);
      toast.success('Successfully joined the queue! Please arrive at your selected time.');
      
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to book appointment:', error);
      toast.error('Failed to join queue. Please try again.');
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
                <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{patient.name}</h1>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                  Patient
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
                </div>
                {sidebarOpen && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className={`text-sm font-medium transition-colors duration-300 ${activeTab === item.id ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
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
              onClick={handleLogout}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-white"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-3 hover:bg-teal-200 rounded-lg flex items-center justify-center transition-all group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-teal-600 group-hover:text-teal-700 transition-colors" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-6 ${sidebarOpen ? 'min-h-[104px]' : 'min-h-[100px]'} flex justify-between items-center shadow-sm`}
        >
          <div className="relative z-10 flex-1">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View and manage your personal information</p>
              </div>
            )}
            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View your appointment schedule</p>
              </div>
            )}
            {activeTab === 'records' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Records</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View your dental treatment records</p>
              </div>
            )}
            {activeTab === 'forms' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Forms</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View your referrals, X-ray referrals, and prescriptions</p>
              </div>
            )}
            {activeTab === 'photos' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Photos</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View your treatment photos</p>
              </div>
            )}
            {activeTab === 'balance' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Balance</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View your account balance and payments</p>
              </div>
            )}
            {activeTab === 'care-guide' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Care Guide</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">Dental care tips and guidance</p>
              </div>
            )}
            {activeTab === 'announcements' && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Announcements</h2>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">Latest clinic announcements and updates</p>
              </div>
            )}
          </div>
          <div className="relative z-10 ml-auto">
            <Notifications
              patients={[patient]}
              appointments={patientAppointments}
              referrals={[]}
              currentPatientId={String(patient.id)}
              onNavigate={(tab: string) => setActiveTab(tab as any)}
            />
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
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Personal Information
                    </h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-gradient-to-r from-[#07BEB8] to-[#3DCCC7] text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-medium"
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
                    <p className="font-medium">{isEditing ? calculateAge(editedPatient.dateOfBirth) : calculateAge(patient.dateOfBirth)} years old</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sex</p>
                    {isEditing ? (
                      <select
                        value={editedPatient.sex}
                        onChange={(e) => setEditedPatient({ ...editedPatient, sex: e.target.value as 'Male' | 'Female' })}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    ) : (
                      <p className="font-medium">{patient.sex}</p>
                    )}
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={convertToDisplayDate(editedPatient.dateOfBirth)}
                          onChange={(e) => setEditedPatient({ ...editedPatient, dateOfBirth: formatDateInput(e.target.value) })}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-3 pr-10 py-2 border border-purple-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            birthdatePickerRef.current?.focus();
                            if (birthdatePickerRef.current?.showPicker) {
                              birthdatePickerRef.current.showPicker();
                            } else {
                              birthdatePickerRef.current?.click();
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label="Open calendar"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <input
                          ref={birthdatePickerRef}
                          type="date"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 cursor-pointer"
                          onChange={(e) => setEditedPatient({ ...editedPatient, dateOfBirth: convertToDisplayDate(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <p className="font-medium">{(() => {
                        const dateStr = patient.dateOfBirth.includes('T') ? patient.dateOfBirth.split('T')[0] : patient.dateOfBirth;
                        const [year, month, day] = dateStr.split('-');
                        return `${month}/${day}/${year}`;
                      })()}</p>
                    )}
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
                  <div className="space-y-4">
                    {/* Date Selection */}
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block font-semibold">Appointment Date</label>
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => {
                          setAppointmentDate(e.target.value);
                          setSelectedSchedulePeriod(null);
                        }}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    {/* Schedule Period Selection (AM/PM Queue) */}
                    {appointmentDate && (
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block font-semibold">Select Queue</label>
                        <div className="grid grid-cols-2 gap-3">
                          {/* AM Schedule */}
                          <button
                            onClick={() => setSelectedSchedulePeriod('am')}
                            disabled={isScheduleClosed(appointmentDate, 'am')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedSchedulePeriod === 'am'
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-300 bg-gray-50 hover:border-emerald-400'
                            } ${isScheduleClosed(appointmentDate, 'am') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <p className="font-semibold text-gray-900">Morning</p>
                            <p className="text-xs text-gray-600 mb-2">8:00 AM - 12:00 PM</p>
                            <p className="text-lg font-bold text-emerald-600">{getBookingCountForPeriod(appointmentDate, 'am')}</p>
                            <p className="text-xs text-gray-600">in queue</p>
                            {isScheduleClosed(appointmentDate, 'am') && (
                              <p className="text-xs text-red-600 font-semibold mt-2">⛔ Closed</p>
                            )}
                          </button>

                          {/* PM Schedule */}
                          <button
                            onClick={() => setSelectedSchedulePeriod('pm')}
                            disabled={isScheduleClosed(appointmentDate, 'pm')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedSchedulePeriod === 'pm'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-300 bg-gray-50 hover:border-orange-400'
                            } ${isScheduleClosed(appointmentDate, 'pm') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <p className="font-semibold text-gray-900">Afternoon</p>
                            <p className="text-xs text-gray-600 mb-2">12:30 PM - 8:00 PM</p>
                            <p className="text-lg font-bold text-orange-600">{getBookingCountForPeriod(appointmentDate, 'pm')}</p>
                            <p className="text-xs text-gray-600">in queue</p>
                            {isScheduleClosed(appointmentDate, 'pm') && (
                              <p className="text-xs text-red-600 font-semibold mt-2">⛔ Closed</p>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Service Type */}
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block font-semibold">Service Type</label>
                      <SearchableSelect
                        options={displayServices && displayServices.length > 0
                          ? displayServices.flatMap(s => s.description || [])
                          : ['Dental consultation', 'Oral examination', 'Dental cleaning', 'Tooth extraction', 'Braces installation', 'Consultation']
                        }
                        value={appointmentType}
                        onChange={(value) => setAppointmentType(value)}
                        placeholder="Select service..."
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block font-semibold">Notes (Optional)</label>
                      <textarea
                        value={appointmentNotes}
                        onChange={(e) => setAppointmentNotes(e.target.value)}
                        placeholder="Any special requests..."
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleBookAppointment}
                    disabled={isBookingAppointment || !selectedSchedulePeriod}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium mt-4"
                  >
                    <Calendar className="w-5 h-5" />
                    {isBookingAppointment ? 'Booking...' : 'Join Queue'}
                  </button>
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    <Info className="w-4 h-4 inline-block mr-1" />
                    Join the queue for your preferred time period. The clinic will serve you on a first-come, first-served basis.
                  </p>
                </div>

                {upcomingAppointments.length > 0 && (
                  <div>
                    <h2 className="text-xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Upcoming Appointments
                    </h2>
                    <div className="space-y-3">
                      {upcomingAppointments.map(apt => {
                        const { queueNumber, period, queueList } = getQueueInfo(apt);
                        const isCompleted = apt.status === 'completed';
                        return (
                          <motion.div 
                            key={apt.id} 
                            className={`p-4 border-2 border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 transition-opacity ${isCompleted ? 'opacity-30' : ''}`}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: isCompleted ? 0.3 : 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-lg mb-1 font-semibold">{apt.type}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatToWordedDate(getDateString(apt.date))}</span>
                                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                                    Queue #{queueNumber} ({period})
                                  </span>
                                </div>
                              </div>
                              <motion.span 
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  isCompleted 
                                    ? 'bg-gray-200 text-gray-600' 
                                    : 'bg-green-100 text-green-700'
                                }`}
                                animate={{ scale: isCompleted ? 0.95 : 1 }}
                              >
                                {apt.status}
                              </motion.span>
                            </div>

                            {/* Queue List */}
                            {queueList.length > 0 && (
                              <div className="mt-3 p-3 bg-white bg-opacity-50 rounded border border-blue-100">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Queue Order ({period}):</p>
                                <div className="flex flex-wrap gap-2">
                                  {queueList.map((queueApt, idx) => (
                                    <div
                                      key={queueApt.id}
                                      className={`group relative px-3 py-1 rounded text-sm font-semibold transition-all ${
                                        queueApt.id === apt.id
                                          ? 'bg-blue-500 text-white'
                                          : queueApt.status === 'completed'
                                          ? 'bg-gray-200 text-gray-500 line-through opacity-40'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {queueApt.id === apt.id ? (
                                        <span>{idx + 1} - {patient.name}</span>
                                      ) : (
                                        <span>#{idx + 1}</span>
                                      )}
                                      {queueApt.status === 'completed' && (
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                          Done
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {apt.notes && (
                              <p className="text-sm text-gray-600 mt-2">Notes: {apt.notes}</p>
                            )}
                          </motion.div>
                        );
                      })}
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
                                <span>{formatToWordedDate(getDateString(apt.date))}</span>
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{formatTime(apt.time)}</span>
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
                              {formatToDD_MM_YYYY(record.date)}
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

            {/* Forms Tab */}
            {activeTab === 'forms' && (
              <div className="p-8 space-y-6">
                <h2 className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  Your Forms
                </h2>

                {isLoadingForms ? (
                  <div className="text-center py-12">
                    <div className="inline-block">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 mt-4">Loading your forms...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Doctor Referrals Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                          Doctor Referrals
                        </span>
                      </h3>
                      {referrals.filter(r => r.specialty !== 'X-Ray Imaging' && r.referredTo !== 'X-Ray Facility').length > 0 ? (
                        <div className="space-y-3">
                          {referrals
                            .filter(r => r.specialty !== 'X-Ray Imaging' && r.referredTo !== 'X-Ray Facility')
                            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                            .map(referral => (
                              <div key={referral.id} className="p-4 border border-yellow-200 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800">Referred to: {referral.referredTo || referral.specialty}</p>
                                    <p className="text-sm text-gray-600 mt-1">Specialty: {referral.specialty || 'General'}</p>
                                    <p className="text-sm text-gray-600">Referred by: Dr. {referral.referringDentist}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Created: {new Date(referral.createdAt || referral.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => generateReferralPDF(referral, patient)}
                                      className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors flex items-center gap-1"
                                    >
                                      <Download size={14} />
                                      PDF
                                    </button>
                                  </div>
                                </div>
                                {referral.reason && (
                                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-yellow-200">
                                    Reason: {referral.reason}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm py-4">No doctor referrals available</p>
                      )}
                    </div>

                    {/* X-Ray Referrals Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">
                          X-Ray Referrals
                        </span>
                      </h3>
                      {referrals.filter(r => r.specialty === 'X-Ray Imaging' || r.referredTo === 'X-Ray Facility').length > 0 ? (
                        <div className="space-y-3">
                          {referrals
                            .filter(r => r.specialty === 'X-Ray Imaging' || r.referredTo === 'X-Ray Facility')
                            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                            .map(referral => (
                              <div key={referral.id} className="p-4 border border-cyan-200 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800">X-Ray Referral</p>
                                    <p className="text-sm text-gray-600 mt-1">Facility: {referral.referredTo}</p>
                                    <p className="text-sm text-gray-600">Referred by: Dr. {referral.referringDentist}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Created: {new Date(referral.createdAt || referral.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => generateReferralPDF(referral, patient)}
                                      className="px-3 py-1.5 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 transition-colors flex items-center gap-1"
                                    >
                                      <Download size={14} />
                                      PDF
                                    </button>
                                  </div>
                                </div>
                                {referral.reason && (
                                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-cyan-200">
                                    Reason: {referral.reason}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm py-4">No X-ray referrals available</p>
                      )}
                    </div>

                    {/* Prescriptions Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Prescriptions
                        </span>
                      </h3>
                      {prescriptions.length > 0 ? (
                        <div className="space-y-3">
                          {prescriptions
                            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                            .map(prescription => (
                              <div key={prescription.id} className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800">Prescription from Dr. {prescription.dentist}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {prescription.medications?.length || 0} medication(s) prescribed
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Created: {new Date(prescription.createdAt || prescription.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => {
                                        // View prescription details
                                        const medList = prescription.medications?.map((m: any) => 
                                          `${m.name} - ${m.dosage} ${m.frequency} for ${m.duration}`
                                        ).join('\n') || '';
                                        const details = `Medications:\n${medList}\n\nNotes: ${prescription.notes || 'None'}`;
                                        toast.success(details);
                                      }}
                                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                                    >
                                      <Eye size={14} />
                                      View
                                    </button>
                                    <button
                                      onClick={() => generatePrescriptionPDF(patient, prescription)}
                                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                                    >
                                      <Download size={14} />
                                      PDF
                                    </button>
                                  </div>
                                </div>
                                {prescription.medications && prescription.medications.length > 0 && (
                                  <div className="mt-3 pt-2 border-t border-green-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Medications:</p>
                                    <div className="space-y-1">
                                      {prescription.medications.slice(0, 2).map((med: any, idx: number) => (
                                        <p key={idx} className="text-xs text-gray-600">
                                          • {med.name} - {med.dosage} {med.frequency}
                                        </p>
                                      ))}
                                      {prescription.medications.length > 2 && (
                                        <p className="text-xs text-gray-500">+ {prescription.medications.length - 2} more</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm py-4">No prescriptions available</p>
                      )}
                    </div>

                    {/* Empty State */}
                    {referrals.length === 0 && prescriptions.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No forms available yet</p>
                      </div>
                    )}
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
                        className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-purple-200"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <div className="bg-gray-100 flex items-center justify-center aspect-square">
                          <img
                            src={photo.url}
                            alt={photo.type}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                          <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                            <p className="font-semibold capitalize">{photo.type}</p>
                            <p className="text-sm">{formatToDD_MM_YYYY(photo.date)}</p>
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
                  <p className="text-sm text-gray-600">As of {formatToDD_MM_YYYY(new Date())}</p>
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
                              <p className="text-xs text-gray-500">{formatToDD_MM_YYYY(payment.paymentDate)}</p>
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
                          <p className="text-sm text-gray-600">{formatToDD_MM_YYYY(record.date)}</p>
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
              <div className="p-8 space-y-8">
                {/* Sub-Tab Navigation */}
                <div className="flex gap-4 border-b border-gray-200">
                  <button
                    onClick={() => setAnnouncementSubTab('announcements')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                      announcementSubTab === 'announcements'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📢 Announcements
                  </button>
                  <button
                    onClick={() => setAnnouncementSubTab('services')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                      announcementSubTab === 'services'
                        ? 'text-pink-600 border-b-2 border-pink-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🦷 Services Offered
                  </button>
                </div>

                {/* Announcements Sub-Section */}
                {announcementSubTab === 'announcements' && (
                  <div>
                    {announcements && announcements.length > 0 ? (
                      <div className="space-y-4">
                        {announcements.map(ann => (
                          <motion.div
                            key={ann.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow bg-white"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{ann.title}</h3>
                                <p className="text-sm text-gray-600">
                                  {formatToDD_MM_YYYY(ann.date)} • {ann.createdBy}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold capitalize">
                                {ann.type}
                              </span>
                            </div>
                            <p className="text-gray-700">{ann.message}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <p className="text-gray-500">No announcements at this time</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Services Sub-Section */}
                {announcementSubTab === 'services' && (
                  <div>
                    <div className="mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Services</h2>
                        <p className="text-gray-600 font-medium">Comprehensive dental care solutions tailored to your needs</p>
                      </div>
                    </div>

                    {displayServices && displayServices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {displayServices.map((service) => (
                          <div
                            key={service.id}
                            className="bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow p-6"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{service.serviceName}</h3>
                                <div className="flex gap-2 mb-4">
                                  <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                                    {service.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {service.description && service.description.length > 0 && (
                              <div className="mb-4 bg-gray-50 rounded-lg p-4">
                                <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Service Includes:</p>
                                <ul className="space-y-2">
                                  {service.description.map((desc, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                      <span className="text-pink-600 font-bold mt-1">•</span>
                                      <span>{desc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="border-t-2 border-gray-200 pt-4">
                              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Pricing</p>
                                <p className="text-lg font-bold text-gray-900">{service.price}</p>
                                <p className="text-xs text-gray-600 mt-2 italic">Pricing varies depending on the complexity of your case</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <p className="text-lg font-semibold mb-2">No services available</p>
                        <p>Check back soon for our professional dental services.</p>
                      </div>
                    )}
                  </div>
                )}
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
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative bg-white rounded-xl overflow-hidden flex flex-col"
              style={{ width: '90vw', height: '90vh', maxWidth: '1200px', maxHeight: '800px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Action Buttons for Doctor/Assistant */}
              {userRole && (userRole === 'doctor' || userRole === 'assistant') && (
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <button
                    onClick={() => setShowReplaceModal(String(selectedPhoto?.id))}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                    title="Replace photo"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Replace
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(String(selectedPhoto?.id))}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    title="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}

              <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-hidden">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.type}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
              <div className="p-6 bg-white border-t border-gray-200">
                <p className="font-semibold text-lg capitalize mb-2">{selectedPhoto.type} Photo</p>
                <p className="text-sm text-gray-600 mb-2">Date: {formatToDD_MM_YYYY(selectedPhoto.date)}</p>
                {selectedPhoto.notes && (
                  <p className="text-sm text-gray-700">{selectedPhoto.notes}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Photo Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
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
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePhoto(showDeleteConfirm)}
                  disabled={isDeletingPhotoId === showDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingPhotoId === showDeleteConfirm ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replace Photo Modal */}
      <AnimatePresence>
        {showReplaceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReplaceModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4">Replace Photo</h3>
              <p className="text-slate-600 mb-6">Select a new image to replace the current photo.</p>

              <label className="relative block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && showReplaceModal) {
                      handleReplacePhoto(showReplaceModal, file);
                    }
                  }}
                  disabled={isUploadingReplace}
                  className="hidden"
                />
                <div className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  {isUploadingReplace ? 'Uploading...' : 'Choose File'}
                </div>
              </label>

              <button
                onClick={() => setShowReplaceModal(null)}
                className="w-full mt-3 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
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
                      className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-[rgb(45,200,194)] focus:border-transparent transition-all ${
                        usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your username"
                    />
                    {checkingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-[rgb(45,200,194)] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {!checkingUsername && usernameAvailable === true && newUsername.length > 0 && (
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
                  {usernameAvailable === true && newUsername.length > 0 && (
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
                    setNewUsername('');
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
                  disabled={checkingUsername || (newUsername.length > 0 && usernameAvailable === false)}
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

      {/* Patient Notifications Component */}
      <PatientNotifications patient={patient} appointments={appointments} />
      </>
    </div>
  );
}