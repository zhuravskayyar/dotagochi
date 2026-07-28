import cron from 'node-cron';
import { db } from '../../database/connection.js';

// Каждый час напоминаем пользователям с включёнными уведомлениями покормить питомца
export function startNotificationCron() {
  cron.schedule('0 * * * *', () => {
    const rows = db
      .prepare(
        `SELECT p.user_id FROM pets p
         JOIN notification_settings n ON n.user_id = p.user_id
         WHERE n.feed_reminders = 1 AND p.hunger < 40`
      )
      .all();

    for (const row of rows) {
      console.log(`[cron] TODO: отправить уведомление пользователю ${row.user_id}`);
    }
  });

  console.log('[cron] notification cron scheduled');
}
