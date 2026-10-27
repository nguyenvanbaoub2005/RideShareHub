import React from 'react';

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="alert alert--error" role="alert">
      <span className="alert__icon">⚠</span>
      <span className="alert__msg">{message}</span>
      {onDismiss && (
        <button className="alert__close" onClick={onDismiss} aria-label="Đóng">✕</button>
      )}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="alert alert--success" role="status">
      <span className="alert__icon">✓</span>
      <span className="alert__msg">{message}</span>
    </div>
  );
}
