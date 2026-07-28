const clamp = (value) => Math.max(0, Math.min(100, value));
const storageKey = (userId) => `ancient-keeper:demo-pet:${userId}`;

const createPet = (userId) => ({
  id: 0,
  user_id: userId,
  name: 'Юзик',
  hunger: 90,
  happiness: 100,
  hero_level: 1,
  health: 100,
  mood: 78,
  energy: 65,
  xp: 15,
  gold: 40,
  is_sleeping: 0,
  last_update_ms: Date.now(),
});

export function loadDemoPet(userId) {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    return stored ? { ...createPet(userId), ...JSON.parse(stored) } : createPet(userId);
  } catch {
    return createPet(userId);
  }
}

function saveDemoPet(userId, pet) {
  const next = { ...pet, user_id: userId, last_update_ms: Date.now() };
  try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch { /* preview still works */ }
  return next;
}

function gainXp(pet, amount) {
  const total = pet.xp + amount;
  if (total < 100) return { ...pet, xp: total, leveledUp: false };
  return {
    ...pet,
    xp: total - 100,
    hero_level: pet.hero_level + 1,
    health: 100,
    mood: 100,
    leveledUp: true,
  };
}

export function runDemoAction(userId, name) {
  const pet = loadDemoPet(userId);
  if (pet.is_sleeping && name !== 'sleep') {
    return { pet, message: 'Keeper спить' };
  }

  let next = { ...pet };
  let message = '';

  switch (name) {
    case 'feed':
      if (pet.hunger >= 95) return { pet, message: 'Keeper уже ситий' };
      if (pet.gold < 5) return { pet, message: 'Недостатньо золота' };
      next = { ...pet, hunger: clamp(pet.hunger + 25), mood: clamp(pet.mood + 5), gold: pet.gold - 5 };
      message = 'Ситість +25, золото -5';
      break;
    case 'train':
    case 'play':
      if (pet.energy < 20) return { pet, message: 'Keeper надто втомлений' };
      next = gainXp({
        ...pet,
        energy: clamp(pet.energy - 20),
        hunger: clamp(pet.hunger - 10),
        mood: clamp(pet.mood + 8),
      }, 15);
      message = next.leveledUp ? `Новий рівень: ${next.hero_level}` : 'Досвід +15, енергія -20';
      break;
    case 'heal':
      if (pet.health >= 95) return { pet, message: 'Keeper уже здоровий' };
      if (pet.gold < 10) return { pet, message: 'Недостатньо золота' };
      next = { ...pet, health: clamp(pet.health + 30), gold: pet.gold - 10 };
      message = 'Здоров’я +30, золото -10';
      break;
    case 'sleep':
      next = pet.is_sleeping
        ? { ...pet, is_sleeping: 0, energy: clamp(pet.energy + 40) }
        : { ...pet, is_sleeping: 1 };
      message = pet.is_sleeping ? 'Keeper прокинувся, енергія +40' : 'Keeper заснув';
      break;
    case 'quest':
      if (pet.energy < 30 || pet.hunger < 20) return { pet, message: 'Keeper не готовий до квесту' };
      next = gainXp({
        ...pet,
        energy: clamp(pet.energy - 25),
        hunger: clamp(pet.hunger - 15),
        mood: clamp(pet.mood + 15),
        gold: pet.gold + 20,
      }, 25);
      message = next.leveledUp ? `Новий рівень: ${next.hero_level}` : 'Досвід +25, золото +20';
      break;
    default:
      return { pet, message: 'Невідома дія' };
  }

  const persisted = { ...next };
  delete persisted.leveledUp;
  return { pet: saveDemoPet(userId, persisted), message };
}
