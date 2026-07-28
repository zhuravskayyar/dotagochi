import { petService } from './pet.service.js';

export const petController = {
  getPet(req, res) {
    const pet = petService.getPet(req.params.userId);
    res.json(pet);
  },

  feed(req, res) {
    const pet = petService.feed(req.params.userId);
    res.json(pet);
  },

  play(req, res) {
    const pet = petService.play(req.params.userId);
    res.json(pet);
  },
};
