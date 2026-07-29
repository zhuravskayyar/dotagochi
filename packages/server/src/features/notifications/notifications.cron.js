import cron from 'node-cron';
import { db } from '../../database/connection.js';
import { getBot } from '../../bot/bot.js';
import { petService } from '../pet/pet.service.js';
import { notificationsService } from './notifications.service.js';

export async function scanCriticalNotifications() {
  const bot = getBot();
  if (!bot) return 0;

  const rows = db
    .prepare(
      `SELECT p.user_id
       FROM pets p
       JOIN notification_settings n ON n.user_id = p.user_id
       WHERE n.enabled = 1 AND n.critical_alerts = 1`
    )
    .all();

  let sent = 0;
  for (const row of rows) {
    try {
      const pet = petService.getPet(row.user_id);
      if (await notificationsService.sendCriticalAlert(pet, bot.telegram)) sent += 1;
    } catch (error) {
      console.warn(`[cron] push failed for ${row.user_id}: ${error.message}`);
    }
  }
  return sent;
}

export function startNotificationCron() {
  cron.schedule('* * * * *', scanCriticalNotifications);
  console.log('[cron] critical notification scan scheduled every minute');
}
