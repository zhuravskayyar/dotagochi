import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(__dirname, '../../data/dota-heroes.json');

let cachedHeroes;

export function getHeroCatalog() {
  if (!cachedHeroes) {
    cachedHeroes = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }
  return cachedHeroes;
}
