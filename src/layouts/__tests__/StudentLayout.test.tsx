
import { render, screen } from '@testing-library/react';
import StudentLayout from '../StudentLayout';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../components/BottomNav', () => ({
  default: () => <div data-testid="bottom-nav">BottomNav</div>
}));

describe('StudentLayout Accessibility', () => {
  test('logout button has accessible label', () => {
    render(
      <BrowserRouter>
          <StudentLayout>
            <div>Content</div>
          </StudentLayout>
      </BrowserRouter>
    );

    // This query will fail if aria-label is missing on the button with the icon
    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toBeInTheDocument();
  });
});
