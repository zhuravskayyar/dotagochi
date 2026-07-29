# Інструменти даних Dota 2

## Синхронізація героїв

```bash
npm run sync:heroes
```

Скрипт `sync-dota-heroes.js`:

- читає актуальний список з офіційного Dota 2 Datafeed;
- оновлює серверний каталог `src/data/dota-heroes.json`;
- створює окрему папку `public/assets/heroes/<hero_slug>` для кожного героя;
- записує в кожну папку `hero.json` і завантажує `portrait.png`;
- повторно не завантажує портрети, які вже існують.

Якщо потрібні лише метадані та структура папок:

```bash
node packages/server/src/tools/sync-dota-heroes.js --metadata-only
```
