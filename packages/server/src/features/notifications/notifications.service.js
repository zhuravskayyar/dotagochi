import { db } from '../../database/connection.js';

export const notificationsService = {
  getSettings(userId) {
    const row = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId);
    if (row) return row;
    db.prepare('INSERT INTO notification_settings (user_id) VALUES (?)').run(userId);
    return db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId);
  },

  updateSettings(userId, { feedReminders, playReminders }) {
    notificationsService.getSettings(userId);
    db.prepare(
      'UPDATE notification_settings SET feed_reminders = ?, play_reminders = ? WHERE user_id = ?'
    ).run(Number(!!feedReminders), Number(!!playReminders), userId);
    return notificationsService.getSettings(userId);
  },
};
