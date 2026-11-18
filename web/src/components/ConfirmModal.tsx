import React from 'react';
import { Icon } from './Icon';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => !loading && onCancel()}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="confirm-modal-title" className="modal-title">{title}</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Đóng"
            disabled={loading}
            onClick={onCancel}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className={`modal-icon ${destructive ? 'modal-icon--danger' : 'modal-icon--info'}`}>
            <Icon name={destructive ? 'alert' : 'info'} size={20} />
          </div>
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={loading}
            onClick={onCancel}
          >
            Huỷ
          </button>
          <button
            type="button"
            className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
