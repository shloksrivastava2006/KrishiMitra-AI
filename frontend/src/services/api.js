import axios from 'axios';

const TOKEN_KEY = 'krishimitra_token';

// "Keep me logged in" -> localStorage (survives closing the browser).
// Otherwise sessionStorage (ends with the tab). Language is stored elsewhere and is never touched here.
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY),
  set: (token, remember = true) => {
    sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  },
  clear: () => { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Uploaded photos are served by the API server, not by the frontend host.
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
export const assetUrl = (path) => (typeof path === 'string' && path.startsWith('/uploads/') ? `${API_ORIGIN}${path}` : '');
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired, revoked or invalid token: clear it and tell the app to send the user to login.
// Login/register 401s (wrong password) have no stored token, so they are not treated as expiry.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// Returns { message, network }. Callers translate known cases; server text is shown as-is otherwise.
export const errorInfo = (error) => {
  if (error.response) return { network: false, status: error.response.status, message: error.response.data?.message || `Server error (${error.response.status}). Please try again.` };
  return { network: true, message: `Cannot reach the server at ${API_URL}.` };
};
export const errorMessage = (error) => errorInfo(error).message;

export default api;
