import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TeacherDashboard from '../TeacherDashboard';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test Teacher' },
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/GameBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="game-background">{children}</div>,
}));

vi.mock('../../components/BrightBoostRobot', () => ({
  default: () => <div data-testid="robot-icon">Robot</div>,
}));

vi.mock('../../components/TeacherDashboard/Sidebar', () => ({
  default: ({ activeView, setActiveView }: { activeView: string, setActiveView: (view: string) => void }) => (
    <div data-testid="sidebar">
      <button onClick={() => setActiveView('Lessons')} data-testid="nav-lessons">Lessons</button>
      <button onClick={() => setActiveView('Students')} data-testid="nav-students">Students</button>
      <button onClick={() => setActiveView('Settings')} data-testid="nav-settings">Settings</button>
      <div data-testid="active-view">{activeView}</div>
    </div>
  ),
}));

vi.mock('../../components/TeacherDashboard/MainContent', () => ({
  default: ({ activeView }: { activeView: string }) => (
    <div data-testid="main-content">
      <div data-testid="content-view">{activeView}</div>
    </div>
  ),
}));

describe('TeacherDashboard', () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );
  };

  it('renders without errors', () => {
    renderComponent();
    expect(screen.getByTestId('game-background')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('displays Lessons view by default', () => {
    renderComponent();
    expect(screen.getByTestId('active-view').textContent).toBe('Lessons');
    expect(screen.getByTestId('content-view').textContent).toBe('Lessons');
  });

  it('changes view when clicking on navigation items', () => {
    renderComponent();
    
    expect(screen.getByTestId('active-view').textContent).toBe('Lessons');
    
    fireEvent.click(screen.getByTestId('nav-students'));
    expect(screen.getByTestId('active-view').textContent).toBe('Students');
    expect(screen.getByTestId('content-view').textContent).toBe('Students');
    
    fireEvent.click(screen.getByTestId('nav-settings'));
    expect(screen.getByTestId('active-view').textContent).toBe('Settings');
    expect(screen.getByTestId('content-view').textContent).toBe('Settings');
    
    fireEvent.click(screen.getByTestId('nav-lessons'));
    expect(screen.getByTestId('active-view').textContent).toBe('Lessons');
    expect(screen.getByTestId('content-view').textContent).toBe('Lessons');
  });
});
