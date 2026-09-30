const PRODUCTION_API_URL = 'https://new-app-7cvj.onrender.com/api';

export const AUTH_TOKEN_KEY = 'astro_token';

function getBaseUrl() {
  // Same-origin /api when UI is served by the backend (Render).
  // Override with VITE_API_URL for local or split hosting.
  return import.meta.env.VITE_API_URL || (import.meta.env.DEV ? PRODUCTION_API_URL : '/api');
}

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    let message = `API ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const chatApi = {
  createSession: (language = 'en') =>
    request('/chat/session', { method: 'POST', body: JSON.stringify({ language }) }),
  sendMessage: (sessionId, message, language = 'en') =>
    request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, language }),
    }),
  resetSession: (id, language = 'en') =>
    request(`/chat/reset/${id}`, { method: 'POST', body: JSON.stringify({ language }) }),
};

export const panchangApi = {
  getToday: () => request('/panchang/today'),
  getEkadashi: () => request('/panchang/ekadashi'),
  getAmavasya: () => request('/panchang/amavasya'),
};

export const horoscopeApi = {
  getBySign: (sign) => request(`/horoscope/today/${sign}`),
};

export const kundliApi = {
  generate: (dateOfBirth, birthTime, birthPlace) =>
    request('/kundli/generate', {
      method: 'POST',
      body: JSON.stringify({ dateOfBirth, birthTime, birthPlace }),
    }),
};

export const authApi = {
  config: () => request('/auth/config'),
  google: (idToken, language) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, language }),
    }),
  me: () => request('/auth/me'),
  profile: (phone, city) =>
    request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ phone, city }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  track: (type, path, meta = {}) =>
    request('/auth/event', {
      method: 'POST',
      body: JSON.stringify({ type, path, meta }),
    }).catch(() => null),
};

export const adminApi = {
  users: (secret) => request('/admin/users', { headers: { 'x-admin-secret': secret } }),
  activity: (secret) => request('/admin/activity', { headers: { 'x-admin-secret': secret } }),
};
