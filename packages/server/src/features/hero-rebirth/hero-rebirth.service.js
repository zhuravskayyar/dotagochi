import { Pet } from '../../database/models/Pet.js';

// Заглушка бизнес-логики перерождения героя
export const heroRebirthService = {
  getStatus(userId) {
    const pet = Pet.findOrCreate(userId);
    return { heroLevel: pet.hero_level, canRebirth: pet.happiness >= 100 };
  },

  rebirth(userId) {
    const pet = Pet.findOrCreate(userId);
    if (pet.happiness < 100) {
      const err = new Error('Питомец недостаточно счастлив для перерождения');
      err.status = 400;
      throw err;
    }
    return Pet.update(userId, { hero_level: pet.hero_level + 1, happiness: 50 });
  },
};
