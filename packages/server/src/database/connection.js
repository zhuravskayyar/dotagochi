import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.isAbsolute(config.databasePath)
  ? config.databasePath
  : path.join(__dirname, '..', '..', config.databasePath.replace(/^\.\/?src\/database\//, ''));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
