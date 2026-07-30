# Dota Tamagotchi — Telegram Mini App

Монорепозиторий: Telegram Mini App (React + Vite) и backend (Express + SQLite),
управляемые как npm workspaces.

## Структура

- `packages/client` — Telegram Mini App на React (Vite)
- `packages/server` — backend: REST API, Telegram-бот, cron-уведомления, админка
- `tests` — тесты для client и server

## Быстрый старт

```bash
npm install
cp .env.example .env   # заполнить BOT_TOKEN и остальные переменные
npm run migrate         # создать таблицы в SQLite
npm run dev              # поднять server (порт 3001) и client (порт 5173) параллельно
```

Client: http://localhost:5173
Server: http://localhost:3001/api/health

## Ярлик Studio для Linux

Відкрийте Terminal у папці для встановлення та виконайте:

```bash
curl -fsSL https://raw.githubusercontent.com/zhuravskayyar/dotagochi/main/install-linux.sh | bash
```

Інсталятор клонує або безпечно оновлює `main`, а ярлик **Dota Tamagotchi Studio**
автоматично з’являється на робочому столі та в меню програм. Під час кожного
запуску він:

- підтягує fast-forward оновлення з GitHub без перезапису локальних змін;
- встановлює відсутні залежності;
- переносить SQLite у `~/.local/share/dota-tamagotchi/`;
- створює резервну копію й застосовує нові міграції;
- перевіряє GitHub-акаунт через офіційний GitHub CLI;
- відкриває Animation Studio.

База, `.env` і GitHub-токени не комітяться в репозиторій. Перед міграціями
зберігаються останні сім резервних копій бази.

Для вже встановленого проєкту ярлик можна створити окремо:

```bash
cd /home/dedyslon/pisun/dota-tamagotchi
chmod +x install-studio-shortcut.sh
./install-studio-shortcut.sh
```

## Локальний тест через ярлик (Windows)

Запустіть `Запуск Dota Tamagotchi.lnk` у корені репозиторію. Ярлик автоматично
встановить усі npm-залежності, запустить відсутні client/server процеси та відкриє
застосунок у браузері. Уже запущені процеси повторно не створюються.

## Скрипты

| Команда            | Описание                                   |
|--------------------|---------------------------------------------|
| `npm run dev`      | client + server в dev-режиме одновременно  |
| `npm run dev:client` | только Vite dev-server                   |
| `npm run dev:server` | только backend с автоперезапуском (nodemon) |
| `npm run build`    | production build клиента                   |
| `npm run lint`     | ESLint для client и server                  |
| `npm run test`     | тесты client и server (vitest)              |
| `npm run migrate`  | прогнать миграции SQLite                    |

## Переменные окружения

См. `.env.example`.
