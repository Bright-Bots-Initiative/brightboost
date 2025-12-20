import { render, screen, fireEvent, within } from '@testing-library/react';
import StudentRoster from '../StudentRoster';
import { describe, it, expect, vi } from 'vitest';

describe('StudentRoster Performance', () => {
  it('renders student roster correctly', () => {
    render(<StudentRoster />);
    expect(screen.getByText('Student Roster')).toBeInTheDocument();
    expect(screen.getByText('Ashley')).toBeInTheDocument();
  });

  it('filters students based on search query', () => {
    render(<StudentRoster />);

    // Initial state: Ashley is present
    expect(screen.getByText('Ashley')).toBeInTheDocument();

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    const input = screen.getByPlaceholderText('Search students...');
    fireEvent.change(input, { target: { value: 'Emily' } });

    // Ashley should be gone, Emily present
    expect(screen.queryByText('Ashley')).not.toBeInTheDocument();
    expect(screen.getByText('Emily')).toBeInTheDocument();
  });

  it('sorts students by level', () => {
    render(<StudentRoster />);

    const levelHeader = screen.getByRole('button', { name: /Level/i });
    fireEvent.click(levelHeader);

    // Initial click sorts ascending. Lucas (Level 2) should be first.
    // However, finding "first" in a table is tricky with just getByText.
    // We can check the rows.
    const rows = screen.getAllByRole('row');
    // Row 0 is header. Row 1 is first student.
    const firstRow = rows[1];
    expect(within(firstRow).getByText('Lucas')).toBeInTheDocument(); // Level 2

    // Click again for descending
    fireEvent.click(levelHeader);
    const firstRowDesc = screen.getAllByRole('row')[1];
    expect(within(firstRowDesc).getByText('Thomas')).toBeInTheDocument(); // Level 6
  });

  it('paginates correctly', () => {
    render(<StudentRoster />);

    // Page 1 should show first 4 students
    expect(screen.getByText('Showing 4 of 6 students')).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextButton);

    // Page 2 should show remaining 2
    expect(screen.getByText('Showing 2 of 6 students')).toBeInTheDocument();
  });
});
