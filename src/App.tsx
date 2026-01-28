import { useState, useEffect } from 'react';
import { DoctorDashboard } from './components/DoctorDashboard';
import { AssistantDashboard } from './components/AssistantDashboard';
import { PatientPortal } from './components/PatientPortal';
import { AuthPage, User as AuthUser, SignupData } from './components/AuthPage';
import { LandingPage } from './components/ui/LandingPage';
import { Notifications } from './components/Notifications';
import { LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { authAPI, setAuthToken, patientAPI, appointmentAPI, inventoryAPI, referralAPI, announcementAPI, photoAPI } from './api';
import { useDataSync } from './hooks/useDataSync';

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
};

export type Appointment = {
  id: string | number;
  patientId: string | number;
  patientName: string;
  date: string;
  time: string;
  type: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
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
  referredTo: string;
  specialty: string;
  reason: string;
  date: string;
  urgency: 'routine' | 'urgent' | 'emergency';
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

export type ServicePrice = {
  id: string;
  serviceName: string;
  description: string;
  price: number;
  category: string;
  duration?: string;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [photos, setPhotos] = useState<PhotoUpload[]>(() => {
    try {
      const saved = localStorage.getItem('photos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);

  // Initialize data sync hook for real-time synchronization
  const { 
    refreshAll, refreshPatients, refreshAppointments, refreshInventory, 
    refreshReferrals, refreshTreatmentRecords, refreshPayments 
  } = useDataSync({
    setPatients,
    setAppointments,
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
        setCurrentUser(userData);
      } catch (error) {
        console.error('Failed to load user session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);



  // Persist photos to localStorage
  useEffect(() => {
    localStorage.setItem('photos', JSON.stringify(photos));
  }, [photos]);

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
          setCurrentUser(userData);
          // User will be prompted to change password in AuthPage
          return;
        }
        
        // Set user and let useDataSync handle data loading
        setCurrentUser(userData);
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
        <LandingPage onGetStarted={() => setShowLandingPage(false)} />
        <Toaster position="top-right" richColors />
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

  // Route to appropriate dashboard based on role and position
  // Dentist or Assistant Dentist → Doctor interface
  if (currentUser.role === 'doctor' || (currentUser.position === 'dentist' || currentUser.position === 'assistant_dentist')) {
    return (
      <>
        <DoctorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          patients={patients}
          setPatients={setPatients}
          appointments={appointments}
          setAppointments={setAppointments}
          inventory={inventory}
          setInventory={setInventory}
          treatmentRecords={treatmentRecords}
          setTreatmentRecords={setTreatmentRecords}
          referrals={referrals}
          setReferrals={setReferrals}
          photos={photos}
          payments={payments}
          setPayments={setPayments}
          onDataChanged={refreshAll}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Assistant position or assistant role → Assistant interface
  if (currentUser.role === 'assistant' || currentUser.position === 'assistant') {
    return (
      <>
        <AssistantDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          patients={patients}
          setPatients={setPatients}
          appointments={appointments}
          setAppointments={setAppointments}
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
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          servicePrices={servicePrices}
          setServicePrices={setServicePrices}
          onDataChanged={refreshAll}
        />
        <Toaster position="top-right" richColors />
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
    console.log('App.tsx - Current User PatientId:', currentUser.patientId);
    console.log('App.tsx - All Treatment Records:', treatmentRecords);
    console.log('App.tsx - Filtered Patient Treatments:', patientTreatments);
    const billingBalance = patientTreatments.reduce((sum, treatment) => sum + (treatment.remainingBalance !== undefined ? Number(treatment.remainingBalance) : Number(treatment.cost || 0)), 0);

    return (
      <>
        <PatientPortal
          patient={patient}
          appointments={appointments}
          setAppointments={setAppointments}
          treatmentRecords={patientTreatments}
          onUpdatePatient={(updatedPatient) => {
            setPatients(patients.map(p => String(p.id) === String(updatedPatient.id) ? updatedPatient : p));
          }}
          billingBalance={billingBalance}
          photos={photos}
          setPhotos={setPhotos}
          announcements={announcements}
          servicePrices={servicePrices}
          payments={payments}
          currentUserId={currentUser.id}
          onLogout={handleLogout}
          onDataChanged={refreshAll}
        />
      </>
    );
  }

  return <div>Unknown role</div>;
}
