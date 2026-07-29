import { useState, useEffect } from 'react';
import { notificationsApi } from './notificationsApi.js';

export function useNotifications(userId) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    notificationsApi.getSettings(userId).then(setSettings).catch(() => setSettings(null));
  }, [userId]);

  const updateSettings = async (values) => {
    const next = await notificationsApi.updateSettings(userId, values);
    setSettings(next);
    return next;
  };

  return { settings, setSettings, updateSettings };
}
