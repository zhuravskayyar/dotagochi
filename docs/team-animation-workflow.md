# Спільна робота з Animation Studio

GitHub-репозиторій є джерелом правди для анімацій. Кожен герой зберігає свої
асети, маніфест і журнал роботи у власній папці:

```text
packages/client/public/assets/heroes/<hero_slug>/
├── animation.json
├── work.json
├── idle-chroma-v1.mp4
├── sprite-v1.png
├── sleep-chroma-v1.mp4
└── wake-chroma-v1.mp4
```

`work.json` створюється після імпорту або ручної відмітки у Studio. Це дозволяє
різним людям працювати над різними героями без конфлікту в одному файлі.

## Перший запуск на Linux

Потрібні Node.js 18+, npm, Git і FFmpeg. Для Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y git ffmpeg
git clone https://github.com/zhuravskayyar/dotagochi.git
cd dotagochi
chmod +x start-app.sh
./start-app.sh
```

Launcher встановить npm-залежності, перебудує каталог анімацій, запустить
client/server та відкриє Animation Studio.

## Робочий цикл співробітника

Перед початком:

```bash
git switch main
git pull --rebase origin main
./start-app.sh
```

Після імпорту героя через Studio:

```bash
npm test
git status
git add packages/client/public/assets/heroes/<hero_slug>
git add packages/client/src/features/pet/hero-animations.json
git commit -m "Add <Hero> animation"
git push origin main
```

Після push інша людина виконує:

```bash
git pull --rebase origin main
npm run sync:animations
```

Після оновлення герой одразу з'явиться у списку виконаних та у Tamagotchi
preview. Windows-ярлик і Linux-launcher запускають `sync:animations`
автоматично.

## Перевірка каталогу

```bash
npm run sync:animations
npm run sync:animations -- --check
```

Каталог `hero-animations.json` генерується з усіх
`assets/heroes/*/animation.json`. Тому додані з іншого комп'ютера папки
автоматично підхоплюються після `git pull`.
