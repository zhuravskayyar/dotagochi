import { Router } from 'express';
import { eggGenerationController } from './egg-generation.controller.js';

export const eggGenerationRoutes = Router();

eggGenerationRoutes.get('/:userId', eggGenerationController.getStatus);
eggGenerationRoutes.post('/:userId', eggGenerationController.generate);
