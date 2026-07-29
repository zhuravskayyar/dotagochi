import { Pet } from '../../database/models/Pet.js';
import {
  STAGE_NEED_INTERVALS,
  TAMAGOTCHI_TIMINGS,
  stageForAge,
} from './tamagotchi-timings.js';

const clamp = (value) => Math.max(0, Math.min(100, value));

function applyDecay(pet, now = Date.now()) {
  if (pet.life_stage === 'egg') return pet;

  const lastUpdate = Number(pet.last_update_ms) || now;
  const hatchedAt = Number(pet.hatched_at_ms) || lastUpdate;
  const ageMs = Math.max(0, now - hatchedAt);
  const stage = stageForAge(ageMs);
  const next = { ...pet };
  let cursor = lastUpdate;
  let appliedTicks = 0;
  let criticalSince = Number(next.critical_since_ms) || null;

  while (cursor < now) {
    const tickStage = stageForAge(Math.max(0, cursor - hatchedAt));
    const interval = next.is_sleeping
      ? STAGE_NEED_INTERVALS.adult
      : STAGE_NEED_INTERVALS[tickStage];
    if (cursor + interval > now) break;
    cursor += interval;
    appliedTicks += 1;

    if (next.is_sleeping) {
      next.energy = clamp(next.energy + 25);
      next.hunger = clamp(next.hunger - 25);
    } else {
      next.hunger = clamp(next.hunger - 25);
      next.mood = clamp(next.mood - 25);
      next.energy = clamp(next.energy - (tickStage === 'baby' ? 10 : 8));
    }

    if (!criticalSince && (next.hunger === 0 || next.mood === 0 || next.health <= 25)) {
      criticalSince = cursor;
    }

    if (appliedTicks >= 20_000) {
      cursor = now;
      break;
    }
  }

  const becameCritical = next.hunger === 0 || next.mood === 0 || next.health <= 25;
  if (becameCritical && !criticalSince) {
    criticalSince = now;
  } else if (!becameCritical) {
    criticalSince = null;
  }

  let careMistakes = Number(next.care_mistakes) || 0;
  if (criticalSince && now - criticalSince >= TAMAGOTCHI_TIMINGS.careGraceMs) {
    const missedWindows = Math.floor(
      (now - criticalSince) / TAMAGOTCHI_TIMINGS.careGraceMs
    );
    if (missedWindows > 0) {
      careMistakes += missedWindows;
      next.health = clamp(next.health - missedWindows * 10);
      criticalSince += missedWindows * TAMAGOTCHI_TIMINGS.careGraceMs;
    }
  }

  if (appliedTicks < 1 && pet.life_stage === stage && criticalSince === pet.critical_since_ms) {
    return pet;
  }

  next.last_update_ms = cursor;
  return Pet.update(pet.user_id, {
    hunger: next.hunger,
    health: next.health,
    mood: next.mood,
    energy: next.energy,
    is_sleeping: next.is_sleeping,
    last_update_ms: next.last_update_ms,
    life_stage: stage,
    stage_started_at_ms: pet.life_stage === stage
      ? pet.stage_started_at_ms
      : now,
    critical_since_ms: criticalSince,
    care_mistakes: careMistakes,
  });
}

function update(userId, fields) {
  applyDecay(Pet.findOrCreate(userId));
  const next = Pet.update(userId, { ...fields, last_update_ms: Date.now() });
  if (next.hunger > 0 && next.mood > 0 && next.health > 25) {
    return Pet.update(userId, { critical_since_ms: null });
  }
  return next;
}

function result(pet, message) {
  return { pet, message };
}

export const petService = {
  applyDecay,

  getPet(userId) {
    return applyDecay(Pet.findOrCreate(userId));
  },

  feed(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.life_stage === 'egg') return result(pet, 'Яйце ще не вилупилося');
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
    if (pet.life_stage === 'egg') return result(pet, 'Яйце ще не вилупилося');
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
    if (pet.life_stage === 'egg') return result(pet, 'Яйце ще не вилупилося');
    if (pet.is_sleeping) return result(pet, 'Keeper спить');
    if (pet.health >= 95) return result(pet, 'Keeper вже здоровий');
    if (pet.gold < 10) return result(pet, 'Недостатньо золота');
    return result(update(userId, { health: clamp(pet.health + 30), gold: pet.gold - 10 }), 'Здоров’я +30, золото -10');
  },

  sleep(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.life_stage === 'egg') return result(pet, 'Яйце ще не вилупилося');
    if (pet.is_sleeping) {
      return result(update(userId, { is_sleeping: 0, energy: clamp(pet.energy + 40) }), 'Keeper прокинувся, енергія +40');
    }
    return result(update(userId, { is_sleeping: 1 }), 'Keeper заснув');
  },

  quest(userId) {
    const pet = applyDecay(Pet.findOrCreate(userId));
    if (pet.life_stage === 'egg') return result(pet, 'Яйце ще не вилупилося');
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
