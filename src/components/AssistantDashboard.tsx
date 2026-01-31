import { useState } from "react";
import {
  Menu,
  Users,
  Calendar,
  Package,
  FileText,
  LayoutDashboard,
  Stethoscope,
  LogOut,
  Sparkles,
  Megaphone,
  Settings,
  X,
  Check,
  Eye,
  EyeOff,
  Camera,
  Upload,
} from "lucide-react";
import { PesoSign } from './icons/PesoSign';
import { Dashboard } from "./Dashboard";
import { PatientManagement } from "./PatientManagement";
import { AppointmentScheduler } from "./AppointmentScheduler";
import { InventoryManagement } from "./InventoryManagement";
import { BracesCharting } from "./BracesCharting";
import { ReferralGeneration } from "./ReferralGeneration";
import { ServicesForms } from "./ServicesForms";
import { FinancialReport } from "./FinancialReport";
import { AnnouncementsManagement } from "./AnnouncementsManagement";
import { Notifications } from "./Notifications";
import { motion, AnimatePresence } from "motion/react";
import type { User } from "./AuthPage";
import type {
  Patient,
  Appointment,
  InventoryItem,
  TreatmentRecord,
  Referral,
  PhotoUpload,
  Announcement,
  Payment,
  Service,
} from "../App";

type AssistantDashboardProps = {
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

const API_BASE = 'http://localhost:5000/api';

export function AssistantDashboard({
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
  onDataChanged,
}: AssistantDashboardProps) {
  const [activeTab, setActiveTab] =
    useState<string>("dashboard");
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
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<{ patientId: string; patientName: string; appointmentType: string } | null>(null);

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

  const handleOpenServiceForm = (appointmentData: { patientId: string; patientName: string; appointmentType: string }) => {
    setPrefilledAppointmentData(appointmentData);
    setActiveTab('services');
  };

  // Photo upload state
  const [selectedPatientForPhoto, setSelectedPatientForPhoto] = useState<string>('');
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'xray'>('before');
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
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
    if (!selectedPatientForPhoto || !photoUrl) {
      alert('Please select a patient and provide a photo');
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
        throw new Error('Failed to upload photo');
      }

      const newPhoto = await response.json();
      setPhotos([...photos, newPhoto]);
      alert('Photo uploaded successfully!');
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
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "from-teal-500 to-cyan-600",
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
      color: "from-teal-500 to-teal-600",
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: Calendar,
      color: "from-cyan-500 to-cyan-600",
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      color: "from-teal-600 to-cyan-500",
    },
    {
      id: "braces",
      label: "Braces Charting",
      icon: Sparkles,
      color: "from-cyan-500 to-teal-500",
    },
    {
      id: "photos",
      label: "Patient Photos",
      icon: Camera,
      color: "from-teal-500 to-emerald-600",
    },
    {
      id: "referrals",
      label: "Referrals",
      icon: FileText,
      color: "from-cyan-500 to-emerald-600",
    },
    {
      id: "services",
      label: "Services Forms",
      icon: Stethoscope,
      color: "from-teal-600 to-cyan-600",
    },
    {
      id: "financial",
      label: "Financial Report",
      icon: PesoSign,
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: Megaphone,
      color: "from-cyan-600 to-teal-500",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Modern Glass Design */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${sidebarOpen ? "w-72" : "w-20"} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl relative overflow-hidden`}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>

        <div className="p-6 flex items-center justify-between border-b border-emerald-700/50 relative z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 hover:bg-emerald-700/50 rounded-xl transition-all duration-200 backdrop-blur-sm"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🦷</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden text-ellipsis">
                  Assistant Portal
                </h1>
                <p className="text-xs text-emerald-300 flex items-center gap-1">
                  Staff Access
                  <Settings className="w-3 h-3" />
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 p-3 overflow-y-auto relative z-10">
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
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl mb-2 transition-all duration-200 group relative overflow-hidden ${
                  activeTab === item.id
                    ? "bg-gradient-to-r " +
                      item.color +
                      " shadow-lg shadow-teal-500/20"
                    : "hover:bg-emerald-700/30 hover:translate-x-1"
                }`}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabAssistant"
                    className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.6,
                    }}
                  />
                )}
                <div
                  className={`p-2 rounded-lg ${activeTab === item.id ? "bg-white/20" : "bg-emerald-700/30 group-hover:bg-emerald-600/40"} transition-all relative`}
                >
                  <Icon className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
                      {unreadMessages}
                    </span>
                  )}
                </div>
                {sidebarOpen && (
                  <div className="flex items-center justify-between flex-1">
                    <span
                      className={`text-sm font-medium ${activeTab === item.id ? "text-white" : "text-slate-300"}`}
                    >
                      {item.label}
                    </span>
                    {unreadMessages > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold animate-pulse">
                        {unreadMessages}
                      </span>
                    )}
                  </div>
                )}
                {activeTab === item.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-emerald-700/50 relative z-10">
          {sidebarOpen ? (
            <div className="bg-emerald-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate whitespace-nowrap overflow-hidden text-ellipsis">
                      {currentUser.fullName}
                    </p>
                    <p className="text-xs text-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      Assistant
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="w-full p-3 hover:bg-emerald-700/50 rounded-xl flex items-center justify-center transition-all group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Header with Notifications - Modern Design */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-5 flex justify-between items-start shadow-sm relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
          <div className="relative z-10 flex-1">
            {activeTab === 'patients' && (
              <div>
                <h2 className="text-3xl font-bold text-blue-900">Patient Management</h2>
                <p className="text-gray-600 mt-1">Manage patient records and medical information</p>
              </div>
            )}
            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-3xl font-bold text-purple-900">Appointments</h2>
                <p className="text-gray-600 mt-1">Schedule and manage patient appointments</p>
              </div>
            )}
            {activeTab === 'employees' && (
              <div>
                <h2 className="text-3xl font-bold text-purple-900">Employee Management</h2>
                <p className="text-gray-600 mt-1">Manage clinic staff and their access credentials</p>
              </div>
            )}
            {activeTab === 'dental-charting' && (
              <div>
                <h2 className="text-3xl font-bold text-pink-900">Dental Charting</h2>
                <p className="text-gray-600 mt-1">Track dental conditions and treatments</p>
              </div>
            )}
            {activeTab === 'financial-report' && (
              <div>
                <h2 className="text-3xl font-bold text-green-900">Financial Report</h2>
                <p className="text-gray-600 mt-1">View financial data and reports</p>
              </div>
            )}
            {activeTab === 'braces-charting' && (
              <div>
                <h2 className="text-3xl font-bold text-cyan-900">Braces Charting</h2>
                <p className="text-gray-600 mt-1">Track and manage patient braces records</p>
              </div>
            )}
            {activeTab === 'inventory' && (
              <div>
                <h2 className="text-3xl font-bold text-orange-900">Inventory Management</h2>
                <p className="text-gray-600 mt-1">Manage clinic supplies and equipment</p>
              </div>
            )}
            {activeTab === 'braces' && (
              <div>
                <h2 className="text-3xl font-bold text-cyan-900">Braces Charting</h2>
                <p className="text-gray-600 mt-1">Track and manage patient braces records</p>
              </div>
            )}
            {activeTab === 'photos' && (
              <div>
                <h2 className="text-3xl font-bold text-indigo-900">Photo Upload</h2>
                <p className="text-gray-600 mt-1">Manage patient treatment photos</p>
              </div>
            )}
            {activeTab === 'referrals' && (
              <div>
                <h2 className="text-3xl font-bold text-orange-900">Referrals</h2>
                <p className="text-gray-600 mt-1">Generate and manage patient referrals</p>
              </div>
            )}
            {activeTab === 'services' && (
              <div>
                <h2 className="text-3xl font-bold text-teal-900">Services Forms</h2>
                <p className="text-gray-600 mt-1">Manage clinic services and treatments</p>
              </div>
            )}
            {activeTab === 'financial' && (
              <div>
                <h2 className="text-3xl font-bold text-green-900">Financial Report</h2>
                <p className="text-gray-600 mt-1">View financial data and reports</p>
              </div>
            )}
            {(activeTab === 'dashboard' || !activeTab) && (
              <div>
                <h2 className="text-3xl font-bold text-cyan-900">Dashboard</h2>
                <p className="text-gray-600 mt-1">Overview of clinic operations</p>
              </div>
            )}
          </div>
          <div className="relative z-10 ml-auto">
            <Notifications
              patients={patients}
              appointments={appointments}
              referrals={referrals}
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
              {activeTab === "dashboard" && (
                <Dashboard
                  patients={patients}
                  appointments={appointments}
                  inventory={inventory}
                  treatmentRecords={treatmentRecords}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === "patients" && (
                <PatientManagement
                  patients={patients}
                  setPatients={setPatients}

                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === "appointments" && (
                <AppointmentScheduler
                  appointments={appointments}
                  setAppointments={setAppointments}
                  patients={patients}
                  treatmentRecords={treatmentRecords}
                  setTreatmentRecords={setTreatmentRecords}
                  onOpenServiceForm={handleOpenServiceForm}
                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === "inventory" && (
                <InventoryManagement
                  inventory={inventory}
                  setInventory={setInventory}
                  onDataChanged={onDataChanged}
                />
              )}
              {activeTab === "braces" && (
                <BracesCharting
                  patients={patients}

                />
              )}
              {activeTab === "photos" && (
                <div className="p-6 space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">Upload Patient Photos</h2>
                  
                  {/* Upload Form */}
                  <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Patient Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Patient
                        </label>
                        <select
                          value={selectedPatientForPhoto}
                          onChange={(e) => setSelectedPatientForPhoto(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">-- Choose a patient --</option>
                          {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Photo Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Photo Type
                        </label>
                        <select
                          value={photoType}
                          onChange={(e) => setPhotoType(e.target.value as 'before' | 'after' | 'xray')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="before">Before Treatment</option>
                          <option value="after">After Treatment</option>
                          <option value="xray">X-Ray</option>
                        </select>
                      </div>
                    </div>

                    {/* Photo URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Photo
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileSelect}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                        {photoFile && (
                          <div className="text-sm text-gray-600">
                            ✓ {photoFile.name}
                          </div>
                        )}
                      </div>
                      {photoUrl && (
                        <div className="mt-3 relative w-32 h-32 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={photoNotes}
                        onChange={(e) => setPhotoNotes(e.target.value)}
                        placeholder="Add any notes about this photo..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Upload Button */}
                    <button
                      onClick={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      {isUploadingPhoto ? 'Uploading...' : 'Upload Photo to Patient'}
                    </button>
                  </div>

                  {/* Recent Photos */}
                  {photos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Patient Photos</h3>
                      <div className="space-y-3">
                        {photos.slice(-10).reverse().map(photo => {
                          const patient = patients.find(p => String(p.id) === String(photo.patientId));
                          return (
                            <div key={photo.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-start">
                              <div>
                                <p className="font-medium">{patient?.name || 'Unknown Patient'}</p>
                                <p className="text-sm text-gray-600 capitalize">{photo.type} - {new Date(photo.date).toLocaleDateString()}</p>
                                {photo.notes && <p className="text-sm text-gray-700 mt-1">{photo.notes}</p>}
                              </div>
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded capitalize">
                                {photo.type}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "referrals" && (
                <ReferralGeneration
                  referrals={referrals}
                  setReferrals={setReferrals}
                  patients={patients}
                />
              )}
              {activeTab === "services" && (
                <ServicesForms
                  patients={patients}
                  treatmentRecords={treatmentRecords}
                  setTreatmentRecords={setTreatmentRecords}
                  payments={payments}
                  prefilledAppointment={prefilledAppointmentData || undefined}
                  onServiceCreated={() => setPrefilledAppointmentData(null)}
                />
              )}
              {activeTab === "financial" && (
                <FinancialReport
                  currentUser={currentUser}
                  patients={patients}
                  treatmentRecords={treatmentRecords}
                  setTreatmentRecords={setTreatmentRecords}
                  payments={payments}
                  setPayments={setPayments}
                />
              )}
              {activeTab === "announcements" && (
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
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Account Settings</h2>
                      <p className="text-sm text-emerald-100">Manage your profile</p>
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                      className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                        usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your username"
                    />
                    {checkingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                        className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}