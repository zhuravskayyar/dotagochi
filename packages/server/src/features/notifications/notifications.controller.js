import { notificationsService } from './notifications.service.js';

export const notificationsController = {
  getSettings(req, res) {
    res.json(notificationsService.getSettings(req.params.userId));
  },
  updateSettings(req, res) {
    res.json(notificationsService.updateSettings(req.params.userId, req.body));
  },
};
