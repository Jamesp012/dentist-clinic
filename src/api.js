const getApiBase = () => {
  // Check if an explicit API URL is provided via environment variables (Vite)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol, port, pathname } = window.location;
    
    // PHP backend is located at /backend/php/index.php
    // We assume the frontend is in the root or same subdirectory level
    
    // Get the base path (excluding the filename if index.html is in URL)
    const basePath = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);
    
    // For localhost development using Vite (port 5173), the PHP backend 
    // is usually served by Apache (XAMPP) on port 80 or another port.
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // If we are on Vite port 5173, we likely need to point to Apache's port (default 80)
      if (port === '5173') {
        // If the project is in XAMPP htdocs, we need to include the folder name
        // Usually localhost/dentist-clinic/backend/php
        return `http://${hostname}/dentist-clinic/backend/php/api`;
      }
    }
    
    // PHP backend URL for live or if served directly by the same server
    // Added /api prefix as required by backend/php/index.php routing
    return `${protocol}//${hostname}${port ? `:${port}` : ''}${basePath}backend/php/api`;
  }
  return '/backend/php/api';
};

export const API_BASE = getApiBase();
// SERVER_URL is used for static files (uploads). It should point to the root backend/ directory.
export const SERVER_URL = API_BASE.includes('/backend/php/api') 
  ? API_BASE.replace('/php/api', '') 
  : API_BASE.replace('/api', '');

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
    console.error('API call blocked: User is unauthorized', { url });
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
        console.warn('API 401 Unauthorized:', { url });
        isUnauthorized = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/'; // Redirect to home/login
      }
      
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        console.error('Failed to parse error response as JSON:', { 
          url, 
          status: response.status,
          statusText: response.statusText
        });
        // Try to get text to see if it's an HTML error page
        const text = await response.text().catch(() => 'No response text');
        console.error('Raw response body (first 200 chars):', text.substring(0, 200));
      }

      const errorMessage = errorData.error || `API Error: ${response.status}`;
      const err = new Error(errorMessage);
      err.status = response.status;
      err.details = errorData;
      throw err;
    }

    try {
      return await response.json();
    } catch (e) {
      console.error('Failed to parse successful response as JSON:', { 
        url, 
        status: response.status 
      });
      const text = await response.text().catch(() => 'No response text');
      console.error('Raw response body (first 200 chars):', text.substring(0, 200));
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('Fetch Error:', { url, error: error.message });
    if (error.message?.includes('401')) {
      isUnauthorized = true;
    }
    throw error;
  }
};

// Auth APIs
export const authAPI = {
  login: async (username, password) => {
    const url = `${API_BASE}/auth/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        console.error('Login request failed:', { status: response.status, url });
        const text = await response.text().catch(() => 'No text');
        console.error('Login error body (first 200 chars):', text.substring(0, 200));
        try {
          return JSON.parse(text);
        } catch (e) {
          return { error: `Server Error: ${response.status}` };
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('Login Fetch Error:', { error: error.message, url });
      throw error;
    }
  },

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

  forgotPassword: (username) =>
    fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).then((r) => r.json()),

  verifyOTP: (username, otp) =>
    fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp }),
    }).then((r) => r.json()),

  resetPassword: (username, otp, newPassword) =>
    fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp, newPassword }),
    }).then((r) => r.json()),

  checkUsername: (username) =>
    fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`).then((r) => r.json()),

  checkEmail: (email) =>
    fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`).then((r) => r.json()),

  requestSignupOTP: (email) =>
    fetch(`${API_BASE}/auth/request-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((r) => r.json()),

  verifySignupOTP: (email, otp) =>
    fetch(`${API_BASE}/auth/verify-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }).then((r) => r.json()),
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
    }).then(result => {
      console.log('Patient API update response:', {
        patientId: id,
        sentProfilePhoto: !!data.profilePhoto,
        photoLength: data.profilePhoto?.length
      });
      return result;
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
  updateStock: (id, data) =>
    fetchWithAuth(`${API_BASE}/inventory/${id}/update-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getHistory: () => fetchWithAuth(`${API_BASE}/inventory/history`),
  getItemHistory: (id) => fetchWithAuth(`${API_BASE}/inventory/${id}/history`),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/inventory/${id}`, {
      method: 'DELETE',
    }),
};

// Inventory Management APIs
export const inventoryManagementAPI = {
  // Overview endpoints
  getOverview: () => fetchWithAuth(`${API_BASE}/inventory-management/overview`),
  getAlerts: () => fetchWithAuth(`${API_BASE}/inventory-management/alerts`),

  // Auto-reduction rules
  getAutoReductionRules: () => fetchWithAuth(`${API_BASE}/inventory-management/auto-reduction/rules`),
  getRulesByType: (appointmentType) => fetchWithAuth(`${API_BASE}/inventory-management/auto-reduction/rules/type/${appointmentType}`),
  createAutoReductionRule: (data) =>
    fetchWithAuth(`${API_BASE}/inventory-management/auto-reduction/rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAutoReductionRule: (id, data) =>
    fetchWithAuth(`${API_BASE}/inventory-management/auto-reduction/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAutoReductionRule: (id) =>
    fetchWithAuth(`${API_BASE}/inventory-management/auto-reduction/rules/${id}`, {
      method: 'DELETE',
    }),
  resetAutoReductionRules: (appointmentType) =>
    fetchWithAuth(`${API_BASE}/inventory-management/auto-reduction/rules/reset/${appointmentType}`, {
      method: 'POST',
    }),

  // Reduction history
  getReductionHistory: (limit = 100, offset = 0) =>
    fetchWithAuth(`${API_BASE}/inventory-management/history?limit=${limit}&offset=${offset}`),
  getReductionHistoryByPatient: (patientId) =>
    fetchWithAuth(`${API_BASE}/inventory-management/history/patient/${patientId}`),
  getReductionHistoryByAppointment: (appointmentId) =>
    fetchWithAuth(`${API_BASE}/inventory-management/history/appointment/${appointmentId}`),
  getReductionHistoryByItem: (itemId) =>
    fetchWithAuth(`${API_BASE}/inventory-management/history/item/${itemId}`),

  // Auto-reduce endpoint (called when appointment is completed)
  autoReduceForAppointment: (appointmentId) =>
    fetchWithAuth(`${API_BASE}/inventory-management/auto-reduce/appointment/${appointmentId}`, {
      method: 'POST',
    }),
};

// Referral APIs
export const referralAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/referrals`),
  getById: (id) => fetchWithAuth(`${API_BASE}/referrals/${id}`),
  getByPatientId: (patientId) => fetchWithAuth(`${API_BASE}/referrals/patient/${patientId}`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/referrals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadFile: async (formData) => {
    // Uploading files requires FormData and not JSON. We use fetch directly to allow FormData as body.
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/referrals/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload file');
    }
    return response.json();
  },
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

// Prescription APIs
export const prescriptionAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/prescriptions`),
  getById: (id) => fetchWithAuth(`${API_BASE}/prescriptions/${id}`),
  getByPatientId: (patientId) => fetchWithAuth(`${API_BASE}/prescriptions/patient/${patientId}`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/prescriptions/${id}`, {
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

// Service APIs
export const serviceAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/services`),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchWithAuth(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/services/${id}`, {
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

// Notification APIs
export const notificationAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/notifications`),
  getUnreadCount: () => fetchWithAuth(`${API_BASE}/notifications/unread/count`),
  getByPatientId: (patientId) =>
    fetchWithAuth(`${API_BASE}/notifications/patient/${patientId}`),
  markAsRead: (id) =>
    fetchWithAuth(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
    }),
  markAllAsRead: (patientId) =>
    fetchWithAuth(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      body: JSON.stringify({ patientId }),
    }),
  create: (data) =>
    fetchWithAuth(`${API_BASE}/notifications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchWithAuth(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
    }),
};
