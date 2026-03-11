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
  createdByRole?: 'patient' | 'staff';
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
  unit_type?: 'box' | 'piece';
  pieces_per_box?: number;
  remaining_pieces?: number;
  base_unit?: string;
  main_unit?: string | null;
  conversion_value?: number | null;
  base_quantity?: number;
  baseUnit?: string;
  mainUnit?: string | null;
  conversionValue?: number | null;
  baseQuantity?: number;
  piecesPerBox?: number;
  remainingPieces?: number;
}

export interface Referral {
  id: string | number;
  patientId: string | number;
  patientName: string;
  referringDentist: string;
  referredByContact?: string;
  referredByEmail?: string;
  referredTo: string;
  specialty: string;
  reason: string;
  selectedServices?: Record<string, boolean | string>;
  date: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  createdByRole?: 'patient' | 'staff';
  // Optional workflow metadata
  referralType?: 'incoming' | 'outgoing';
  source?: string;
  uploadedFiles?: Array<{ id: string | number; fileName: string; fileType: string; url: string }>;
}

export interface Announcement {
  id: string | number;
  title: string;
  message: string;
  type: 'promo' | 'closure' | 'general' | 'important';
  date: string;
  createdBy: string;
  expiresAt?: string;
}

export interface PatientNotification {
  id: string | number;
  patientId: string | number;
  appointmentId?: string | number;
  type: 'appointment_created' | 'appointment_updated' | 'appointment_cancelled' | 'reminder' | 'announcement_posted';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface TreatmentRecord {
  id: string | number;
  patientId: string | number;
  date: string;
  description: string;
  treatment?: string;
  tooth?: string;
  notes?: string;
  appointmentId?: string | number | null;
  cost: number;
  dentist?: string;
  paymentType?: 'full' | 'installment';
  amountPaid?: number;
  remainingBalance?: number;
  installmentPlan?: any;
  selectedServices?: string[];
  types?: string[];
  inventoryDeduction?: {
    applied: boolean;
    reductions?: Array<{
      itemId: string | number;
      itemName: string;
      unitType: 'box' | 'piece' | string;
      unitsDeducted: number;
      piecesDeducted: number;
      baseUnit?: string;
      mainUnit?: string | null;
      conversionValue?: number | null;
      quantityBefore?: number;
      quantityAfter?: number;
    }>;
    shortages?: Array<{
      itemId: string | number;
      itemName: string;
      unitType: string;
      requestedPieces: number;
      availablePieces: number;
      baseUnit?: string;
      mainUnit?: string | null;
    }>;
    missingRules?: string[];
  };
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

export const API_BASE: string;
export const SERVER_URL: string;
export const setAuthToken: (token: string) => void;
export const getAuthToken: () => string | null;

export const authAPI: {
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (userData: any) => Promise<any>;
  changePassword: (userId: string | number, newPassword: string) => Promise<any>;
  forgotPassword: (username: string) => Promise<any>;
  verifyOTP: (username: string, otp: string) => Promise<any>;
  resetPassword: (username: string, otp: string, newPassword: string) => Promise<any>;
  checkUsername: (username: string) => Promise<any>;
  checkEmail: (email: string) => Promise<any>;
  requestSignupOTP: (email: string) => Promise<any>;
  verifySignupOTP: (email: string, otp: string) => Promise<any>;
};

export const serviceAPI: {
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
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
  updateStock: (id: string | number, data: any) => Promise<any>;
  getHistory: () => Promise<any[]>;
  getItemHistory: (id: string | number) => Promise<any[]>;
  delete: (id: string | number) => Promise<any>;
};

export const inventoryManagementAPI: {
  getOverview: () => Promise<any>;
  getAlerts: () => Promise<any>;
  getAutoReductionRules: () => Promise<any[]>;
  getRulesByType: (appointmentType: string) => Promise<any[]>;
  createAutoReductionRule: (data: any) => Promise<any>;
  updateAutoReductionRule: (id: string | number, data: any) => Promise<any>;
  deleteAutoReductionRule: (id: string | number) => Promise<any>;
  resetAutoReductionRules: (appointmentType: string) => Promise<any>;
  getReductionHistory: (limit?: number, offset?: number) => Promise<any>;
  getReductionHistoryByPatient: (patientId: string | number) => Promise<any>;
  getReductionHistoryByAppointment: (appointmentId: string | number) => Promise<any>;
  getReductionHistoryByItem: (itemId: string | number) => Promise<any>;
  autoReduceForAppointment: (appointmentId: string | number) => Promise<any>;
};

export const referralAPI: {
  getAll: () => Promise<any[]>;
  getById: (id: string | number) => Promise<any>;
  getByPatientId: (patientId: string | number) => Promise<any[]>;
  create: (data: any) => Promise<any>;
  uploadFile: (formData: FormData) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const prescriptionAPI: {
  getAll: () => Promise<any[]>;
  getById: (id: string | number) => Promise<any>;
  getByPatientId: (patientId: string | number) => Promise<any[]>;
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

export const photoAPI: {
  getAll: () => Promise<any[]>;
  getByPatientId: (patientId: string | number) => Promise<any[]>;
  upload: (data: FormData) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  delete: (id: string | number) => Promise<any>;
};

export const notificationAPI: {
  getAll: () => Promise<PatientNotification[]>;
  getUnreadCount: () => Promise<{ unreadCount: number }>;
  getByPatientId: (patientId: string | number) => Promise<PatientNotification[]>;
  markAsRead: (id: string | number) => Promise<any>;
  markAllAsRead: (patientId: string | number) => Promise<any>;
  create: (data: any) => Promise<PatientNotification>;
  delete: (id: string | number) => Promise<any>;
};
