import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config/index.js';
import { adminAuth } from '../../middlewares/adminAuth.js';
import { animationStudioController } from './animation-studio.controller.js';

const uploadDir = path.join(os.tmpdir(), 'dotagochi-animation-studio');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const acceptedFields = new Set(['idle', 'image', 'sleep', 'wake']);
const upload = multer({
  storage,
  limits: {
    files: 4,
    fileSize: 200 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!acceptedFields.has(file.fieldname)) {
      callback(new Error(`Невідоме поле файлу: ${file.fieldname}`));
      return;
    }
    const isImage = file.fieldname === 'image';
    const validType = isImage
      ? file.mimetype.startsWith('image/')
      : (
          file.mimetype.startsWith('video/')
          || file.mimetype === 'application/octet-stream'
        );
    callback(
      validType ? null : new Error(`Непідтримуваний тип: ${file.mimetype}`),
      validType,
    );
  },
});

function animationStudioAccess(req, res, next) {
  if (config.animationStudioEnabled && config.env !== 'production') {
    next();
    return;
  }
  if (!config.animationStudioEnabled) {
    res.status(404).json({ error: 'Animation Studio вимкнено.' });
    return;
  }
  adminAuth(req, res, next);
}

export const animationStudioRoutes = Router();

animationStudioRoutes.use(animationStudioAccess);
animationStudioRoutes.get('/heroes', animationStudioController.listHeroes);
animationStudioRoutes.patch(
  '/heroes/:hero/status',
  animationStudioController.setCompleted,
);
animationStudioRoutes.post('/git/push', animationStudioController.pushHero);
animationStudioRoutes.post('/git/pull', animationStudioController.pullChanges);
animationStudioRoutes.get('/github/status', animationStudioController.githubStatus);
animationStudioRoutes.post('/github/connect', animationStudioController.connectGithub);
animationStudioRoutes.post(
  '/heroes/:hero/import',
  upload.fields([
    { name: 'idle', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'sleep', maxCount: 1 },
    { name: 'wake', maxCount: 1 },
  ]),
  animationStudioController.importFiles,
);
