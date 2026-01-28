const API_BASE = 'http://localhost:5000/api';

let authToken = localStorage.getItem('token');
let isUnauthorized = false;

export const setAuthToken = (token) => {
  authToken = token;
  isUnauthorized = false;
  localStorage.setItem('token', token);
};

export const getAuthToken = () => authToken;

const fetchWithAuth = async (url, options = {}) => {
  if (isUnauthorized) {
    throw new Error('API Error: 401');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) {
        isUnauthorized = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/'; // Redirect to home/login
      }
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (error.message?.includes('401')) {
      isUnauthorized = true;
    }
    throw error;
  }
};

// Auth APIs
export const authAPI = {
  login: (username, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((r) => r.json()),

  register: (userData) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then((r) => r.json()),
  
  changePassword: (userId, newPassword) =>
    fetchWithAuth(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ userId, newPassword }),
    }),
};

// Patient APIs
export const patientAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/patients`),
  getById: (id) => fetchWithAuth(`${API_BASE}/patients/${id}`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/patients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/patients/${id}`, {
      method: 'DELETE',
    }),
};

// Appointment APIs
export const appointmentAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/appointments`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/appointments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
    }),
};

// Inventory APIs
export const inventoryAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/inventory`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/inventory`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/inventory/${id}`, {
      method: 'DELETE',
    }),
};

// Referral APIs
export const referralAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/referrals`),
  getById: (id) => fetchWithAuth(`${API_BASE}/referrals/${id}`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/referrals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/referrals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/referrals/${id}`, {
      method: 'DELETE',
    }),
};

// Announcement APIs
export const announcementAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/announcements`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/announcements/${id}`, {
      method: 'DELETE',
    }),
};

// Treatment Record APIs
export const treatmentRecordAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/treatment-records`),
  getByPatientId: (patientId) => fetchWithAuth(`${API_BASE}/treatment-records/patient/${patientId}`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/treatment-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/treatment-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/treatment-records/${id}`, {
      method: 'DELETE',
    }),
};

// Payment APIs
export const paymentAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/payments`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/payments/${id}`, {
      method: 'DELETE',
    }),
};

// Photo APIs
export const photoAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/photos`),
  getByPatientId: (patientId) =>
    fetchWithAuth(`${API_BASE}/photos/patient/${patientId}`),
  upload: (data) =>
    fetchWithAuth(`${API_BASE}/photos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/photos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/photos/${id}`, {
      method: 'DELETE',
    }),
};

// Patient Claiming APIs
export const patientClaimingAPI = {
  // Search for existing patient records
  searchRecords: (data) =>
    fetch(`${API_BASE}/patient-claiming/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // Select specific patient from multiple matches
  selectPatient: (data) =>
    fetch(`${API_BASE}/patient-claiming/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // Send OTP to patient's phone
  sendOTP: (patientId) =>
    fetch(`${API_BASE}/patient-claiming/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId }),
    }).then((r) => r.json()),

  // Resend OTP
  resendOTP: (patientId) =>
    fetch(`${API_BASE}/patient-claiming/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId }),
    }).then((r) => r.json()),

  // Verify OTP and link account
  verifyAndLink: (data) =>
    fetch(`${API_BASE}/patient-claiming/verify-and-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};

