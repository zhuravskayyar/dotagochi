import { heroRebirthService } from './hero-rebirth.service.js';

export const heroRebirthController = {
  getStatus(req, res) {
    res.json(heroRebirthService.getStatus(req.params.userId));
  },
  rebirth(req, res, next) {
    try {
      res.json(heroRebirthService.rebirth(req.params.userId));
    } catch (err) {
      next(err);
    }
  },
};
