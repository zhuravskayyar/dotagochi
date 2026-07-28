import { Router } from 'express';
import { heroRebirthController } from './hero-rebirth.controller.js';

export const heroRebirthRoutes = Router();

heroRebirthRoutes.get('/:userId', heroRebirthController.getStatus);
heroRebirthRoutes.post('/:userId/rebirth', heroRebirthController.rebirth);
