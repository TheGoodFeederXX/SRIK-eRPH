import { useCallback, useEffect, useState } from 'react';

export type Route = { name: 'form' | 'records' | 'dskp' | 'settings' | 'admin'; id?: string };

const parse = (hash: string): Route => {
    const path = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    switch (path[0]) {
        case 'rekod':
            return { name: 'records' };
        case 'dskp':
            return { name: 'dskp' };
        case 'tetapan':
            return { name: 'settings' };
        case 'pengguna':
            return { name: 'admin' };
        case 'rekod-baru':
            return { name: 'form' };
        case 'edit':
            return { name: 'form', id: path[1] };
        default:
            return { name: 'form' };
    }
};

const toHash = (route: Route): string => {
    switch (route.name) {
        case 'records':
            return '#/rekod';
        case 'dskp':
            return '#/dskp';
        case 'settings':
            return '#/tetapan';
        case 'admin':
            return '#/pengguna';
        case 'form':
            return route.id ? `#/edit/${route.id}` : '#/rekod-baru';
        default:
            return '#/rekod-baru';
    }
};

/**
 * Hash routing keeps the current view in the URL: refresh, Back/Forward and shared
 * links all work (audit T-05).
 */
export const useHashRoute = () => {
    const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

    useEffect(() => {
        const onChange = () => setRoute(parse(window.location.hash));
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    const navigate = useCallback((next: Route) => {
        setRoute(next);
        const hash = toHash(next);
        if (window.location.hash !== hash) {
            window.location.hash = hash;
        }
    }, []);

    return { route, navigate, href: toHash };
};
