import { beforeEach, describe, expect, it } from 'vitest';
import { loadDemoPet, runDemoAction } from '../../packages/client/src/features/pet/demoPet.js';

describe('static demo pet', () => {
  beforeEach(() => localStorage.clear());

  it('persists actions without the backend API', () => {
    const initial = loadDemoPet('pages-user');
    const response = runDemoAction('pages-user', 'feed');
    const persisted = loadDemoPet('pages-user');

    expect(response.pet.hunger).toBeGreaterThan(initial.hunger);
    expect(response.pet.gold).toBe(initial.gold - 5);
    expect(persisted).toEqual(response.pet);
  });

  it('toggles sleeping state', () => {
    expect(runDemoAction('pages-user', 'sleep').pet.is_sleeping).toBe(1);
    expect(runDemoAction('pages-user', 'sleep').pet.is_sleeping).toBe(0);
  });
});
