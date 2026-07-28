import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  );
`);

const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  console.log(`[migrate] applying ${file}`);
  db.exec(sql);
  db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
}

console.log('[migrate] done');
