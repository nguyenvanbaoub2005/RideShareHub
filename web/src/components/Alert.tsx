import React from 'react';
import { Icon } from './Icon';

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="alert alert--error" role="alert">
      <span className="alert__icon"><Icon name="alert" size={18} /></span>
      <span className="alert__msg">{message}</span>
      {onDismiss && (
        <button className="alert__close" type="button" onClick={onDismiss} aria-label="Đóng">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

export function SuccessAlert({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="alert alert--success" role="status">
      <span className="alert__icon"><Icon name="check" size={18} /></span>
      <span className="alert__msg">{message}</span>
      {onDismiss && (
        <button className="alert__close" type="button" onClick={onDismiss} aria-label="Đóng">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
