import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PetView } from '../../packages/client/src/features/pet/PetView.jsx';

vi.mock('../../packages/client/src/shared/telegram/useTelegram.js', () => ({
  useTelegram: () => ({ isReady: true, userId: 'dev-user' }),
}));

vi.mock('../../packages/client/src/features/pet/usePet.js', () => ({
  usePet: () => ({
    pet: { name: 'Юзик', hunger: 80, happiness: 60 },
    loading: false,
    error: null,
    feed: vi.fn(),
    play: vi.fn(),
  }),
}));

describe('PetView', () => {
  it('renders pet name', () => {
    render(<PetView />);
    expect(screen.getByText('Юзик')).toBeTruthy();
  });
});
