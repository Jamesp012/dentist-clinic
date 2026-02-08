import { useState, useEffect } from 'react';
import { DoctorDashboard } from './components/DoctorDashboard';
import { AssistantDashboard } from './components/AssistantDashboard';
import { PatientPortal } from './components/PatientPortal';
import { AuthPage, User as AuthUser, SignupData } from './components/AuthPage';
import { LandingPage } from './components/ui/LandingPage';
import { Toaster, toast } from 'sonner';
import { authAPI, setAuthToken, photoAPI, patientAPI } from './api';
import { useDataSync } from './hooks/useDataSync';
import './styles/scrollbar.css';

// Type definitions
export type Patient = {
  id: string | number;
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  sex: 'Male' | 'Female';
  medicalHistory: string;
  allergies: string;
  lastVisit?: string;
  nextAppointment?: string;
  totalBalance?: number;
  profilePhoto?: string;
  // Referral workflow fields
  patientType?: 'direct' | 'referred';
  hasExistingRecord?: boolean;
  referralFiles?: {
    id: string;
    fileName: string;
    fileType: string; // 'image' | 'pdf' | 'document'
    uploadedDate: string;
    url: string;
  }[];
};

export type Appointment = {
  id: string | number;
  patientId: string | number;
  patientName: string;
  date: string;
  time: string;
  appointmentDateTime?: string;
  type: string[];
  duration?: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  createdAt?: string;
  createdByRole?: 'patient' | 'staff';
};

export type InventoryItem = {
  id: string | number;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  supplier: string;
  lastOrdered?: string;
  cost: number;
  quantityPerBox?: number;
};

export type TreatmentRecord = {
  id: string | number;
  patientId: string | number;
  date: string;
  description: string;
  type?: string;
  treatment?: string;
  tooth?: string;
  notes?: string;
  cost: number;
  dentist?: string;
  paymentType?: 'full' | 'installment';
  amountPaid?: number;
  remainingBalance?: number;
  installmentPlan?: {
    installments: number;
    amountPerInstallment: number;
    installmentsDue: { dueDate: string; amount: number; paid: boolean }[];
  };
};

export type Payment = {
  id: string | number;
  patientId: string | number;
  treatmentRecordId?: string | number;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'check' | 'bank_transfer';
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
  recordedBy: string;
};

export type Referral = {
  id: string | number;
  patientId: string | number;
  patientName: string;
  referringDentist: string;
  referredBy?: string;
  referredByContact?: string;
  referredByEmail?: string;
  referredTo: string;
  specialty: string;
  reason: string;
  selectedServices?: Record<string, boolean | string>;
  date: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  createdByRole?: 'patient' | 'staff';
  xrayDiagramSelections?: Record<string, 'black' | 'red'>;
  xrayNotes?: string;
  // Referral workflow fields
  referralType?: 'incoming' | 'outgoing'; // incoming: from other doctors to Doc Maaño, outgoing: from Doc Maaño to others
  source?: 'patient-uploaded' | 'staff-upload' | 'external';
  uploadedFiles?: {
    id: string;
    fileName: string;
    fileType: string;
    uploadedDate: string;
    url: string;
  }[];
};

export type PhotoUpload = {
  id: string | number;
  patientId: string | number;
  type: 'before' | 'after' | 'xray';
  url: string;
  date: string;
  notes?: string;
  treatmentId?: string | number;
};

export type ChatMessage = {
  id: string;
  patientId: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'assistant';
  message: string;
  timestamp: string;
  read: boolean;
};

export type Announcement = {
  id: string | number;
  title: string;
  message: string;
  type: 'promo' | 'closure' | 'general' | 'important';
  date: string;
  createdBy: string;
};

export type Service = {
  id: string;
  serviceName: string;
  category: string;
  description: string[];
  duration: string;
  price?: string;
};

/**
 * Helper function to normalize appointment dates to YYYY-MM-DD format
 * This prevents timezone issues when displaying appointments
 */
const getDateString = (date: string | Date): string => {
  if (typeof date === 'string') {
    return date.includes('T') ? date.split('T')[0] : date;
  }
  // Use UTC methods to avoid timezone conversion
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('patients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('appointments');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Normalize all appointment dates to YYYY-MM-DD format to prevent timezone issues
      return parsed.map((apt: any) => ({
        ...apt,
        date: getDateString(apt.date)
      }));
    } catch {
      return [];
    }
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('inventory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('treatmentRecords');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [referrals, setReferrals] = useState<Referral[]>(() => {
    try {
      const saved = localStorage.getItem('referrals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [photos, setPhotos] = useState<PhotoUpload[]>(() => {
    try {
      const saved = localStorage.getItem('photos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem('payments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [chatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chatMessages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem('announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const saved = localStorage.getItem('services');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Create a wrapper for setAppointments that normalizes dates
  const setAppointmentsWithNormalization = (appointmentsOrUpdater: Appointment[] | ((prev: Appointment[]) => Appointment[])) => {
    setAppointments(prev => {
      const newAppointments = typeof appointmentsOrUpdater === 'function' 
        ? appointmentsOrUpdater(prev) 
        : appointmentsOrUpdater;
      
      // Normalize all appointment dates
      return newAppointments.map(apt => ({
        ...apt,
        date: getDateString(apt.date)
      }));
    });
  };

  // Initialize data sync hook for real-time synchronization
  const { 
    refreshAll
  } = useDataSync({
    setPatients,
    setAppointments: setAppointmentsWithNormalization,
    setTreatmentRecords,
    setInventory,
    setReferrals,
    setPayments,
    setAnnouncements,
    isAuthenticated: !!currentUser,
  });

  // Load data on mount and when user logs in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        setAuthToken(token);
        const userData = JSON.parse(user);
        setCurrentUser({ ...userData, id: String(userData.id) } as AuthUser);
      } catch (error) {
        console.error('Failed to load user session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Refresh data from database when user is authenticated
  useEffect(() => {
    if (currentUser) {
      refreshAll();
    }
  }, [currentUser, refreshAll]);



  // Persist photos to localStorage
  useEffect(() => {
    localStorage.setItem('photos', JSON.stringify(photos));
  }, [photos]);

  // Persist all other data to localStorage
  useEffect(() => {
    localStorage.setItem('patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('treatmentRecords', JSON.stringify(treatmentRecords));
  }, [treatmentRecords]);

  useEffect(() => {
    localStorage.setItem('referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('announcements', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('services', JSON.stringify(services));
  }, [services]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      if (response.token && response.user) {
        setAuthToken(response.token);
        const userData = response.user;
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', response.token);
        
        // Load photos from backend
        try {
          const photosData = await photoAPI.getAll();
          if (photosData && Array.isArray(photosData)) {
            setPhotos(photosData);
          }
        } catch (photoError) {
          console.log('Could not load photos from backend, using local storage:', photoError);
          // Fall back to localStorage
          try {
            const saved = localStorage.getItem('photos');
            if (saved) {
              setPhotos(JSON.parse(saved));
            }
          } catch (e) {
            console.error('Error loading photos from localStorage:', e);
          }
        }
        
        // Check if first-time login
        if (userData.isFirstLogin) {
          setCurrentUser({ ...userData, id: String(userData.id) } as AuthUser);
          // User will be prompted to change password in AuthPage
          return;
        }
        
        // Set user and let useDataSync handle data loading
        setCurrentUser({ ...userData, id: String(userData.id) } as AuthUser);
        toast.success(`Welcome, ${userData.fullName}`);
      } else {
        toast.error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed - cannot connect to server');
    }
  };

  const handleSignup = async (signupData: SignupData) => {
    try {
      const response = await authAPI.register(signupData);
      if (response.message) {
        toast.success('Account created successfully! Please log in with your credentials.');
      } else {
        toast.error(response.error || 'Signup failed');
      }
    } catch (error) {
      toast.error('Signup failed - cannot connect to server');
    }
  };

  // Show landing page if not logged in and landing page should be shown
  if (!currentUser && showLandingPage) {
    return (
      <>
        <LandingPage 
          onGetStarted={() => setShowLandingPage(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
        <Toaster 
          position="top-center" 
          richColors
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #14b8a6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  // Show auth page if no user is logged in
  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />;
  }

  // If first-time login, show password change prompt
  if (currentUser.isFirstLogin && currentUser.role !== 'patient') {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />;
  }

  // Route to appropriate dashboard based on accessLevel
  // Super Admin or role doctor → Doctor interface
  if (currentUser.accessLevel === 'Super Admin') {
    return (
      <>
        <DoctorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          patients={patients}
          setPatients={setPatients}
          appointments={appointments}
          setAppointments={setAppointmentsWithNormalization}
          inventory={inventory}
          setInventory={setInventory}
          treatmentRecords={treatmentRecords}
          setTreatmentRecords={setTreatmentRecords}
          referrals={referrals}
          setReferrals={setReferrals}
          photos={photos}
          setPhotos={setPhotos}
          payments={payments}
          setPayments={setPayments}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          services={services}
          setServices={setServices}
          onDataChanged={async () => { await refreshAll(); }}
        />
        <Toaster 
          position="top-center" 
          richColors
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #14b8a6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  // Admin or role assistant → Assistant interface
  if (currentUser.accessLevel === 'Admin') {
    return (
      <>
        <AssistantDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          patients={patients}
          setPatients={setPatients}
          appointments={appointments}
          setAppointments={setAppointmentsWithNormalization}
          inventory={inventory}
          setInventory={setInventory}
          treatmentRecords={treatmentRecords}
          setTreatmentRecords={setTreatmentRecords}
          referrals={referrals}
          setReferrals={setReferrals}
          photos={photos}
          setPhotos={setPhotos}
          payments={payments}
          setPayments={setPayments}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          services={services}
          setServices={setServices}
          onDataChanged={async () => { await refreshAll(); }}
        />
        <Toaster 
          position="top-center" 
          richColors
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #14b8a6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  // Default Accounts for doctor role → Doctor interface (fallback for backward compatibility)
  if (currentUser.role === 'doctor') {
    return (
      <>
        <DoctorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          patients={patients}
          setPatients={setPatients}
          appointments={appointments}
          setAppointments={setAppointmentsWithNormalization}
          inventory={inventory}
          setInventory={setInventory}
          treatmentRecords={treatmentRecords}
          setTreatmentRecords={setTreatmentRecords}
          referrals={referrals}
          setReferrals={setReferrals}
          photos={photos}
          setPhotos={setPhotos}
          payments={payments}
          setPayments={setPayments}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          services={services}
          setServices={setServices}
          onDataChanged={async () => { await refreshAll(); }}
        />
        <Toaster 
          position="top-center" 
          richColors
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #14b8a6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  // Default Accounts for assistant role → Assistant interface (fallback for backward compatibility)
  if (currentUser.role === 'assistant') {
    return (
      <>
        <AssistantDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          patients={patients}
          setPatients={setPatients}
          appointments={appointments}
          setAppointments={setAppointmentsWithNormalization}
          inventory={inventory}
          setInventory={setInventory}
          treatmentRecords={treatmentRecords}
          setTreatmentRecords={setTreatmentRecords}
          referrals={referrals}
          setReferrals={setReferrals}
          photos={photos}
          setPhotos={setPhotos}
          payments={payments}
          setPayments={setPayments}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          services={services}
          setServices={setServices}
          onDataChanged={async () => { await refreshAll(); }}
        />
        <Toaster 
          position="top-center" 
          richColors
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #14b8a6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  // Show patient portal for patient users
  if (currentUser.role === 'patient') {
    let patient = patients.find(p => String(p.id) === String(currentUser.patientId));
    
    // If no patient record found but user has patientId, create a blank record from user data
    if (!patient && currentUser.patientId) {
      patient = {
        id: currentUser.patientId,
        name: currentUser.fullName,
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        dateOfBirth: '',
        sex: 'Male',
        address: '',
        medicalHistory: '',
        allergies: '',
      };
    }
    
    // If still no patient (shouldn't happen), show error
    if (!patient) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 mb-4">Unable to load patient record</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    // Calculate billing balance from treatment records
    // Balance = Total cost - Total paid for this patient
    const patientTreatments = treatmentRecords.filter(t => String(t.patientId) === String(currentUser.patientId));
    void patientTreatments.reduce((sum, treatment) => sum + (treatment.remainingBalance !== undefined ? Number(treatment.remainingBalance) : Number(treatment.cost || 0)), 0);

    return (
      <>
        <PatientPortal
          patient={patient}
          appointments={appointments}
          setAppointments={setAppointmentsWithNormalization}
          treatmentRecords={patientTreatments}
          onUpdatePatient={async (updatedPatient) => {
            try {
              console.log('Updating patient with photo:', {
                id: updatedPatient.id,
                name: updatedPatient.name,
                hasPhoto: !!updatedPatient.profilePhoto,
                photoLength: updatedPatient.profilePhoto?.length
              });
              
              // Update patient in the backend
              await patientAPI.update(updatedPatient.id, updatedPatient);
              console.log('Patient updated successfully in backend');
              
              // Update local state
              setPatients(patients.map(p => String(p.id) === String(updatedPatient.id) ? updatedPatient : p));
              
              // Refresh all data to ensure consistency
              await refreshAll();
              console.log('Data refreshed');
            } catch (error) {
              console.error('Failed to update patient:', error);
            }
          }}
          photos={photos}
          setPhotos={setPhotos}
          announcements={announcements}
          payments={payments}
          onLogout={handleLogout}
          onDataChanged={async () => { await refreshAll(); }}
          services={services}
          userRole={currentUser?.role}
        />
        <Toaster 
          position="top-center" 
          richColors
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #14b8a6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px 24px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />
      </>
    );
  }

  return <div>Unknown role</div>;
}
