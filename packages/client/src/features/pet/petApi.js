import { apiClient } from '../../shared/api/apiClient.js';

export const petApi = {
  getPet: (userId) => apiClient.get(`/pet/${userId}`),
  feed: (userId) => apiClient.post(`/pet/${userId}/feed`),
  play: (userId) => apiClient.post(`/pet/${userId}/play`),
};
