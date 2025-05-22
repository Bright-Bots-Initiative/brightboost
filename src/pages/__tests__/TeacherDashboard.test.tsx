/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TeacherDashboard from '../TeacherDashboard';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test Teacher' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  useApi: () => ({
    get: vi.fn().mockImplementation(() => Promise.resolve({ 
      lessons: [
        { id: '1', title: 'Introduction to Algebra', category: 'Math', date: '2025-05-01', status: 'Published' },
        { id: '2', title: 'Advanced Geometry', category: 'Math', date: '2025-05-10', status: 'Draft' },
        { id: '3', title: 'Chemistry Basics', category: 'Science', date: '2025-05-15', status: 'Review' }
      ] 
    })),
  }),
}));

vi.mock('../../components/GameBackground', () => ({
  default: ({ children }) => <div data-testid="game-background">{children}</div>,
}));

vi.mock('../../components/BrightBoostRobot', () => ({
  default: () => <div data-testid="robot-icon">Robot</div>,
}));

vi.mock('../../components/TeacherDashboard/Sidebar', () => ({
  default: ({ activeView }) => (
    <div data-testid="sidebar">
      <div data-testid="active-view">{activeView}</div>
    </div>
  ),
}));

vi.mock('../../components/TeacherDashboard/MainContent', () => ({
  default: ({ activeView }) => (
    <div data-testid="main-content">
      <div data-testid="content-view">{activeView}</div>
    </div>
  ),
}));

describe('TeacherDashboard', () => {
  vi.setConfig({ testTimeout: 10000 });
  
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  it('renders the dashboard components', () => {
    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('game-background')).toBeDefined();
    expect(screen.getByTestId('sidebar')).toBeDefined();
    
    expect(screen.getByTestId('active-view').textContent).toBe('Lessons');
    
    const loadingElement = screen.queryByText('Loading dashboard data...');
    const mainContentElement = screen.queryByTestId('main-content');
    
    expect(
      loadingElement !== null || mainContentElement !== null
    ).toBe(true);
  });
});
