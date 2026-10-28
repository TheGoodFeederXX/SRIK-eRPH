import { createContext } from 'react';

export type ToastKind = 'success' | 'error';

export interface ToastApi {
    notify: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastApi | undefined>(undefined);
