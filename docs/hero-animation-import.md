# Швидкий імпорт анімації героя

Скрипт створює та оформлює анімацію героя однією командою:

```powershell
npm run add:animation -- `
  --hero drow_ranger `
  --video "C:\Animations\drow-idle.mp4" `
  --image "C:\Animations\drow.png"
```

Він автоматично:

- перевіряє, що герой є в каталозі Dota 2;
- створює або використовує папку `assets/heroes/<hero>`;
- копіює idle-анімацію;
- визначає chroma-колір за верхнім лівим пікселем;
- прибирає зелений фон зі спрайта через FFmpeg;
- визначає пропорції відео через FFprobe;
- створює `animation.json`;
- реєструє героя в клієнтському каталозі анімацій.

Якщо окремого зображення немає, спрайт буде створений із першого кадру:

```powershell
npm run add:animation -- --hero axe --video "C:\Animations\axe.mp4"
```

Відео сну та пробудження:

```powershell
npm run add:animation -- `
  --hero axe `
  --video "C:\Animations\axe-idle.mp4" `
  --sleep "C:\Animations\axe-sleep.mp4" `
  --wake "C:\Animations\axe-wake.mp4"
```

Корисні параметри:

- `--frame 1.5` — взяти спрайт із кадру на 1.5 секунді;
- `--key 0x00ff00` — вручну вказати колір фону;
- `--similarity 0.20` — змінити чутливість chroma key;
- `--blend 0.08` — змінити м'якість краю;
- `--no-chroma` — не прибирати фон із готового PNG;
- `--version 2` — створити файли версії `v2`;
- `--force` — замінити файли, які вже існують;
- `--help` — показати повну довідку.

Потрібні встановлені `ffmpeg` і `ffprobe`.

## Animation Studio

Під час локальної розробки відкрийте:

```text
http://localhost:5173/animation-studio
```

На сторінці можна:

- бачити загальну кількість готових героїв;
- фільтрувати готових і тих, що очікують;
- вручну ставити або прибирати відмітку виконання;
- завантажувати idle, fallback PNG, sleep та wake;
- одразу бачити live-preview вибраного idle-відео;
- запускати імпорт і автоматично відкривати збережене прев'ю.

Animation Studio працює без адмін-токена лише в development-режимі.

Ярлик `Запуск Dota Tamagotchi.lnk` запускає client/server і за замовчуванням
відкриває Animation Studio. Щоб відкрити звичайний екран гри через PowerShell:

```powershell
.\start-app.ps1 -Game
```
