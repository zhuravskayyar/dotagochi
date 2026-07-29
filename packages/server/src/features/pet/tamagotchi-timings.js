export const TAMAGOTCHI_TIMINGS = Object.freeze({
  eggHatchMs: 5 * 60 * 1000,
  babyDurationMs: 65 * 60 * 1000,
  childUntilAgeMs: 3 * 24 * 60 * 60 * 1000,
  teenUntilAgeMs: 6 * 24 * 60 * 60 * 1000,
  careGraceMs: 15 * 60 * 1000,
  notificationScanMs: 60 * 1000,
});

export const STAGE_NEED_INTERVALS = Object.freeze({
  baby: 15 * 60 * 1000,
  child: 45 * 60 * 1000,
  teen: 45 * 60 * 1000,
  adult: 60 * 60 * 1000,
});

export function stageForAge(ageMs) {
  if (ageMs < TAMAGOTCHI_TIMINGS.babyDurationMs) return 'baby';
  if (ageMs < TAMAGOTCHI_TIMINGS.childUntilAgeMs) return 'child';
  if (ageMs < TAMAGOTCHI_TIMINGS.teenUntilAgeMs) return 'teen';
  return 'adult';
}
