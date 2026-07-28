import { Pet } from '../../database/models/Pet.js';

const clamp = (value) => Math.max(0, Math.min(100, value));

export const petService = {
  getPet(userId) {
    return Pet.findOrCreate(userId);
  },

  feed(userId) {
    const pet = Pet.findOrCreate(userId);
    return Pet.update(userId, { hunger: clamp(pet.hunger + 20) });
  },

  play(userId) {
    const pet = Pet.findOrCreate(userId);
    return Pet.update(userId, {
      happiness: clamp(pet.happiness + 15),
      hunger: clamp(pet.hunger - 5),
    });
  },
};
