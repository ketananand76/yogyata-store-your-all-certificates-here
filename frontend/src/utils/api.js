import axios from 'axios';

const api = axios.create({
  // In development, use VITE_API_URL or local port. In production, use relative paths to enable Vercel Proxying.
  baseURL: import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:5000') : '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      const msg = error.response.data?.message || '';
      if (msg.includes('blocked') || msg.includes('moderation')) {
        window.location.href = '/login?error=' + encodeURIComponent(msg);
      }
    }
    return Promise.reject(error);
  }
);

export const socketUrl = import.meta.env.DEV 
  ? 'http://localhost:5000' 
  : 'https://sanchay-store-your-all-certificates-here.onrender.com';

export const getFileUrl = (url) => {
  if (!url) return '';
  
  // If it's a data URL, return it as-is
  if (url.startsWith('data:')) return url;

  const backendUrl = import.meta.env.DEV 
    ? (import.meta.env.VITE_API_URL || 'http://localhost:5000') 
    : 'https://sanchay-store-your-all-certificates-here.onrender.com';

  // If the URL contains '/uploads/' anywhere (handles full local development URLs in production database)
  if (url.includes('/uploads/')) {
    const uploadsIndex = url.indexOf('/uploads/');
    const relativePath = url.substring(uploadsIndex); // extracts "/uploads/..."
    return backendUrl + relativePath;
  }

  // If it's a full remote URL (Cloudinary, etc.)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative path fallback
  const cleanUrl = url.startsWith('/') ? url : '/' + url;
  return backendUrl + cleanUrl;
};

export default api;
