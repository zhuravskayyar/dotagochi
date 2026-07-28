import { db } from '../database/connection.js';

export const adminController = {
  listPets(req, res) {
    const pets = db.prepare('SELECT * FROM pets ORDER BY created_at DESC LIMIT 100').all();
    res.json(pets);
  },
};
