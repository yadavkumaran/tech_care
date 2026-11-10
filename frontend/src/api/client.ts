import axios from 'axios';

export const CLOUD_BACKEND_URL = 'https://techcare-backend-6uc4.onrender.com';

export const getApiBaseUrl = () => {
  // 1. User manual override stored in localStorage
  let customServer = typeof localStorage !== 'undefined' ? localStorage.getItem('techcare_server_url') : null;
  // Automatically purge obsolete backend URLs without the -6uc4 slug
  if (customServer && customServer.includes('techcare-backend.onrender.com') && !customServer.includes('techcare-backend-6uc4')) {
    try {
      localStorage.removeItem('techcare_server_url');
    } catch {}
    customServer = null;
  }
  if (customServer && customServer.trim()) {
    return `${customServer.trim().replace(/\/+$/, '')}/api`;
  }

  // 2. Environment variable injected at build time (e.g. Vite or Render hosting)
  let envUrl = (import.meta as any).env?.VITE_API_URL;
  // Neutralize obsolete Render URL if missing the -6uc4 service identifier
  if (typeof envUrl === 'string' && envUrl.includes('techcare-backend.onrender.com') && !envUrl.includes('techcare-backend-6uc4')) {
    envUrl = CLOUD_BACKEND_URL;
  }
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return `${envUrl.trim().replace(/\/+$/, '')}/api`;
  }

  // 3. Local desktop browser development (e.g. localhost:5173 running with Vite dev proxy)
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== ''
  ) {
    return '/api';
  }

  // 4. Default for production website (Render) and mobile app (Capacitor):
  // Points directly to the live Render cloud backend so users never have to configure URLs manually.
  return `${CLOUD_BACKEND_URL}/api`;
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
      const isPublicRoute =
        typeof window !== 'undefined' &&
        (window.location.pathname.startsWith('/pay') ||
          window.location.pathname.startsWith('/track') ||
          window.location.pathname === '/login');
      if (!isPublicRoute) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

