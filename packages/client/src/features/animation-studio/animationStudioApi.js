const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ACCESS_TOKEN_KEY = 'dota-studio-access-token';

function getAccessToken() {
  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function setAccessToken(token) {
  try {
    if (token) window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Requests still work in browsers that disable session storage.
  }
}

async function request(path, options = {}) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}/animation-studio${path}`, {
    ...options,
    headers: {
      ...(token ? { 'x-admin-token': token } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || `API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const animationStudioApi = {
  getAccessToken,
  setAccessToken,

  listHeroes() {
    return request('/heroes');
  },

  setCompleted(hero, completed) {
    return request(`/heroes/${hero}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
  },

  importAnimation(hero, formData) {
    return request(`/heroes/${hero}/import`, {
      method: 'POST',
      body: formData,
    });
  },

  pushHero(hero) {
    return request('/git/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero }),
    });
  },

  pullChanges() {
    return request('/git/pull', {
      method: 'POST',
    });
  },

  githubStatus() {
    return request('/github/status');
  },

  connectGithub() {
    return request('/github/connect', {
      method: 'POST',
    });
  },
};
