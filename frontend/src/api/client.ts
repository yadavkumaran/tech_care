import axios from 'axios';

export const getApiBaseUrl = () => {
  const customServer = typeof localStorage !== 'undefined' ? localStorage.getItem('techcare_server_url') : null;
  if (customServer && customServer.trim()) {
    return `${customServer.trim().replace(/\/+$/, '')}/api`;
  }
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/+$/, '')}/api`;
  }
  // Detect Capacitor native mobile environment
  const isCapacitor = typeof window !== 'undefined' && (
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  );
  if (isCapacitor) {
    return 'http://192.168.29.113:8080/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamically refresh baseURL on every request in case user changed server URL in settings
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('techcare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('techcare_token');
      localStorage.removeItem('techcare_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

