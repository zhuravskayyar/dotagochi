import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  importHeroAnimation,
  validateHeroSlug,
} from '../../../../../scripts/import-hero-animation.mjs';

const featureDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(featureDir, '../../../../..');
const heroesFile = path.join(
  projectRoot,
  'packages/server/src/data/dota-heroes.json',
);
const registryFile = path.join(
  projectRoot,
  'packages/client/src/features/pet/hero-animations.json',
);
const heroesRoot = path.join(
  projectRoot,
  'packages/client/public/assets/heroes',
);
const progressFile = path.join(
  projectRoot,
  'packages/server/src/data/hero-animation-progress.json',
);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assetFileName(assetPath) {
  if (!assetPath) return null;
  return path.posix.basename(assetPath.split('?')[0]);
}

function legacyWorkFromAnimation(animation, progressEntry) {
  if (!animation) return null;
  const versionMatch = animation.src?.match(/-v(\d+)\.[a-z0-9]+(?:\?|$)/i);
  return {
    importedAt: progressEntry.updatedAt || null,
    version: versionMatch ? Number.parseInt(versionMatch[1], 10) : 1,
    chromaKey: null,
    aspectRatio: animation.aspectRatio || 1,
    files: {
      idle: assetFileName(animation.src),
      image: assetFileName(animation.fallbackSrc),
      sleep: assetFileName(animation.sleepSrc),
      wake: assetFileName(animation.wakeSrc),
    },
    assets: animation,
    legacy: true,
  };
}

export function mergeHeroStatuses(heroes, registry, progress) {
  return heroes.map((hero) => {
    const animation = registry[hero.slug] || null;
    const progressEntry = progress[hero.slug] || {};
    const work = progressEntry.work
      || legacyWorkFromAnimation(animation, progressEntry);
    const history = Array.isArray(progressEntry.history)
      ? progressEntry.history
      : (work ? [work] : []);
    const completed = hasOwn(progressEntry, 'completed')
      ? Boolean(progressEntry.completed)
      : Boolean(animation);

    return {
      id: hero.id,
      slug: hero.slug,
      name: hero.name,
      portrait: hero.portrait,
      completed,
      updatedAt: progressEntry.updatedAt || null,
      work,
      history,
      animation,
    };
  });
}

async function loadStudioState() {
  const [heroes, registry, legacyProgress] = await Promise.all([
    readJson(heroesFile, []),
    readJson(registryFile, {}),
    readJson(progressFile, {}),
  ]);
  const perHeroEntries = await Promise.all(
    heroes.map(async (hero) => {
      const workFile = path.join(heroesRoot, hero.slug, 'work.json');
      return [hero.slug, await readJson(workFile, null)];
    }),
  );
  const perHeroProgress = Object.fromEntries(
    perHeroEntries.filter(([, entry]) => entry),
  );
  const progress = { ...legacyProgress, ...perHeroProgress };
  return { heroes, registry, progress };
}

async function ensureHero(heroSlug, heroes) {
  const slug = validateHeroSlug(heroSlug);
  const hero = heroes.find((item) => item.slug === slug);
  if (!hero) {
    const error = new Error(`Героя ${slug} немає в каталозі Dota 2.`);
    error.status = 404;
    throw error;
  }
  return hero;
}

async function updateProgress(hero, completed, existingProgress, work = null) {
  const previousEntry = existingProgress[hero.slug] || {};
  const updatedAt = new Date().toISOString();
  const nextEntry = {
    ...previousEntry,
    completed: Boolean(completed),
    updatedAt,
  };
  if (work) {
    const history = Array.isArray(previousEntry.history)
      ? previousEntry.history
      : [];
    nextEntry.work = work;
    nextEntry.history = [work, ...history].slice(0, 20);
  }

  const nextProgress = {
    ...existingProgress,
    [hero.slug]: nextEntry,
  };
  await writeJson(
    path.join(heroesRoot, hero.slug, 'work.json'),
    nextEntry,
  );
  return nextProgress;
}

export const animationStudioService = {
  async listHeroes() {
    const { heroes, registry, progress } = await loadStudioState();
    return mergeHeroStatuses(heroes, registry, progress);
  },

  async setCompleted(heroSlug, completed) {
    const { heroes, registry, progress } = await loadStudioState();
    const hero = await ensureHero(heroSlug, heroes);
    const nextProgress = await updateProgress(hero, completed, progress);
    return mergeHeroStatuses([hero], registry, nextProgress)[0];
  },

  async importFiles(heroSlug, files, fields) {
    const { heroes, progress } = await loadStudioState();
    const hero = await ensureHero(heroSlug, heroes);
    const idle = files.idle?.[0];
    if (!idle) {
      const error = new Error('Потрібно вибрати idle-відео.');
      error.status = 400;
      throw error;
    }

    const result = await importHeroAnimation({
      hero: hero.slug,
      video: idle.path,
      image: files.image?.[0]?.path,
      sleep: files.sleep?.[0]?.path,
      wake: files.wake?.[0]?.path,
      version: fields.version || '1',
      frame: fields.frame || '0',
      key: fields.key || 'auto',
      similarity: fields.similarity || '0.20',
      blend: fields.blend || '0.08',
      force: true,
      'no-chroma': fields.noChroma === 'true',
    });

    const importedAt = new Date().toISOString();
    const work = {
      importedAt,
      version: Number.parseInt(fields.version || '1', 10),
      chromaKey: result.key,
      aspectRatio: result.entry.aspectRatio,
      files: {
        idle: idle.originalname,
        image: files.image?.[0]?.originalname || null,
        sleep: files.sleep?.[0]?.originalname || null,
        wake: files.wake?.[0]?.originalname || null,
      },
      assets: result.entry,
    };
    const nextProgress = await updateProgress(hero, true, progress, work);
    return {
      ...mergeHeroStatuses(
        [hero],
        { [hero.slug]: result.entry },
        nextProgress,
      )[0],
      chromaKey: result.key,
    };
  },
};
