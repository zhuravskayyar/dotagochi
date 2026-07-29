import { describe, expect, it } from 'vitest';
import {
  buildRegistryEntry,
  parseArgs,
  publicAssetPath,
  validateHeroSlug,
} from '../../scripts/import-hero-animation.mjs';
import { mergeHeroStatuses } from '../../packages/server/src/features/animation-studio/animation-studio.service.js';
import { discoverAnimationRegistry } from '../../scripts/sync-hero-animations.mjs';

describe('hero animation importer', () => {
  it('parses the short import command', () => {
    expect(parseArgs([
      '--hero',
      'drow_ranger',
      '--video',
      'drow.mp4',
      '--force',
    ])).toEqual({
      hero: 'drow_ranger',
      video: 'drow.mp4',
      force: true,
    });
  });

  it('rejects unsafe hero slugs', () => {
    expect(() => validateHeroSlug('../drow')).toThrow(/Slug героя/);
  });

  it('creates portable public asset paths and optional clips', () => {
    expect(publicAssetPath('drow_ranger', 'sprite-v1.png')).toBe(
      'assets/heroes/drow_ranger/sprite-v1.png',
    );
    expect(buildRegistryEntry({
      hero: 'drow_ranger',
      version: 2,
      aspectRatio: 0.82,
      sleep: true,
      wake: true,
    })).toEqual({
      src: 'assets/heroes/drow_ranger/idle-chroma-v2.mp4',
      fallbackSrc: 'assets/heroes/drow_ranger/sprite-v2.png',
      aspectRatio: 0.82,
      sleepSrc: 'assets/heroes/drow_ranger/sleep-chroma-v2.mp4',
      wakeSrc: 'assets/heroes/drow_ranger/wake-chroma-v2.mp4',
    });
  });

  it('merges automatic assets with manually tracked progress', () => {
    const result = mergeHeroStatuses(
      [
        { id: 2, slug: 'axe', name: 'Axe', portrait: '/axe.png' },
        { id: 6, slug: 'drow_ranger', name: 'Drow Ranger', portrait: '/drow.png' },
      ],
      {
        drow_ranger: { src: 'assets/heroes/drow_ranger/idle.mp4' },
      },
      {
        axe: {
          completed: true,
          updatedAt: '2026-07-29T10:00:00.000Z',
          work: { version: 2, files: { idle: 'axe.mp4' } },
          history: [{ version: 2 }, { version: 1 }],
        },
        drow_ranger: { completed: false },
      },
    );

    expect(result[0].completed).toBe(true);
    expect(result[0].work.files.idle).toBe('axe.mp4');
    expect(result[0].history).toHaveLength(2);
    expect(result[1].completed).toBe(false);
    expect(result[1].animation.src).toContain('drow_ranger');
    expect(result[1].work.files.idle).toBe('idle.mp4');
    expect(result[1].history).toHaveLength(1);
  });

  it('discovers shared per-hero manifests for Windows and Linux clients', async () => {
    const registry = await discoverAnimationRegistry();

    expect(registry.drow_ranger.src).toContain('drow_ranger');
    expect(registry.earthshaker.src).toContain('earthshaker');
    expect(registry.pudge.sleepSrc).toContain('pudge-sleep');
  });
});
