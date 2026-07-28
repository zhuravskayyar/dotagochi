import { apiClient } from '../../shared/api/apiClient.js';

export const petApi = {
  getPet: (userId) => apiClient.get(`/pet/${userId}`),
  feed: (userId) => apiClient.post(`/pet/${userId}/feed`),
  play: (userId) => apiClient.post(`/pet/${userId}/play`),
  train: (userId) => apiClient.post(`/pet/${userId}/train`),
  heal: (userId) => apiClient.post(`/pet/${userId}/heal`),
  sleep: (userId) => apiClient.post(`/pet/${userId}/sleep`),
  quest: (userId) => apiClient.post(`/pet/${userId}/quest`),
};
