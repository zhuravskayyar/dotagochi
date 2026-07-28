import { Telegraf } from 'telegraf';
import { config } from '../config/index.js';
import { registerCommands } from './commands.js';

let bot = null;

export function startBot() {
  if (!config.botToken) {
    console.warn('[bot] BOT_TOKEN не задан — бот не запущен (это нормально для локальной разработки)');
    return null;
  }

  bot = new Telegraf(config.botToken);
  registerCommands(bot);

  bot.launch();
  console.log('[bot] Telegram bot started');
  return bot;
}

export function getBot() {
  return bot;
}
