import { apiClient } from '../../shared/api/apiClient.js';

export const notificationsApi = {
  getSettings: (userId) => apiClient.get(`/notifications/${userId}`),
  updateSettings: (userId, settings) => apiClient.post(`/notifications/${userId}`, settings),
};
