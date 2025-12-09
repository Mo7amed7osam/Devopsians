// Centralized API/Socket configuration
// Normalizes VITE_API_URL and exposes a single source of truth

const rawApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL);

const normalizeApiBase = (url) => {
  if (!url || url === '/') return '/api';
  if (/^https?:\/\//.test(url)) return url; // absolute URL stays unchanged
  return url.startsWith('/') ? url : `/${url}`;
};

export const API_BASE = normalizeApiBase(rawApiUrl);
// For sockets, only use explicit URL when it's absolute; otherwise rely on same-origin
export const SOCKET_URL = (rawApiUrl && /^(https?:)?\/\//.test(rawApiUrl)) ? rawApiUrl : undefined;
