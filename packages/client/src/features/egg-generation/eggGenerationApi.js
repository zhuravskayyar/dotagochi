import { apiClient } from '../../shared/api/apiClient.js';

// Заглушка: генерация яйца питомца
export const eggGenerationApi = {
  generate: (userId) => apiClient.post(`/egg-generation/${userId}`),
};
