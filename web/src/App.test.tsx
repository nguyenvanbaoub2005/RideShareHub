import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('identifies the operations foundation', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /operations web foundation/i })).toBeInTheDocument();
  });
});
