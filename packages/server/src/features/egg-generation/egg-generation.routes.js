import { Router } from 'express';
import { eggGenerationController } from './egg-generation.controller.js';

export const eggGenerationRoutes = Router();

eggGenerationRoutes.post('/:userId', eggGenerationController.generate);
