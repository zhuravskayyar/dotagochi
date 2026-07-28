import { db } from '../connection.js';

export const Pet = {
  findByUserId(userId) {
    return db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
  },

  createForUser(userId) {
    db.prepare('INSERT INTO pets (user_id) VALUES (?)').run(userId);
    return Pet.findByUserId(userId);
  },

  findOrCreate(userId) {
    return Pet.findByUserId(userId) || Pet.createForUser(userId);
  },

  update(userId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return Pet.findByUserId(userId);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    db.prepare(`UPDATE pets SET ${setClause}, updated_at = datetime('now') WHERE user_id = ?`)
      .run(...values, userId);
    return Pet.findByUserId(userId);
  },
};
