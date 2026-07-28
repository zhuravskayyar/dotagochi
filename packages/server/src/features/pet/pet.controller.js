import { petService } from './pet.service.js';

export const petController = {
  getPet(req, res) {
    const pet = petService.getPet(req.params.userId);
    res.json(pet);
  },

  feed(req, res) {
    res.json(petService.feed(req.params.userId));
  },

  play(req, res) {
    res.json(petService.play(req.params.userId));
  },

  train(req, res) {
    res.json(petService.train(req.params.userId));
  },

  heal(req, res) {
    res.json(petService.heal(req.params.userId));
  },

  sleep(req, res) {
    res.json(petService.sleep(req.params.userId));
  },

  quest(req, res) {
    res.json(petService.quest(req.params.userId));
  },
};
