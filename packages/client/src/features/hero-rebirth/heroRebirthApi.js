import { apiClient } from '../../shared/api/apiClient.js';

// Заглушка: перерождение героя (Dota-style rebirth mechanic)
export const heroRebirthApi = {
  getStatus: (userId) => apiClient.get(`/hero-rebirth/${userId}`),
  triggerRebirth: (userId) => apiClient.post(`/hero-rebirth/${userId}/rebirth`),
};
