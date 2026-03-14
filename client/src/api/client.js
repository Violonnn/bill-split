/**
 * Base API client - all requests go through this for consistent auth and error handling.
 * Handles network errors (e.g. "Failed to fetch") and returns user-friendly messages.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('billsplit_token');
}

/**
 * Detects if the error is a network/connection failure (e.g. server down, CORS, wrong URL).
 */
function isNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return err.name === 'TypeError' || msg.includes('failed to fetch') || msg.includes('network request failed');
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    if (isNetworkError(err)) {
      const friendly = new Error(
        'Cannot connect to the server. Make sure the server is running and the URL in client .env (VITE_API_URL) is correct.'
      );
      friendly.isNetworkError = true;
      throw friendly;
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
