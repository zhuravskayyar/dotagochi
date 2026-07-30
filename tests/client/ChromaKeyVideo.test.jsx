import { describe, expect, it } from 'vitest';
import {
  findCharacterGroundRatio,
} from '../../packages/client/src/features/pet/ChromaKeyVideo.jsx';

const createGreenFrame = (width, height) => {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 20;
    pixels[index + 1] = 220;
    pixels[index + 2] = 25;
    pixels[index + 3] = 255;
  }

  return pixels;
};

const paintForeground = (pixels, width, left, top, right, bottom) => {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const index = (y * width + x) * 4;
      pixels[index] = 170;
      pixels[index + 1] = 70;
      pixels[index + 2] = 35;
    }
  }
};

describe('character platform grounding', () => {
  it('finds the last foreground row above green-screen padding', () => {
    const width = 20;
    const height = 20;
    const pixels = createGreenFrame(width, height);
    paintForeground(pixels, width, 6, 3, 13, 15);

    expect(findCharacterGroundRatio(pixels, width, height)).toBe(0.8);
  });

  it('ignores isolated compression noise below the character', () => {
    const width = 100;
    const height = 100;
    const pixels = createGreenFrame(width, height);
    paintForeground(pixels, width, 25, 10, 74, 79);
    paintForeground(pixels, width, 50, 94, 50, 94);

    expect(findCharacterGroundRatio(pixels, width, height)).toBe(0.8);
  });
});
