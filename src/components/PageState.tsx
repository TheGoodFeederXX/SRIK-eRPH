import React from 'react';
import { Loader2, WifiOff } from 'lucide-react';

export const PageLoading: React.FC<{ label?: string }> = ({ label = 'Memuatkan…' }) => (
    <div className="page-center" role="status" aria-live="polite">
        <Loader2 size={32} className="animate-spin" aria-hidden="true" style={{ color: 'var(--primary)' }} />
        <p>{label}</p>
    </div>
);

export const PageError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
    <div className="page-center" role="alert">
        <WifiOff size={32} aria-hidden="true" style={{ color: 'var(--danger)' }} />
        <h1 style={{ fontSize: '1.25rem' }}>Sambungan pelayan gagal</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '32rem' }}>{message}</p>
        {onRetry && (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
                Cuba lagi
            </button>
        )}
    </div>
);
