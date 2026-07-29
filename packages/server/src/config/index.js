import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env.NODE_ENV || 'development';
const fileName = env === 'production' ? 'prod.json' : 'dev.json';
const base = JSON.parse(fs.readFileSync(path.join(__dirname, fileName), 'utf-8'));

export const config = {
  env,
  port: Number(process.env.PORT) || base.port,
  databasePath: process.env.DATABASE_PATH || base.databasePath,
  botToken: process.env.BOT_TOKEN || '',
  adminToken: process.env.ADMIN_TOKEN || 'change_me',
  webAppUrl: process.env.WEBAPP_URL || '',
  animationStudioEnabled:
    env !== 'production' || process.env.ANIMATION_STUDIO_ENABLED === 'true',
};
