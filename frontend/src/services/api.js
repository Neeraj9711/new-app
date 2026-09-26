const PRODUCTION_API_URL = 'https://new-app-7cvj.onrender.com/api';

function getBaseUrl() {
  // Same-origin /api when UI is served by the backend (Render).
  // Override with VITE_API_URL for local or split hosting.
  return import.meta.env.VITE_API_URL || (import.meta.env.DEV ? PRODUCTION_API_URL : '/api');
}

async function request(path, options = {}) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status}`);
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
