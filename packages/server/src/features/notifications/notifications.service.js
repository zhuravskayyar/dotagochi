import { db } from '../../database/connection.js';

const ALERT_COOLDOWN_MS = {
  health: 15 * 60 * 1000,
  hunger: 30 * 60 * 1000,
  mood: 45 * 60 * 1000,
  energy: 60 * 60 * 1000,
};

function getAlert(pet, settings) {
  if (pet.life_stage === 'egg' || pet.is_sleeping) return null;
  if (pet.health <= 25) {
    return {
      kind: 'health',
      text: `🚨 ${pet.hero_name || pet.name}: критичне здоров’я ${pet.health}/100. Потрібне лікування!`,
    };
  }
  if (settings.feed_reminders && pet.hunger <= 25) {
    return {
      kind: 'hunger',
      text: `🍖 ${pet.hero_name || pet.name} дуже голодний: ${pet.hunger}/100.`,
    };
  }
  if (settings.play_reminders && pet.mood <= 25) {
    return {
      kind: 'mood',
      text: `🎮 ${pet.hero_name || pet.name} втрачає настрій: ${pet.mood}/100.`,
    };
  }
  if (settings.play_reminders && pet.energy <= 15) {
    return {
      kind: 'energy',
      text: `🌙 ${pet.hero_name || pet.name} виснажений: ${pet.energy}/100. Час спати.`,
    };
  }
  return null;
}

export const notificationsService = {
  getSettings(userId) {
    const row = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId);
    if (row) return row;
    db.prepare('INSERT INTO notification_settings (user_id) VALUES (?)').run(userId);
    return db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId);
  },

  updateSettings(userId, values) {
    const current = notificationsService.getSettings(userId);
    const next = {
      feedReminders: values.feedReminders ?? current.feed_reminders,
      playReminders: values.playReminders ?? current.play_reminders,
      enabled: values.enabled ?? current.enabled,
      criticalAlerts: values.criticalAlerts ?? current.critical_alerts,
    };
    db.prepare(
      `UPDATE notification_settings
       SET feed_reminders = ?, play_reminders = ?, enabled = ?, critical_alerts = ?
       WHERE user_id = ?`
    ).run(
      Number(!!next.feedReminders),
      Number(!!next.playReminders),
      Number(!!next.enabled),
      Number(!!next.criticalAlerts),
      userId
    );
    return notificationsService.getSettings(userId);
  },

  async sendCriticalAlert(pet, telegram) {
    const settings = notificationsService.getSettings(pet.user_id);

    // This is intentionally checked immediately before send: disabled means no push.
    if (!settings.enabled || !settings.critical_alerts || !telegram) return false;

    const alert = getAlert(pet, settings);
    if (!alert) {
      db.prepare('DELETE FROM notification_events WHERE user_id = ?').run(pet.user_id);
      return false;
    }

    const previous = db.prepare(
      'SELECT last_sent_ms FROM notification_events WHERE user_id = ? AND kind = ?'
    ).get(pet.user_id, alert.kind);
    const now = Date.now();
    if (previous && now - previous.last_sent_ms < ALERT_COOLDOWN_MS[alert.kind]) {
      return false;
    }

    await telegram.sendMessage(pet.user_id, alert.text);
    db.prepare(
      `INSERT INTO notification_events (user_id, kind, last_sent_ms)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, kind) DO UPDATE SET last_sent_ms = excluded.last_sent_ms`
    ).run(pet.user_id, alert.kind, now);
    return true;
  },
};
