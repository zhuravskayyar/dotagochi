import { config } from '../config/index.js';

export function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== config.adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
