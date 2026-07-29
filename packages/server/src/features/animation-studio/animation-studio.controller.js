import fs from 'node:fs/promises';
import { animationStudioService } from './animation-studio.service.js';
import { gitSyncService } from './git-sync.service.js';
import { githubAuthService } from './github-auth.service.js';

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

  async pushHero(req, res, next) {
    try {
      const heroes = await animationStudioService.listHeroes();
      const hero = heroes.find((item) => item.slug === req.body?.hero);
      if (!hero) {
        return res.status(404).json({ error: 'Героя не знайдено.' });
      }
      res.json(await gitSyncService.pushHero(hero.slug, hero.name));
    } catch (error) {
      next(error);
    }
  },

  async pullChanges(req, res, next) {
    try {
      res.json(await gitSyncService.pullChanges());
    } catch (error) {
      next(error);
    }
  },

  async githubStatus(req, res, next) {
    try {
      res.json(await githubAuthService.status());
    } catch (error) {
      next(error);
    }
  },

  async connectGithub(req, res, next) {
    try {
      res.json(await githubAuthService.connect());
    } catch (error) {
      next(error);
    }
  },
};
