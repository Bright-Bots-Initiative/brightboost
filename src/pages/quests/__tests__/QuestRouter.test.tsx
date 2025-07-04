/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import QuestRouter from '../QuestRouter';
import { track } from '../../../lib/analytics';

vi.mock('../../../lib/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('../../hooks/useLocalStorage', () => ({
  default: () => [null, vi.fn()],
}));

describe('QuestRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders QuestPlaceholder with valid quest ID', () => {
    render(
      <MemoryRouter initialEntries={['/quest/1']}>
        <Routes>
          <Route path="/quest/:id" element={<QuestRouter />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quest 1');
  });

  it('handles invalid quest IDs', () => {
    render(
      <MemoryRouter initialEntries={['/quest/invalid']}>
        <Routes>
          <Route path="/quest/:id" element={<QuestRouter />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quest 0');
  });

  it('QuestRouter redirects unknown id', () => {
    const mockTrack = vi.mocked(track);
    
    render(
      <MemoryRouter initialEntries={['/quest/999']}>
        <Routes>
          <Route path="/quest/:id" element={<QuestRouter />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quest 0');
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith({ kind: 'quest_start', questId: '0' });
  });
});
