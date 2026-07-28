import { config } from '../config/index.js';

export function registerCommands(bot) {
  bot.start((ctx) => {
    ctx.reply(
      'Привет! Открой своего Dota-питомца в Mini App 👇',
      config.webAppUrl
        ? { reply_markup: { inline_keyboard: [[{ text: 'Открыть', web_app: { url: config.webAppUrl } }]] } }
        : undefined
    );
  });

  bot.help((ctx) => ctx.reply('Доступные команды: /start'));
}
