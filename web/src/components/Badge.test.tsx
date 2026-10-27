import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders PENDING with correct Vietnamese label and class', () => {
    render(<Badge value="PENDING" />);
    const badge = screen.getByText('Chờ duyệt');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge--pending');
  });

  it('renders APPROVED correctly', () => {
    render(<Badge value="APPROVED" />);
    const badge = screen.getByText('Đã duyệt');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge--approved');
  });

  it('renders REJECTED correctly', () => {
    render(<Badge value="REJECTED" />);
    const badge = screen.getByText('Từ chối');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge--rejected');
  });

  it('renders AVAILABLE vehicle status correctly', () => {
    render(<Badge value="AVAILABLE" />);
    const badge = screen.getByText('Sẵn sàng');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge--available');
  });
});
