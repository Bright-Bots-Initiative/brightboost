/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import QuestRouter from '../QuestRouter';

vi.mock('../QuestPlaceholder', () => ({
  default: ({ id }: { id: number }) => <div data-testid="quest-placeholder">QuestPlaceholder {id}</div>,
}));

describe('QuestRouter', () => {
  it('renders QuestPlaceholder with valid quest ID', () => {
    render(
      <MemoryRouter initialEntries={['/quest/1']}>
        <Routes>
          <Route path="/quest/:id" element={<QuestRouter />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('quest-placeholder')).toHaveTextContent('QuestPlaceholder 1');
  });

  it('handles invalid quest IDs', () => {
    render(
      <MemoryRouter initialEntries={['/quest/invalid']}>
        <Routes>
          <Route path="/quest/:id" element={<QuestRouter />} />
          <Route path="/quest/0" element={<div data-testid="quest-placeholder">QuestPlaceholder 0</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('quest-placeholder')).toHaveTextContent('QuestPlaceholder 0');
  });
});
