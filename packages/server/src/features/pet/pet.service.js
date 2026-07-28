import { Pet } from '../../database/models/Pet.js';

const clamp = (value) => Math.max(0, Math.min(100, value));
const TICK_MS = 30_000;

function applyDecay(pet) {
  const now = Date.now();
  const lastUpdate = Number(pet.last_update_ms) || now;
  const ticks = Math.floor((now - lastUpdate) / TICK_MS);

  if (ticks < 1) return pet;

  const next = { ...pet };
  for (let tick = 0; tick < ticks; tick += 1) {
    if (next.is_sleeping) {
      next.energy = clamp(next.energy + 2);
      next.hunger = clamp(next.hunger - 1);
    } else {
      next.hunger = clamp(next.hunger - 2);
      next.energy = clamp(next.energy - 1);
      next.mood = clamp(next.mood - 1);
      if (next.hunger < 20) next.health = clamp(next.health - 1);
    }
  }

  next.last_update_ms = lastUpdate + ticks * TICK_MS;
  return Pet.update(pet.user_id, {
    hunger: next.hunger,
    health: next.health,
    mood: next.mood,
    energy: next.energy,
    is_sleeping: next.is_sleeping,
    last_update_ms: next.last_update_ms,
  });
}

function update(userId, fields) {
  applyDecay(Pet.findOrCreate(userId));
  return Pet.update(userId, { ...fields, last_update_ms: Date.now() });
}

function result(pet, message) {
  return { pet, message };
}

export const petService = {
  getPet(userId) {
    return applyDecay(Pet.findOrCreate(userId));
  },

  feed(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.is_sleeping) return result(pet, 'Keeper спить');
    if (pet.hunger >= 95) return result(pet, 'Keeper вже ситий');
    if (pet.gold < 5) return result(pet, 'Недостатньо золота');
    return result(update(userId, {
      hunger: clamp(pet.hunger + 25),
      mood: clamp(pet.mood + 5),
      gold: pet.gold - 5,
    }), 'Ситість +25, золото -5');
  },

  play(userId) {
    return this.train(userId);
  },

  train(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.is_sleeping) return result(pet, 'Keeper спить');
    if (pet.energy < 20) return result(pet, 'Keeper надто втомлений');
    const xp = pet.xp + 15;
    const levelUp = xp >= 100;
    return result(update(userId, {
      energy: pet.energy - 20,
      hunger: clamp(pet.hunger - 10),
      mood: clamp(pet.mood + 8),
      xp: levelUp ? xp - 100 : xp,
      hero_level: levelUp ? pet.hero_level + 1 : pet.hero_level,
      ...(levelUp ? { health: 100, mood: 100 } : {}),
    }), levelUp ? `Новий рівень: ${pet.hero_level + 1}` : 'Досвід +15, енергія -20');
  },

  heal(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.is_sleeping) return result(pet, 'Keeper спить');
    if (pet.health >= 95) return result(pet, 'Keeper вже здоровий');
    if (pet.gold < 10) return result(pet, 'Недостатньо золота');
    return result(update(userId, { health: clamp(pet.health + 30), gold: pet.gold - 10 }), 'Здоров’я +30, золото -10');
  },

  sleep(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.is_sleeping) {
      return result(update(userId, { is_sleeping: 0, energy: clamp(pet.energy + 40) }), 'Keeper прокинувся, енергія +40');
    }
    return result(update(userId, { is_sleeping: 1 }), 'Keeper заснув');
  },

  quest(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.is_sleeping) return result(pet, 'Keeper спить');
    if (pet.energy < 30 || pet.hunger < 20) return result(pet, 'Keeper не готовий до квесту');
    const xp = pet.xp + 25;
    const levelUp = xp >= 100;
    return result(update(userId, {
      energy: pet.energy - 25,
      hunger: clamp(pet.hunger - 15),
      mood: clamp(pet.mood + 15),
      gold: pet.gold + 20,
      xp: levelUp ? xp - 100 : xp,
      hero_level: levelUp ? pet.hero_level + 1 : pet.hero_level,
      ...(levelUp ? { health: 100, mood: 100 } : {}),
    }), levelUp ? `Новий рівень: ${pet.hero_level + 1}` : 'Досвід +25, золото +20');
  },
};
