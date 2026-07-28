import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';

export const notificationsRoutes = Router();

notificationsRoutes.get('/:userId', notificationsController.getSettings);
notificationsRoutes.post('/:userId', notificationsController.updateSettings);
