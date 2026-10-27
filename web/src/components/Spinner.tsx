import React from 'react';

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; }

export function Spinner({ size = 'md' }: SpinnerProps) {
  return <span className={`spinner spinner--${size}`} aria-label="Đang tải" />;
}

export function PageSpinner() {
  return (
    <div className="page-spinner">
      <Spinner size="lg" />
    </div>
  );
}
