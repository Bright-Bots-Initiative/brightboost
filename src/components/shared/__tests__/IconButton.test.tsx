import React from 'react';
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
    
    const button = screen.getByTitle('Edit item');
    expect(button).toBeInTheDocument();
  });

  it('fires onClick handler when clicked', () => {
    const handleClick = vi.fn();
    
    render(
      <IconButton onClick={handleClick} title="Edit item">
        <EditIcon />
      </IconButton>
    );
    
    const button = screen.getByTitle('Edit item');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
