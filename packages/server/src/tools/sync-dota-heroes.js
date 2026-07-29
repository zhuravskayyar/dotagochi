import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../../');
const serverDataFile = path.join(
  projectRoot,
  'packages/server/src/data/dota-heroes.json'
);
const clientHeroesRoot = path.join(
  projectRoot,
  'packages/client/public/assets/heroes'
);
const clientIndexFile = path.join(clientHeroesRoot, 'heroes.json');
const HEROES_ENDPOINT = 'https://www.dota2.com/datafeed/herolist?language=english';
const PORTRAIT_ROOT =
  'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes';

function slugFromInternalName(name) {
  return name.replace(/^npc_dota_hero_/, '');
}

function normalizeHero(hero) {
  const slug = slugFromInternalName(hero.name);
  return {
    id: hero.id,
    slug,
    internalName: hero.name,
    name: hero.name_english_loc || hero.name_loc,
    primaryAttribute: hero.primary_attr,
    complexity: hero.complexity,
    portrait: `/assets/heroes/${slug}/portrait.png`,
  };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function downloadPortrait(hero) {
  const destination = path.join(clientHeroesRoot, hero.slug, 'portrait.png');
  try {
    await fs.access(destination);
    return 'cached';
  } catch {
    // Continue with the download.
  }

  const response = await fetch(`${PORTRAIT_ROOT}/${hero.slug}.png`);
  if (!response.ok) {
    throw new Error(`portrait ${hero.slug}: HTTP ${response.status}`);
  }
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return 'downloaded';
}

async function main() {
  const metadataOnly = process.argv.includes('--metadata-only');
  const response = await fetch(HEROES_ENDPOINT, {
    headers: { 'user-agent': 'Dota-Tamagotchi-Hero-Sync/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Dota 2 Datafeed returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const sourceHeroes = payload?.result?.data?.heroes;
  if (!Array.isArray(sourceHeroes) || sourceHeroes.length < 100) {
    throw new Error('Dota 2 Datafeed returned an invalid hero list');
  }

  const heroes = sourceHeroes
    .map(normalizeHero)
    .sort((a, b) => a.id - b.id);

  await writeJson(serverDataFile, heroes);
  await writeJson(clientIndexFile, heroes);

  for (const hero of heroes) {
    const heroDir = path.join(clientHeroesRoot, hero.slug);
    await fs.mkdir(heroDir, { recursive: true });
    await writeJson(path.join(heroDir, 'hero.json'), hero);
  }

  if (!metadataOnly) {
    const queue = [...heroes];
    const failures = [];
    const workers = Array.from({ length: 8 }, async () => {
      while (queue.length > 0) {
        const hero = queue.shift();
        try {
          await downloadPortrait(hero);
        } catch (error) {
          failures.push(error.message);
        }
      }
    });
    await Promise.all(workers);
    if (failures.length > 0) {
      console.warn(`[heroes] ${failures.length} portraits were not downloaded`);
      failures.forEach((failure) => console.warn(`[heroes] ${failure}`));
    }
  }

  console.log(
    `[heroes] synced ${heroes.length} heroes into ${clientHeroesRoot}`
  );
}

main().catch((error) => {
  console.error(`[heroes] sync failed: ${error.message}`);
  process.exitCode = 1;
});
