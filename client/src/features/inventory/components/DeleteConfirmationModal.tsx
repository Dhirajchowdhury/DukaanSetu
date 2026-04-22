import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ color: 'var(--inv-danger)', fontSize: '48px', marginBottom: '16px' }}>
            <FiAlertTriangle style={{ display: 'inline-block' }} />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Delete Product</h2>
          <p style={{ color: 'var(--inv-text-secondary)', marginBottom: '24px' }}>
            Are you sure you want to delete <strong>{productName}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              className="btn-danger" 
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
