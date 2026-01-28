export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    fullName: string;
    email: string;
    phone?: string;
    isFirstLogin?: boolean;
    patientId?: number | string;
  };
  error?: string;
  message?: string;
}

export interface Patient {
  id: string | number;
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  sex: 'Male' | 'Female';
  medicalHistory: string;
  allergies: string;
}

export interface Appointment {
  id: string | number;
  patientId: string | number;
  patientName: string;
  date: string;
  time: string;
  type: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

export interface InventoryItem {
  id: string | number;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  supplier: string;
  cost: number;
}

export interface Referral {
  id: string | number;
  patientId: string | number;
  patientName: string;
  referringDentist: string;
  referredTo: string;
  specialty: string;
  reason: string;
  date: string;
  urgency: 'routine' | 'urgent' | 'emergency';
}

export interface Announcement {
  id: string | number;
  title: string;
  message: string;
  type: 'promo' | 'closure' | 'general' | 'important';
  date: string;
  createdBy: string;
}

export interface TreatmentRecord {
  id: string | number;
  patientId: string | number;
  date: string;
  description: string;
  treatment?: string;
  tooth?: string;
  notes?: string;
  cost: number;
  dentist?: string;
  paymentType?: 'full' | 'installment';
  amountPaid?: number;
  remainingBalance?: number;
  installmentPlan?: any;
}

export interface Payment {
  id: string | number;
  patientId: string | number;
  treatmentRecordId?: string | number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  notes?: string;
  recordedBy: string;
}

export const setAuthToken: (token: string) => void;
export const getAuthToken: () => string | null;

export const authAPI: {
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (userData: any) => Promise<any>;
};

export const patientAPI: {
  getAll: () => Promise<any[]>;
  getById: (id: string | number) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const appointmentAPI: {
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const inventoryAPI: {
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const referralAPI: {
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const announcementAPI: {
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const treatmentRecordAPI: {
  getAll: () => Promise<any[]>;
  getByPatientId: (patientId: string | number) => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const paymentAPI: {
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const patientClaimingAPI: {
  searchRecords: (data: { fullName: string; dateOfBirth: string; phone: string }) => Promise<any>;
  selectPatient: (data: { patientId: string | number; lastVisit?: string }) => Promise<any>;
  sendOTP: (patientId: string | number) => Promise<any>;
  resendOTP: (patientId: string | number) => Promise<any>;
  verifyAndLink: (data: { patientId: string | number; otp: string; userData: any }) => Promise<any>;
};
