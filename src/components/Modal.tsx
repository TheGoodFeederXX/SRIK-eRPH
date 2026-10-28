import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    /** Wider panel for forms with several columns. */
    wide?: boolean;
}

/**
 * One dialog for the whole app. The native <dialog> element supplies focus trapping,
 * `Esc`, an inert background and focus restoration for free (audit T-02).
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, wide }) => {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="modal-panel"
            aria-labelledby={titleId}
            onClose={onClose}
            style={wide ? { width: 'min(100% - 2rem, 760px)' } : undefined}
        >
            <div className="modal-header">
                <h2 id={titleId} style={{ fontSize: '1.25rem', fontWeight: 800 }}>{title}</h2>
                <button type="button" className="btn btn-outline btn-icon" onClick={onClose} aria-label="Tutup dialog">
                    <X size={20} aria-hidden="true" />
                </button>
            </div>
            {children}
        </dialog>
    );
};

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/** Replaces window.confirm(); "Batal" is focused first so Enter never deletes by accident. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    confirmLabel = 'Padam',
    cancelLabel = 'Batal',
    busy,
    onConfirm,
    onCancel,
}) => (
    <Modal open={open} onClose={onCancel} title={title}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{message}</p>
        <div className="modal-actions">
            <button
                type="button"
                className="btn btn-outline"
                onClick={onCancel}
                autoFocus
            >
                {cancelLabel}
            </button>
            <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                {busy ? 'Memproses…' : confirmLabel}
            </button>
        </div>
    </Modal>
);
