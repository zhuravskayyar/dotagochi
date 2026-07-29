import { apiClient } from '../../shared/api/apiClient.js';

// Заглушка: генерация яйца питомца
export const eggGenerationApi = {
  getStatus: (userId) => apiClient.get(`/egg-generation/${userId}`),
  hatch: (userId) => apiClient.post(`/egg-generation/${userId}`),
  generate: (userId) => apiClient.post(`/egg-generation/${userId}`),
};
