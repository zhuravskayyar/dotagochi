const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}/animation-studio${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `API error ${response.status}`);
  }
  return payload;
}

export const animationStudioApi = {
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
};
