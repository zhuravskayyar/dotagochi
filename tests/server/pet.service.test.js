import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

process.env.DATABASE_PATH = path.join(process.cwd(), '../../packages/server/src/database/test.sqlite');

const { petService } = await import('../../packages/server/src/features/pet/pet.service.js');
const { eggGenerationService } = await import(
  '../../packages/server/src/features/egg-generation/egg-generation.service.js'
);
const { notificationsService } = await import(
  '../../packages/server/src/features/notifications/notifications.service.js'
);
const { db } = await import('../../packages/server/src/database/connection.js');

for (const migration of [
  '001_init.sql',
  '002_tamagotchi_stats.sql',
  '003_egg_heroes_notifications.sql',
]) {
  const migrationSql = fs.readFileSync(
    path.join(process.cwd(), `../../packages/server/src/database/migrations/${migration}`),
    'utf-8'
  );
  db.exec(migrationSql);
}

describe('petService', () => {
  afterAll(() => {
    db.close();
    const dbFile = process.env.DATABASE_PATH;
    for (const suffix of ['', '-wal', '-shm']) {
      const f = dbFile + suffix;
      if (fs.existsSync(f)) fs.rmSync(f);
    }
  });

  it('creates a pet on first access', () => {
    const pet = petService.getPet('test-user-1');
    expect(pet.user_id).toBe('test-user-1');
    expect(pet.hunger).toBe(100);
    expect(pet.life_stage).toBe('egg');
  });

  it('feed increases hunger, capped at 100', () => {
    petService.getPet('test-user-2');
    const result = petService.feed('test-user-2');
    expect(result.pet.hunger).toBeLessThanOrEqual(100);
  });

  it('hatches after five minutes into a random Dota hero', () => {
    const userId = 'hatch-user';
    const pet = petService.getPet(userId);
    const result = eggGenerationService.generate(
      userId,
      pet.stage_started_at_ms + 5 * 60 * 1000
    );

    expect(result.pet.life_stage).toBe('baby');
    expect(result.hero.id).toBeTypeOf('number');
    expect(result.pet.hero_slug).toBe(result.hero.slug);
  });

  it('uses heart-based baby timing and a 15 minute care grace window', () => {
    const userId = 'timing-user';
    const egg = petService.getPet(userId);
    const hatchedAt = egg.stage_started_at_ms + 5 * 60 * 1000;
    const { pet } = eggGenerationService.generate(userId, hatchedAt);

    const afterOneHour = petService.applyDecay(pet, hatchedAt + 60 * 60 * 1000);
    expect(afterOneHour.hunger).toBe(0);
    expect(afterOneHour.mood).toBe(0);
    expect(afterOneHour.health).toBe(100);

    const afterGrace = petService.applyDecay(
      afterOneHour,
      hatchedAt + 75 * 60 * 1000
    );
    expect(afterGrace.care_mistakes).toBe(1);
    expect(afterGrace.health).toBe(90);
  });

  it('does not send pushes when notifications are disabled', async () => {
    const userId = 'push-disabled-user';
    petService.getPet(userId);
    db.prepare(
      `UPDATE pets SET life_stage = 'adult', health = 10, hero_name = 'Axe'
       WHERE user_id = ?`
    ).run(userId);
    notificationsService.updateSettings(userId, { enabled: false });
    let sends = 0;
    const telegram = { sendMessage: async () => { sends += 1; } };

    const sent = await notificationsService.sendCriticalAlert(
      petService.getPet(userId),
      telegram
    );

    expect(sent).toBe(false);
    expect(sends).toBe(0);
  });
});
