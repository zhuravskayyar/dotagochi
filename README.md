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
