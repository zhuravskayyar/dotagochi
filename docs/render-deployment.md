# Animation Studio на Render

Studio розгортається як один Node.js web service: Express обслуговує API,
зібраний Vite-клієнт і щойно імпортовані файли героїв. Render native runtime уже
містить `ffmpeg`, `ffprobe` і `git`, які потрібні імпортеру.

## Перший запуск

1. Натисніть [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fzhuravskayyar%2Fdotagochi)
   і підключіть GitHub-репозиторій `zhuravskayyar/dotagochi`.
2. Виберіть **New → Blueprint**, репозиторій і гілку `main`. Render автоматично
   знайде `render.yaml`.
3. Задайте два секрети, коли Blueprint попросить їх:

   - `ADMIN_TOKEN` — довгий випадковий пароль для входу в Studio;
   - `GITHUB_TOKEN` — fine-grained GitHub Personal Access Token для репозиторіїв
     `dotagochi` і `dotagochi-studio` з дозволом **Contents: Read and write**.

4. Дочекайтеся зеленого health check `/api/health`.
5. Відкрийте `https://dota-tamagotchi-studio.onrender.com/animation-studio` і
   введіть значення `ADMIN_TOKEN`. Воно зберігається лише в `sessionStorage`
   поточної вкладки та передається API через HTTPS.

## Як зберігаються зміни

Кнопка **ЗБЕРЕГТИ Й ВІДПРАВИТИ** створює commit у `main` і відправляє його в
приватний робочий репозиторій `dotagochi-studio`. Кнопка **ОТРИМАТИ ЗМІНИ**
синхронізується з цим самим робочим репозиторієм. Це однаково працює локально
та на Render і не запускає deployment після кожного збереження героя.

Кнопка **ОПУБЛІКУВАТИ В ОРИГІНАЛ** отримує актуальні зміни з робочого й
основного репозиторіїв, синхронізує `dotagochi-studio`, після чого відправляє
результат у `dotagochi`. Лише цей push запускає автоматичний deployment Render.
Токен GitHub ніколи не передається браузеру.

Blueprint використовує безкоштовний instance. Він засинає після 15 хвилин без
HTTP-трафіку, а його локальна файлова система є тимчасовою. Тому не залишайте
імпортовану роботу без push. Перше відкриття після сну може тривати близько
хвилини. Для постійно активної Studio змініть `plan: free` на `plan: starter`.

SQLite у цьому Studio-only розгортанні лежить у `/tmp`: каталог анімацій і
прогрес зберігаються через GitHub, а дані Telegram-гри не переносяться. Для
перенесення також і гри потрібен paid instance з persistent disk або окрема
постійна база даних.
