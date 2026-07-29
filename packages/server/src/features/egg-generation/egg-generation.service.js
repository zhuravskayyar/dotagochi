import { randomInt } from 'crypto';
import { Pet } from '../../database/models/Pet.js';
import { TAMAGOTCHI_TIMINGS } from '../pet/tamagotchi-timings.js';
import { getHeroCatalog } from './hero-catalog.js';

function eggStatus(pet, now = Date.now()) {
  const startedAt = Number(pet.stage_started_at_ms) || now;
  const hatchAt = startedAt + TAMAGOTCHI_TIMINGS.eggHatchMs;
  return {
    stage: pet.life_stage,
    hatchAt,
    remainingMs: Math.max(0, hatchAt - now),
    ready: now >= hatchAt,
    hero: pet.hero_id ? {
      id: pet.hero_id,
      slug: pet.hero_slug,
      name: pet.hero_name,
    } : null,
  };
}

export const eggGenerationService = {
  getStatus(userId) {
    return eggStatus(Pet.findOrCreate(userId));
  },

  generate(userId, now = Date.now()) {
    const pet = Pet.findOrCreate(userId);
    if (pet.life_stage !== 'egg') {
      return { pet, ...eggStatus(pet, now) };
    }

    const status = eggStatus(pet, now);
    if (!status.ready) {
      const error = new Error('Яйце ще не готове до вилуплення');
      error.status = 409;
      error.details = status;
      throw error;
    }

    const heroes = getHeroCatalog();
    const hero = heroes[randomInt(heroes.length)];
    const hatchedPet = Pet.update(userId, {
      name: hero.name,
      hero_id: hero.id,
      hero_slug: hero.slug,
      hero_name: hero.name,
      life_stage: 'baby',
      stage_started_at_ms: now,
      hatched_at_ms: now,
      last_update_ms: now,
      hunger: 100,
      health: 100,
      mood: 100,
      energy: 100,
      critical_since_ms: null,
    });

    return {
      pet: hatchedPet,
      stage: 'baby',
      hero,
      message: `Із яйця випав герой: ${hero.name}`,
    };
  },
};
