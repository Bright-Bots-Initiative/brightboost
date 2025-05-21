/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IconButton, { EditIcon } from '../IconButton';

describe('IconButton', () => {
  it('renders with correct title attribute', () => {
    render(
      <IconButton onClick={() => {}} title="Edit item">
        <EditIcon />
      </IconButton>
    );
    
    const buttons = screen.getAllByTitle('Edit item');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeDefined();
  });

  it('fires onClick handler when clicked', () => {
    const handleClick = vi.fn();
    
    const { container } = render(
      <IconButton onClick={handleClick} title="Edit item">
        <EditIcon />
      </IconButton>
    );
    
    const button = container.querySelector('button');
    expect(button).toBeDefined();
    
    if (button) {
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });
});
