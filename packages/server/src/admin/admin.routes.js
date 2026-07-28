import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth.js';
import { adminController } from './admin.controller.js';

export const adminRoutes = Router();

adminRoutes.use(adminAuth);
adminRoutes.get('/pets', adminController.listPets);
