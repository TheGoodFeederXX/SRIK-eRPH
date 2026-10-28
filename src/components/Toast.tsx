import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ToastContext, type ToastKind } from './toastContext';

interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
}

/** Single live region for status feedback, replacing alert() (audit T-07). */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<ToastItem[]>([]);
    const nextId = useRef(1);

    const notify = useCallback((message: string, kind: ToastKind = 'success') => {
        const id = nextId.current++;
        setItems((prev) => [...prev, { id, kind, message }]);
        window.setTimeout(() => {
            setItems((prev) => prev.filter((item) => item.id !== id));
        }, 5000);
    }, []);

    const value = useMemo(() => ({ notify }), [notify]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-region" role="status" aria-live="polite">
                {items.map((item) => (
                    <p key={item.id} className={`toast toast-${item.kind}`}>
                        {item.kind === 'success' ? (
                            <CheckCircle2 size={18} aria-hidden="true" />
                        ) : (
                            <AlertCircle size={18} aria-hidden="true" />
                        )}
                        {item.message}
                    </p>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

