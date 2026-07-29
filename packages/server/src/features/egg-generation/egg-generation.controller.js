import { eggGenerationService } from './egg-generation.service.js';

export const eggGenerationController = {
  getStatus(req, res) {
    res.json(eggGenerationService.getStatus(req.params.userId));
  },
  generate(req, res) {
    res.json(eggGenerationService.generate(req.params.userId));
  },
};
