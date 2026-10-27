import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

afterEach(() => {
  cleanup();
});

describe('App routing', () => {
  it('renders login page at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /đăng nhập hệ thống/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login from protected route', () => {
    render(
      <MemoryRouter initialEntries={['/admin/companies']}>
        <App />
      </MemoryRouter>,
    );
    // Should end up at login page
    expect(screen.getByRole('heading', { name: /đăng nhập hệ thống/i })).toBeInTheDocument();
  });
});
