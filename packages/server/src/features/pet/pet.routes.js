import { Router } from 'express';
import { petController } from './pet.controller.js';

export const petRoutes = Router();

petRoutes.get('/:userId', petController.getPet);
petRoutes.post('/:userId/feed', petController.feed);
petRoutes.post('/:userId/play', petController.play);
petRoutes.post('/:userId/train', petController.train);
petRoutes.post('/:userId/heal', petController.heal);
petRoutes.post('/:userId/sleep', petController.sleep);
petRoutes.post('/:userId/quest', petController.quest);
