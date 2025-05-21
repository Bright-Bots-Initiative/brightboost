/**
 * @vitest-environment jsdom
 */
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
    const gameBackgrounds = screen.getAllByTestId('game-background');
    const sidebars = screen.getAllByTestId('sidebar');
    const mainContents = screen.getAllByTestId('main-content');
    
    expect(gameBackgrounds.length).toBeGreaterThan(0);
    expect(sidebars.length).toBeGreaterThan(0);
    expect(mainContents.length).toBeGreaterThan(0);
  });

  it('displays Lessons view by default', () => {
    renderComponent();
    expect(screen.getAllByTestId('active-view')[0].textContent).toBe('Lessons');
    expect(screen.getAllByTestId('content-view')[0].textContent).toBe('Lessons');
  });

  it('changes view when clicking on navigation items', () => {
    renderComponent();
    
    expect(screen.getAllByTestId('active-view')[0].textContent).toBe('Lessons');
    
    fireEvent.click(screen.getAllByTestId('nav-students')[0]);
    expect(screen.getAllByTestId('active-view')[0].textContent).toBe('Students');
    expect(screen.getAllByTestId('content-view')[0].textContent).toBe('Students');
    
    fireEvent.click(screen.getAllByTestId('nav-settings')[0]);
    expect(screen.getAllByTestId('active-view')[0].textContent).toBe('Settings');
    expect(screen.getAllByTestId('content-view')[0].textContent).toBe('Settings');
    
    fireEvent.click(screen.getAllByTestId('nav-lessons')[0]);
    expect(screen.getAllByTestId('active-view')[0].textContent).toBe('Lessons');
    expect(screen.getAllByTestId('content-view')[0].textContent).toBe('Lessons');
  });
});
