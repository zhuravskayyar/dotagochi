import { eggGenerationService } from './egg-generation.service.js';

export const eggGenerationController = {
  generate(req, res) {
    res.json(eggGenerationService.generate(req.params.userId));
  },
};
