import fs from 'node:fs/promises';
import { animationStudioService } from './animation-studio.service.js';

function uploadedPaths(files = {}) {
  return Object.values(files)
    .flat()
    .map((file) => file.path)
    .filter(Boolean);
}

async function cleanupUploads(files) {
  await Promise.allSettled(
    uploadedPaths(files).map((file) => fs.rm(file, { force: true })),
  );
}

export const animationStudioController = {
  async listHeroes(req, res, next) {
    try {
      res.json({ heroes: await animationStudioService.listHeroes() });
    } catch (error) {
      next(error);
    }
  },

  async setCompleted(req, res, next) {
    try {
      if (typeof req.body.completed !== 'boolean') {
        return res.status(400).json({ error: 'completed має бути boolean.' });
      }
      const hero = await animationStudioService.setCompleted(
        req.params.hero,
        req.body.completed,
      );
      res.json({ hero });
    } catch (error) {
      next(error);
    }
  },

  async importFiles(req, res, next) {
    try {
      const hero = await animationStudioService.importFiles(
        req.params.hero,
        req.files || {},
        req.body || {},
      );
      res.json({ hero });
    } catch (error) {
      next(error);
    } finally {
      await cleanupUploads(req.files);
    }
  },
};
