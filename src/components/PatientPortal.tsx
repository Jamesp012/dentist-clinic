import { useState, useEffect, useRef } from 'react';
import { Patient, Appointment, TreatmentRecord, PhotoUpload, Announcement, Payment, Service } from '../App';
import { Calendar, FileText, User as UserIcon, Clock, X, Edit, Save, XCircle, Info, CheckCircle, AlertCircle, Camera, Sparkles, Heart, Smile, Shield, Megaphone, Plus, CreditCard, Settings, Check, Eye, EyeOff, Menu, LogOut, History, RotateCcw, Trash2, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { handlePhoneInput, formatPhoneNumber } from '../utils/phoneValidation';
import { convertToDBDate, convertToDisplayDate, formatDateInput, formatToDD_MM_YYYY, formatToWordedDate } from '../utils/dateHelpers';
import { appointmentAPI } from '../api';
import { Notifications } from './Notifications';
import { generateReferralPDF } from '../utils/referralPdfGenerator';
import { SearchableSelect } from './SearchableSelect';
import PatientReferralModal from './PatientReferralModal';

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

// Helper function to display user name (first and last only, no middle name)
const getDisplayName = (fullName: string | undefined): string => {
  if (!fullName) return '';
  // Split by whitespace and take first and last names
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) return '';
  if (nameParts.length === 1) return nameParts[0];
  // Return first and last name only
  return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
};

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

  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  const [showServiceChecklist, setShowServiceChecklist] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [selectedSchedulePeriod, setSelectedSchedulePeriod] = useState<'am' | 'pm' | null>(null);
  
  // Forms data state
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  // UI: active sub-tab for Forms (doctor vs xray)
  const [formsTab, setFormsTab] = useState<'doctor' | 'xray' | 'patient'>('doctor');
  
  // Referral file upload state
  const [referralFiles, setReferralFiles] = useState<any[]>(patient.referralFiles || []);
  const [showReferralUploadModal, setShowReferralUploadModal] = useState(false);
  const [isUploadingReferral, setIsUploadingReferral] = useState(false);
  const [referralUploadFiles, setReferralUploadFiles] = useState<File[]>([]);

  // Patient Add Referral modal
  const [showPatientReferralModal, setShowPatientReferralModal] = useState(false);

  // Patient Referral detail and image preview
  const [selectedPatientReferral, setSelectedPatientReferral] = useState<any | null>(null);
  const [showPatientReferralDetail, setShowPatientReferralDetail] = useState(false);
  const [patientPreviewImage, setPatientPreviewImage] = useState<string | null>(null);
  const [patientPreviewExpanded, setPatientPreviewExpanded] = useState(false);

  const viewPatientReferral = async (id: number | string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/referrals/${id}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.ok) {
        const data = await res.json();
        setSelectedPatientReferral(data);
        setShowPatientReferralDetail(true);
      } else {
        console.error('Failed to load referral', await res.text());
      }
    } catch (err) {
      console.error('Failed to load referral', err);
    }
  };

  async function handleFileClick(file: any) {
    if (!file) return;
    if (file.fileType === 'image') {
      setPatientPreviewImage(file.url);
      setPatientPreviewExpanded(false);
      return;
    }
    if (file.fileType === 'pdf') {
      // Trigger download for PDFs
      try {
        const resp = await fetch(file.url);
        const blob = await resp.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.fileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      } catch (err) {
        console.error('Failed to download file', err);
        window.open(file.url, '_blank');
        return;
      }
    }
    // Other files: open in new tab
    window.open(file.url, '_blank');
  }

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

  // Referral file upload handlers
  const handleReferralFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.includes('document') || file.type.includes('word') || file.type.includes('sheet');
        if (!isValidType) {
          toast.error(`File ${file.name} is not supported. Please upload image or PDF files only.`);
          return false;
        }
        return true;
      });
      setReferralUploadFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleReferralFileUpload = async () => {
    if (referralUploadFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setIsUploadingReferral(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      for (const file of referralUploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', String(patient.id));
        formData.append('fileType', file.type.startsWith('image/') ? 'image' : 'pdf');

        const response = await fetch(`${API_BASE}/referrals/upload`, {
          method: 'POST',
          headers,
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadedFile = await response.json();
        setReferralFiles(prev => [...prev, uploadedFile]);
      }

      toast.success('Referral file(s) uploaded successfully!');
      setReferralUploadFiles([]);
      setShowReferralUploadModal(false);
      
      // Update patient with referral files
      if (onUpdatePatient) {
        onUpdatePatient({
          ...patient,
          referralFiles
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload referral file');
    } finally {
      setIsUploadingReferral(false);
    }
  };

  const handleRemoveReferralFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/referrals/file/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setReferralFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete file');
    }
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

  const serviceOverrides = services || [];
  const displayServices = [
    ...defaultServices.map(defaultService => serviceOverrides.find(s => s.id === defaultService.id) || defaultService),
    ...serviceOverrides.filter(service => !defaultServices.some(defaultService => defaultService.id === service.id))
  ];

  const totalSpent = patientRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const totalPaid = patientRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  const currentBalance = patient.totalBalance !== undefined ? Number(patient.totalBalance) : (totalSpent - totalPaid);

  // Debug logging - warn when patientRecords contain unexpected values
  useEffect(() => {
    try {
      if (Array.isArray(patientRecords) && patientRecords.length > 0) {
        const badCosts = patientRecords.filter(r => r == null || r.cost === null || r.cost === undefined);
        if (badCosts.length > 0) {
          console.warn('PatientPortal: found treatment records with missing cost values', badCosts.map(r => ({ id: r?.id, patientId: r?.patientId, cost: r?.cost })));
        }
      }
    } catch (err) {
      console.error('PatientPortal debug check failed', err);
    }
  }, [patientRecords, patient.id]);

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

        // Prescriptions are no longer fetched in the Patient Portal (visible only to staff portals)
      } catch (error) {
        console.error('Failed to load patient forms:', error);
        setReferrals([]);
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
    if (!appointmentDate || appointmentTypes.length === 0) {
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

    // Create one appointment with selected service types (as array)
    const newAppointment: any = {
      patientId: patient.id,
      patientName: patient.name,
      date: normalizedDate,
      time: defaultTime,
      // API compatibility: send `type` as joined string and `types` as array
      type: appointmentTypes.join(', '),
      types: appointmentTypes,
      duration: 60,
      status: 'scheduled',
      notes: appointmentNotes,
      createdByRole: 'patient'
    };

    try {
      // Save appointment to API
      const created = await appointmentAPI.create(newAppointment);

      // Ensure the appointment date is normalized before adding to state
      const raw = (created as any) || newAppointment;
      if (raw.date) raw.date = getDateString(raw.date);

      // Normalize `type` into string[] for app state (prefer `types` when available)
      let normalizedType: string[] = [];
      if (Array.isArray(raw.types) && raw.types.length > 0) {
        normalizedType = raw.types.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof raw.type === 'string' && raw.type.trim()) {
        normalizedType = raw.type.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      const appointmentToAdd: Appointment = {
        id: raw.id ?? Date.now().toString(),
        patientId: raw.patientId,
        patientName: raw.patientName,
        date: raw.date,
        time: raw.time,
        type: normalizedType,
        duration: raw.duration ?? 60,
        status: raw.status ?? 'scheduled',
        notes: raw.notes ?? '',
        createdAt: raw.createdAt,
        createdByRole: raw.createdByRole ?? 'patient'
      };

      // Update local state with the created appointment
      setAppointments([...appointments, appointmentToAdd]);

      setAppointmentDate('');
      setAppointmentTypes([]);
      setAppointmentNotes('');
      setSelectedSchedulePeriod(null);
      toast.success('Successfully joined the queue! Please arrive at your selected time.');

      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error: any) {
      console.error('Failed to book appointment:', error);
      const msg = error?.message || 'Failed to join queue. Please try again.';
      toast.error(msg);
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
                <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{getDisplayName(patient.name)}</h1>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                  Patient
                  <Settings className="w-3 h-3" />
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto relative z-10 scrollbar-light space-y-2 ${
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
          className={`sticky top-0 z-40 border-b border-slate-100 px-8 py-6 ${sidebarOpen ? 'min-h-[104px]' : 'min-h-[100px]'} flex justify-between items-center shadow-sm`}
          style={{ backgroundColor: 'rgb(225, 252, 251)' }}
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
                <p className="text-slate-500 mt-1.5 text-sm font-medium">View your referrals and X-ray referrals</p>
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
        <div className="flex-1 scrollbar-visible">
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
                <div className="p-8 space-y-8 overflow-y-auto scrollbar-visible" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    {/* Edit Button - Top Right */}
                    <div className="flex justify-end">
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-semibold text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Profile
                        </button>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={handleSaveProfile}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-semibold text-sm"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors flex items-center gap-2 font-semibold text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Personal Details Section */}
                  <div className="space-y-4">
                    <div className="pb-3 border-b-2 border-slate-200">
                      <h4 className="text-lg font-bold text-slate-900">Personal Details</h4>
                    </div>
                    
                    {/* Grid Layout for Personal Information */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Full Name Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Full Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedPatient.name}
                            onChange={(e) => setEditedPatient({...editedPatient, name: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">{patient.name}</p>
                        )}
                      </div>

                      {/* Age Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Age</label>
                        <p className="text-lg font-semibold text-slate-900">{isEditing ? calculateAge(editedPatient.dateOfBirth) : calculateAge(patient.dateOfBirth)} years old</p>
                      </div>

                      {/* Sex Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sex</label>
                        {isEditing ? (
                          <select
                            value={editedPatient.sex}
                            onChange={(e) => setEditedPatient({ ...editedPatient, sex: e.target.value as 'Male' | 'Female' })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">{patient.sex}</p>
                        )}
                      </div>

                      {/* Date of Birth Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Date of Birth</label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="text"
                              value={convertToDisplayDate(editedPatient.dateOfBirth)}
                              onChange={(e) => setEditedPatient({ ...editedPatient, dateOfBirth: formatDateInput(e.target.value) })}
                              placeholder="DD/MM/YYYY"
                              className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
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
                          <p className="text-lg font-semibold text-slate-900">{(() => {
                            const dateStr = patient.dateOfBirth.includes('T') ? patient.dateOfBirth.split('T')[0] : patient.dateOfBirth;
                            const [year, month, day] = dateStr.split('-');
                            return `${month}/${day}/${year}`;
                          })()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div className="space-y-4">
                    <div className="pb-3 border-b-2 border-slate-200">
                      <h4 className="text-lg font-bold text-slate-900">Contact Information</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Phone Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Phone Number</label>
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
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">{patient.phone}</p>
                        )}
                      </div>

                      {/* Email Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editedPatient.email}
                            onChange={(e) => setEditedPatient({...editedPatient, email: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">{patient.email}</p>
                        )}
                      </div>

                      {/* Address Card - Full Width */}
                      <div className="col-span-2 group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Address</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedPatient.address}
                            onChange={(e) => setEditedPatient({...editedPatient, address: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-slate-900">{patient.address}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Medical Information Section */}
                  <div className="space-y-4">
                    <div className="pb-3 border-b-2 border-slate-200">
                      <h4 className="text-lg font-bold text-slate-900">Medical Information</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {/* Medical History Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Medical History</label>
                        {isEditing ? (
                          <textarea
                            value={editedPatient.medicalHistory}
                            onChange={(e) => setEditedPatient({...editedPatient, medicalHistory: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                            rows={3}
                          />
                        ) : (
                          <p className="text-base font-medium text-slate-700 leading-relaxed">{patient.medicalHistory || 'No medical history recorded'}</p>
                        )}
                      </div>

                      {/* Allergies Card */}
                      <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Allergies</label>
                        {isEditing ? (
                          <textarea
                            value={editedPatient.allergies}
                            onChange={(e) => setEditedPatient({...editedPatient, allergies: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                            rows={3}
                          />
                        ) : (
                          <p className={`text-base font-medium leading-relaxed ${patient.allergies && patient.allergies !== 'None' ? 'text-red-700' : 'text-slate-700'}`}>
                            {patient.allergies && patient.allergies !== 'None' ? patient.allergies : 'No allergies recorded'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="p-8 space-y-6 overflow-y-auto scrollbar-visible" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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

                    {/* Service Type (Multi-select, checklist hidden until clicked) */}
                    <div>
                      <label
                        className="text-sm text-gray-600 mb-1 block font-semibold cursor-pointer select-none"
                        onClick={() => setShowServiceChecklist(v => !v)}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowServiceChecklist(v => !v); }}
                        style={{ userSelect: 'none' }}
                      >
                        Service Type
                        <span className="ml-2 text-xs text-purple-600 underline">{showServiceChecklist ? 'Hide' : 'Show'} checklist</span>
                      </label>
                      {showServiceChecklist && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {[
                            'Dental consultation',
                            'Oral examination',
                            'Diagnosis',
                            'Treatment planning',
                            'Dental cleaning',
                            'Scaling',
                            'Polishing',
                            'Stain removal',
                            'Temporary filling',
                            'Permanent filling',
                            'Tooth repair',
                            'Dental bonding',
                            'Simple tooth extraction',
                            'Surgical extraction',
                            'Impacted tooth removal',
                            'Braces installation',
                            'Braces adjustment',
                            'Retainers',
                            'Orthodontic consultation',
                            'Complete dentures',
                            'Partial dentures'
                          ].map(service => (
                            <label key={service} className="flex items-center gap-2 bg-white border border-purple-200 rounded px-2 py-1 cursor-pointer hover:bg-purple-50 transition">
                              <input
                                type="checkbox"
                                value={service}
                                checked={appointmentTypes.includes(service)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setAppointmentTypes([...appointmentTypes, service]);
                                  } else {
                                    setAppointmentTypes(appointmentTypes.filter(s => s !== service));
                                  }
                                }}
                              />
                              <span className="text-sm">{service}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {showServiceChecklist && appointmentTypes.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">Please select at least one service.</p>
                      )}
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
                                    You are in a queue…
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
              <>
                <div 
                  className="p-8 bg-white/95 overflow-y-auto scrollbar-accent"
                  style={{
                    maxHeight: 'calc(100vh - 200px)',
                    scrollBehavior: 'smooth',
                  }}
                >
                {patientRecords.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {patientRecords.map((record, idx) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="group h-full"
                      >
                        <div className="relative h-full rounded-2xl bg-white border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                          {/* Gradient accent top border */}
                          <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400" />
                          
                          {/* Card Content */}
                          <div className="p-7 flex flex-col gap-5 flex-1">
                            {/* Header: Title, Date, and Status Badge */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-lg leading-snug mb-2">{record.treatment}</h3>
                                <p className="text-sm text-slate-500 font-medium">{formatToDD_MM_YYYY(record.date)}</p>
                              </div>
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 whitespace-nowrap ${
                                Number(record.remainingBalance || 0) <= 0 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                {Number(record.remainingBalance || 0) <= 0 ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Fully Paid
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Pending
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Details Section */}
                            <div className="space-y-3">
                              {/* Dentist / Specialist */}
                              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Dentist / Specialist</span>
                                <span className="text-sm font-semibold text-slate-900">Dr. {record.dentist}</span>
                              </div>
                              
                              {/* Tooth info if available */}
                              {record.tooth && (
                                <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tooth Number</span>
                                  <span className="text-sm font-semibold text-blue-900">#{record.tooth}</span>
                                </div>
                              )}
                              
                              {/* Cost */}
                              <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100">
                                <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Treatment Cost</span>
                                <span className="text-lg font-extrabold text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text">₱{Number(record.cost || 0).toFixed(2)}</span>
                              </div>

                              {/* Amount Paid */}
                              <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Amount Paid</span>
                                <span className="text-lg font-extrabold text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text">₱{Number(record.amountPaid || 0).toFixed(2)}</span>
                              </div>

                              {/* Remaining Balance */}
                              <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Remaining Balance</span>
                                <span className={`text-lg font-extrabold ${Number(record.remainingBalance || 0) <= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                  ₱{Number(record.remainingBalance || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Notes */}
                            {record.notes && (
                              <div className="mt-1 p-4 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Treatment Notes</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{record.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/0 via-blue-50/0 to-purple-50/0 group-hover:from-cyan-50/30 group-hover:via-blue-50/20 group-hover:to-purple-50/30 transition-all duration-300 pointer-events-none rounded-2xl" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-center min-h-[calc(100vh-300px)]"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-xl font-bold text-slate-900 mb-1">No Treatment Records</p>
                      <p className="text-slate-500">Your dental records will appear here as treatments are completed.</p>
                    </div>
                  </motion.div>
                )}
                </div>
              </>
            )}

            {/* Forms Tab */}
            {activeTab === 'forms' && (
              <div className="p-8 space-y-8 overflow-y-auto scrollbar-visible no-hover-translate" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <style>{`.no-hover-translate .group:hover{transform:none !important} .no-hover-translate button:hover{transform:none !important}`}</style>
                {isLoadingForms ? (
                  <div className="col-span-full flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center mb-4">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-slate-600 font-medium">Loading your forms...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Forms sub-tabs */}
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <button
                        role="tab"
                        aria-selected={formsTab === 'doctor'}
                        onClick={() => setFormsTab('doctor')}
                        className={`px-4 py-2 -mb-px rounded-t-lg font-semibold transition-colors ${formsTab === 'doctor' ? 'text-slate-900 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Doctor’s Referral
                        <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100">
                          {referrals.filter(r => r.specialty !== 'X-Ray Imaging' && r.referredTo !== 'X-Ray Facility').length}
                        </span>
                      </button>

                      <button
                        role="tab"
                        aria-selected={formsTab === 'xray'}
                        onClick={() => setFormsTab('xray')}
                        className={`px-4 py-2 -mb-px rounded-t-lg font-semibold transition-colors ${formsTab === 'xray' ? 'text-slate-900 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        X-ray Referral
                        <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100">
                          {referrals.filter(r => r.specialty === 'X-Ray Imaging' || r.referredTo === 'X-Ray Facility').length}
                        </span>
                      </button>

                      <button
                        role="tab"
                        aria-selected={formsTab === 'patient'}
                        onClick={() => setFormsTab('patient')}
                        className={`px-4 py-2 -mb-px rounded-t-lg font-semibold transition-colors ${formsTab === 'patient' ? 'text-slate-900 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Your Referrals
                        <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100">
                          {referrals.filter(r => r.createdByRole === 'patient' && String(r.patientId) === String(patient.id)).length}
                        </span>
                      </button>

                      {/* Add button shown to patient when viewing their referrals */}
                      <div className="ml-auto">
                        {formsTab === 'patient' && (
                          <button onClick={() => setShowPatientReferralModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Add</button>
                        )}
                      </div>
                    </div>

                    {/* Patient Add Referral Modal (global within Forms area) */}
                    {showPatientReferralModal && (
                      <PatientReferralModal
                        isOpen={showPatientReferralModal}
                        onClose={() => setShowPatientReferralModal(false)}
                        patientId={patient.id}
                        patientName={patient.name}
                        onSaved={async () => {
                          try {
                            setFormsTab('patient');
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${API_BASE}/referrals/patient/${patient.id}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                            if (res.ok) {
                              const data = await res.json();
                              setReferrals(data);
                            }
                          } catch (err) {
                            console.error('Failed to reload referrals after saving patient referral', err);
                          }
                        }}
                      />
                    )}

                    {/* Doctor Referrals - shown when Doctor tab active */}
                    {formsTab === 'doctor' && (
                      referrals.filter(r => r.specialty !== 'X-Ray Imaging' && r.referredTo !== 'X-Ray Facility').length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {referrals
                            .filter(r => r.specialty !== 'X-Ray Imaging' && r.referredTo !== 'X-Ray Facility')
                            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                            .map(referral => (
                              <div
                                key={referral.id}
                                className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 overflow-hidden"
                              >
                                <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                <div className="relative flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-emerald-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 text-base">Referred to: {referral.referredTo || referral.specialty}</h4>
                                        <p className="text-sm font-medium text-slate-500 mt-0.5">Dr. {referral.referringDentist}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mt-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 font-medium">Specialty:</span>
                                        <span className="text-sm font-semibold text-slate-900">{referral.specialty || 'General'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 font-medium">Date:</span>
                                        <span className="text-sm font-semibold text-slate-900">
                                          {new Date(referral.createdAt || referral.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                    </div>

                                    {referral.reason && (
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Reason</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">{referral.reason}</p>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => generateReferralPDF(referral, patient)}
                                    className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-sm"
                                  >
                                    <Download size={16} />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">No Doctor Referrals</h4>
                          <p className="text-slate-600">You have no doctor referral forms yet.</p>
                        </div>
                      )
                    )}

                    {/* X-Ray Referrals - shown when X-ray tab active */}
                    {formsTab === 'xray' && (
                      referrals.filter(r => r.specialty === 'X-Ray Imaging' || r.referredTo === 'X-Ray Facility').length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {referrals
                            .filter(r => r.specialty === 'X-Ray Imaging' || r.referredTo === 'X-Ray Facility')
                            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                            .map(referral => (
                              <div
                                key={referral.id}
                                className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 overflow-hidden"
                              >
                                <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                <div className="relative flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-emerald-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 text-base">X-Ray Referral</h4>
                                        <p className="text-sm font-medium text-slate-500 mt-0.5">Dr. {referral.referringDentist}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2 mt-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 font-medium">Facility:</span>
                                        <span className="text-sm font-semibold text-slate-900">{referral.referredTo}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 font-medium">Date:</span>
                                        <span className="text-sm font-semibold text-slate-900">
                                          {new Date(referral.createdAt || referral.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                    </div>

                                    {referral.reason && (
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Reason</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">{referral.reason}</p>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => generateReferralPDF(referral, patient)}
                                    className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-sm"
                                  >
                                    <Download size={16} />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">No X-ray Referrals</h4>
                          <p className="text-slate-600">You have no X-ray referral forms yet.</p>
                        </div>
                      )
                    )}

                    {/* Patient Referrals (Your Referrals) - shown when Patient tab active */}
                    {formsTab === 'patient' && (
                      (referrals.filter(r => r.createdByRole === 'patient' && String(r.patientId) === String(patient.id))).length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {referrals
                            .filter(r => r.createdByRole === 'patient' && String(r.patientId) === String(patient.id))
                            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                            .map(referral => (
                              <div key={referral.id} className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 overflow-hidden">
                                <div className="relative flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-emerald-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 text-base">{referral.referredTo || referral.specialty || 'Referral'}</h4>
                                        <p className="text-sm font-medium text-slate-500 mt-0.5">{referral.referringDentist}</p>
                                      </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Date</p>
                                      <p className="text-sm text-slate-700 leading-relaxed">{new Date(referral.createdAt || referral.date).toLocaleDateString()}</p>
                                    </div>

                                    {referral.reason && (
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Reason</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">{referral.reason}</p>
                                      </div>
                                    )}

                                    {referral.uploadedFiles && referral.uploadedFiles.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Attachments</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {referral.uploadedFiles.map(file => (
                                            <button key={file.id} onClick={() => handleFileClick(file)} className="px-3 py-1.5 bg-slate-100 rounded text-sm border">{file.fileName}</button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button onClick={() => viewPatientReferral(referral.id)} className="px-4 py-2 bg-slate-100 rounded">View</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="col-span-full text-center py-10">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">Your Referrals</h4>
                          <p className="text-slate-600 mb-4">You haven’t added any referrals yet. If a doctor gave you a referral slip, you can upload it here so we can share it with the receiving clinic.</p>
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setShowPatientReferralModal(true)} className="px-5 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:shadow">Add Referral</button>
                            <button onClick={() => setFormsTab('doctor')} className="px-4 py-2 bg-slate-100 rounded">Browse Doctor Referrals</button>
                          </div>
                        </div>
                      )
                    )}

                    {/* Prescriptions removed from Patient Portal - visible only to staff portals */}

                    {/* Referral Upload Section - Only for Referred Patients */}
                    {patient.patientType === 'referred' && (
                      <div>
                        <div className="mb-5 flex items-center gap-3">
                          <div className="h-8 w-1 bg-gradient-to-b from-violet-400 to-violet-600 rounded-full"></div>
                          <h3 className="text-xl font-bold text-slate-900">Upload Referral Document</h3>
                        </div>
                        
                        <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-violet-400 transition-colors overflow-hidden group">
                          {/* Subtle background accent */}
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 rounded-2xl mb-4">
                              <Upload className="w-8 h-8 text-violet-600" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Upload Your Referral Document</h4>
                            <p className="text-sm text-slate-600 font-medium">Share the referral from your referring doctor</p>
                          </div>

                          {referralFiles.length > 0 && (
                            <div className="mb-6 space-y-2">
                              <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Uploaded Files</p>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {referralFiles.map(file => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors group/file"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0">
                                        {file.fileType === 'image' ? (
                                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                                            <Camera className="w-4 h-4 text-blue-600" />
                                          </div>
                                        ) : (
                                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center border border-red-200">
                                            <FileText className="w-4 h-4 text-red-600" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{file.fileName}</p>
                                        <p className="text-xs text-slate-500">
                                          {new Date(file.uploadedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveReferralFile(file.id)}
                                      className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/file:opacity-100"
                                      title="Delete file"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 justify-center relative">
                            <button
                              onClick={() => setShowReferralUploadModal(!showReferralUploadModal)}
                              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                            >
                              <Plus className="w-5 h-5" />
                              {showReferralUploadModal ? 'Cancel' : 'Select Files'}
                            </button>
                          </div>

                          {showReferralUploadModal && (
                            <div className="mt-6 space-y-4 relative pt-6 border-t border-slate-200">
                              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all group/upload">
                                <input
                                  type="file"
                                  id="referral-file-input"
                                  multiple
                                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                  onChange={handleReferralFileSelect}
                                  className="hidden"
                                />
                                <label htmlFor="referral-file-input" className="cursor-pointer block">
                                  <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400 group-hover/upload:text-violet-500 transition-colors" />
                                  <p className="text-sm font-bold text-slate-900 group-hover/upload:text-violet-900 transition-colors">Click or drag files here</p>
                                  <p className="text-xs text-slate-600 mt-1">PNG, JPG, PDF, DOC, DOCX up to 10MB</p>
                                </label>
                              </div>

                              {referralUploadFiles.length > 0 && (
                                <>
                                  <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Files Ready to Upload</p>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {referralUploadFiles.map((file, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors group/item"
                                        >
                                          <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => setReferralUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover/item:opacity-100"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <button
                                    onClick={handleReferralFileUpload}
                                    disabled={isUploadingReferral}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {isUploadingReferral ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Uploading {referralUploadFiles.length} File{referralUploadFiles.length !== 1 ? 's' : ''}...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-5 h-5" />
                                        <span>Upload {referralUploadFiles.length} File{referralUploadFiles.length !== 1 ? 's' : ''}</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}




                  </div>
                )}
              </div>
            )}



            {/* Patient Referral Detail Modal */}
            {showPatientReferralDetail && selectedPatientReferral && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-xl font-bold">Referral</h3>
                    <button onClick={() => { setShowPatientReferralDetail(false); setSelectedPatientReferral(null); }} className="p-2"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold">Patient Name</p>
                        <p className="font-medium">{selectedPatientReferral.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Date</p>
                        <p className="font-medium">{selectedPatientReferral.date}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Referred By</p>
                      <p className="font-medium">{selectedPatientReferral.referringDentist}</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Reason</p>
                      <p className="font-medium">{selectedPatientReferral.reason || '—'}</p>
                    </div>

                    {selectedPatientReferral.uploadedFiles && selectedPatientReferral.uploadedFiles.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold">Files</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedPatientReferral.uploadedFiles.map((file: any) => (
                            <div key={file.id} className="p-2 border rounded flex items-center gap-2">
                              {file.fileType === 'image' ? (
                                <button onClick={() => { setPatientPreviewImage(file.url); setPatientPreviewExpanded(false); }} className="flex items-center gap-2">
                                  <img src={file.url} alt={file.fileName} className="w-10 h-10 object-cover rounded" />
                                  <span className="text-sm">{file.fileName}</span>
                                </button>
                              ) : (
                                <button onClick={() => { const a = document.createElement('a'); a.href = file.url; a.download = file.fileName; document.body.appendChild(a); a.click(); a.remove(); }} className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  <span className="text-sm">{file.fileName}</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* Patient preview image modal */}
            {patientPreviewImage && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="relative max-w-[90vw] max-h-[90vh]">
                  <button onClick={() => { setPatientPreviewImage(null); setPatientPreviewExpanded(false); }} className="absolute top-2 right-2 p-2 bg-white rounded-full"><X className="w-4 h-4" /></button>
                  <img src={patientPreviewImage} alt="preview" onClick={() => setPatientPreviewExpanded(prev => !prev)} className="object-contain" style={patientPreviewExpanded ? { width: '95vw', height: '95vh', cursor: 'zoom-out' } : { maxWidth: '80vw', maxHeight: '80vh', cursor: 'zoom-in' }} />
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div className="p-8 space-y-6 flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                    Treatment Photos & X-Rays
                  </h2>
                  <p className="text-sm text-gray-600">View your dental treatment photos and X-rays</p>
                </div>

                {/* Photos Grid Container */}
                {patientPhotos.length > 0 ? (
                  <div className="flex-1 scrollbar-accent rounded-2xl bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 border border-cyan-200/60 p-6 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-5">
                      {patientPhotos.map((photo, idx) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-cyan-200/80 shadow-md hover:shadow-xl transition-all bg-white hover:bg-gradient-to-br hover:from-white hover:to-cyan-50/20"
                          whileHover={{ scale: 1.05, y: -4 }}
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center aspect-square">
                            <img
                              src={photo.url}
                              alt={photo.type}
                              className="w-full h-full object-contain"
                              style={{ imageRendering: 'crisp-edges' }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-start p-3">
                            <div>
                              <p className="text-white font-semibold capitalize text-sm">{photo.type}</p>
                              <p className="text-cyan-100 text-xs">{formatToDD_MM_YYYY(photo.date)}</p>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs rounded-full capitalize font-bold shadow-lg">
                            {photo.type}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50/40 to-teal-50/40 border-2 border-dashed border-cyan-300/50">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-teal-600" />
                      </div>
                      <p className="text-lg font-semibold text-gray-700">No Photos Available</p>
                      <p className="text-sm mt-2 text-gray-600 max-w-sm">No photos have been uploaded yet. Photos will be available once uploaded by clinic staff.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Billing Balance Tab */}
            {activeTab === 'balance' && (
              <div className="p-8 space-y-6 overflow-y-auto scrollbar-visible bg-gradient-to-b from-slate-50 to-slate-100/50" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {/* Premium Header */}
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Billing & Payments</h2>
                  <p className="text-slate-600 font-medium">Manage your account balance and payment history</p>
                </div>

                {/* Balance Card - Premium Style */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white backdrop-blur-sm"
                >
                  {/* Gradient accent background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Balance</p>
                        <p className={`text-5xl font-bold tracking-tight mb-1 ${currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          ₱{currentBalance.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500">As of {formatToDD_MM_YYYY(new Date())}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          currentBalance > 0 
                            ? 'bg-gradient-to-br from-red-100 to-red-50 group-hover:from-red-200 group-hover:to-red-100' 
                            : 'bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-200 group-hover:to-emerald-100'
                        }`}>
                          <CreditCard className={`w-10 h-10 transition-transform duration-300 group-hover:scale-110 ${
                            currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {currentBalance > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl flex items-start gap-3 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-900 font-medium">
                          You have an outstanding balance. Please contact the clinic to arrange payment.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Payment Breakdown - Premium Cards */}
                <div className="grid grid-cols-2 gap-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="group relative rounded-2xl border border-white/40 p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 opacity-10 rounded-full -z-10 group-hover:opacity-20 transition-opacity duration-300"></div>
                    
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Total Billed</p>
                    <p className="text-3xl font-bold text-slate-900 mb-4">₱{totalSpent.toLocaleString()}</p>
                    <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="group relative rounded-2xl border border-white/40 p-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 opacity-10 rounded-full -z-10 group-hover:opacity-20 transition-opacity duration-300"></div>
                    
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Total Paid</p>
                    <p className="text-3xl font-bold text-emerald-600 mb-4">₱{totalPaid.toLocaleString()}</p>
                    <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                  </motion.div>
                </div>

                {/* Payment History - Modern List */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <History className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Recent Payments</h3>
                  </div>

                  <div className="space-y-3">
                    {payments
                      .filter(p => String(p.patientId) === String(patient.id))
                      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                      .slice(0, 10)
                      .map(payment => (
                        <motion.div 
                          key={payment.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="group relative rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">Payment Received</p>
                                <p className="text-sm text-slate-500 mt-1">{formatToDD_MM_YYYY(payment.paymentDate)}</p>
                                {payment.notes && <p className="text-xs text-slate-400 mt-1.5 truncate">{payment.notes}</p>}
                              </div>
                            </div>
                            <p className="text-xl font-bold text-emerald-600 flex-shrink-0 ml-4">₱{payment.amount}</p>
                          </div>
                        </motion.div>
                      ))}
                    {payments.filter(p => String(p.patientId) === String(patient.id)).length === 0 && (
                      <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-dashed border-slate-300">
                        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No payment records found</p>
                        <p className="text-sm text-slate-400 mt-1">Your successful payments will appear here</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Treatment Charges - Premium Table Style */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Treatment Charges</h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60 px-6 py-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Treatment</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Date</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Amount</p>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-100">
                      {patientRecords.slice().reverse().map((record, idx) => (
                        <motion.div 
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className="group relative px-6 py-5 grid grid-cols-3 gap-4 items-center hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-50/50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-purple-500"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{record.treatment}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 text-sm">{formatToDD_MM_YYYY(record.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors duration-200">₱{Number(record.cost || 0).toFixed(2)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Empty State */}
                    {patientRecords.length === 0 && (
                      <div className="text-center py-12 px-6">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No treatment charges found</p>
                        <p className="text-sm text-slate-400 mt-1">Your treatment history will appear here</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* Care Guide Tab */}
            {activeTab === 'care-guide' && (
              <div className="p-8 space-y-6 overflow-y-auto scrollbar-visible" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
              <div className="p-8 space-y-8 overflow-y-auto scrollbar-visible" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {/* Sub-Tab Navigation */}
                <div className="flex gap-4 border-b-2 border-gray-200/50">
                  <button
                    onClick={() => setAnnouncementSubTab('announcements')}
                    className={`px-6 py-3 font-semibold transition-all duration-300 border-b-2 -mb-0.5 ${
                      announcementSubTab === 'announcements'
                        ? 'text-teal-700 border-teal-600 bg-gradient-to-r from-teal-50 to-cyan-50/30 rounded-t-xl'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                    }`}
                  >
                    📢 Announcements
                  </button>
                  <button
                    onClick={() => setAnnouncementSubTab('services')}
                    className={`px-6 py-3 font-semibold transition-all duration-300 border-b-2 -mb-0.5 ${
                      announcementSubTab === 'services'
                        ? 'text-cyan-700 border-cyan-600 bg-gradient-to-r from-cyan-50/30 to-teal-50 rounded-t-xl'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                    }`}
                  >
                    🦷 Services Offered
                  </button>
                </div>

                {/* Announcements Sub-Section */}
                {announcementSubTab === 'announcements' && (
                  <div>
                    {announcements && announcements.length > 0 ? (
                      <div className="space-y-3">
                        {announcements.map(ann => (
                          <motion.div
                            key={ann.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-cyan-200/60 shadow-md hover:shadow-lg transition-all overflow-hidden group"
                          >
                            <div className={`h-1.5 bg-gradient-to-r ${
                              ann.type === 'important' ? 'from-red-500 to-orange-500' :
                              ann.type === 'promo' ? 'from-teal-500 to-cyan-500' :
                              ann.type === 'closure' ? 'from-orange-500 to-red-500' :
                              'from-blue-500 to-cyan-500'
                            }`} />
                            <div className="p-6">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{ann.title}</h3>
                                  <p className="text-sm text-gray-600">
                                    📅 {new Date(ann.date).toLocaleDateString()} • 👤 {ann.createdBy}
                                  </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize flex-shrink-0 ${
                                  ann.type === 'important' ? 'bg-red-100 text-red-700' :
                                  ann.type === 'promo' ? 'bg-teal-100 text-teal-700' :
                                  ann.type === 'closure' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {ann.type}
                                </span>
                              </div>
                              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{ann.message}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gradient-to-br from-cyan-50/40 to-teal-50/40 rounded-xl border-2 border-dashed border-cyan-300/50">
                        <div className="text-4xl mb-3">📢</div>
                        <p className="text-teal-900 font-bold mb-1">No Announcements Yet</p>
                        <p className="text-teal-700 text-sm">Check back soon for clinic updates and announcements</p>
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
                            className="bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 rounded-xl border-2 border-cyan-200/60 shadow-md hover:shadow-lg hover:border-teal-300/80 transition-all duration-300 p-6 group relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-teal-700 transition-colors">{service.serviceName}</h3>
                                  <div className="flex gap-2 mb-4">
                                    <span className="px-3 py-1 bg-gradient-to-r from-cyan-100 to-teal-100 text-teal-700 rounded-full text-sm font-semibold border border-teal-200">
                                      {service.category}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {service.description && service.description.length > 0 && (
                                <div className="mb-4 bg-gradient-to-br from-cyan-50/40 to-teal-50/40 rounded-lg p-4 border border-cyan-200/60">
                                  <p className="text-xs font-bold text-teal-700 mb-3 uppercase tracking-wide">Service Includes:</p>
                                  <ul className="space-y-2">
                                    {service.description.map((desc, idx) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                        <span className="text-teal-600 font-bold mt-1 flex-shrink-0">•</span>
                                        <span>{desc}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="border-t-2 border-cyan-200/50 pt-4">
                                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg p-4 border border-cyan-200/60">
                                  <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1">Pricing</p>
                                  <p className="text-lg font-bold text-gray-900">{service.price}</p>
                                  <p className="text-xs text-teal-700 mt-2 italic">Pricing varies depending on the complexity of your case</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-teal-600 bg-gradient-to-br from-cyan-50/40 to-teal-50/40 rounded-xl border-2 border-dashed border-cyan-300/50">
                        <p className="text-lg font-semibold mb-2">No services available</p>
                        <p className="text-teal-700">Check back soon for our professional dental services.</p>
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
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
              {/* Header Section */}
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
                        <span className="font-medium capitalize">{selectedPhoto.type} Photo</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                          <Calendar className="w-3 h-3" />
                        </div>
                        <span className="font-medium">{formatToDD_MM_YYYY(selectedPhoto.date)}</span>
                      </div>
                    </div>
                    {selectedPhoto.notes && (
                      <div className="mt-3 pt-3 border-t border-white/30">
                        <p className="text-cyan-100 text-sm leading-relaxed">
                          <span className="font-semibold">Notes:</span> {selectedPhoto.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white flex items-center justify-center transition-all hover:rotate-90 duration-300 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image Container */}
              <div className="flex-1 bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/20 p-4 flex items-center justify-center overflow-hidden" style={{ minHeight: '600px' }}>
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.type}
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
                    {selectedPhoto.type}
                  </div>
                </div>
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
      </>
    </div>
  );
}