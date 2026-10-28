import type { Profile, RPHRecord, ReferensiRPH } from '../types';

export interface ApiErrorShape {
    code: string;
    message: string;
}

export class ApiError extends Error {
    status: number;
    code: string;

    constructor(status: number, body: ApiErrorShape) {
        super(body.message);
        this.status = status;
        this.code = body.code;
    }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, {
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        ...init,
    });

    const payload = (await response.json().catch(() => null)) as T | { error: ApiErrorShape } | null;

    if (!response.ok) {
        const error = (payload as { error?: ApiErrorShape } | null)?.error;
        throw new ApiError(response.status, error ?? { code: 'INTERNAL', message: 'Ralat rangkaian.' });
    }

    return payload as T;
}

export interface SessionResponse {
    user: { id: string; email: string; name: string } | null;
    profile: Profile | null;
    status?: Profile['status'] | null;
}

export interface Paginated<T> {
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface DskpInput {
    subjek: string;
    tahun: number;
    bidang?: string | null;
    sk: string;
    sp: string[];
    spi: Array<{ tp: number; desc: string }>;
}

export type RecordInput = Omit<RPHRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const api = {
    session: () => request<SessionResponse>('/session'),
    login: (email: string, password: string) =>
        request<SessionResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email: string, password: string, name: string) =>
        request<SessionResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    forgotPassword: (email: string) =>
        request<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
        request<{ ok: boolean }>('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        }),
    rename: (name: string) =>
        request<{ profile: Profile }>('/profile', { method: 'PATCH', body: JSON.stringify({ name }) }),

    listRecords: (params: { page: number; pageSize: number; search: string }) =>
        request<Paginated<RPHRecord>>(
            `/records?page=${params.page}&pageSize=${params.pageSize}&search=${encodeURIComponent(params.search)}`,
        ),
    createRecord: (record: RecordInput) =>
        request<{ record: RPHRecord }>('/records', { method: 'POST', body: JSON.stringify(record) }),
    updateRecord: (id: string, record: Partial<RecordInput>) =>
        request<{ record: RPHRecord }>(`/records/${id}`, { method: 'PATCH', body: JSON.stringify(record) }),
    deleteRecord: (id: string) => request<{ ok: boolean }>(`/records/${id}`, { method: 'DELETE' }),

    dskpMeta: () => request<{ subjects: string[]; years: number[] }>('/dskp/meta'),
    listDskp: (params: { page: number; pageSize: number; search?: string; subjek?: string; tahun?: number }) => {
        const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
        if (params.search) query.set('search', params.search);
        if (params.subjek) query.set('subjek', params.subjek);
        if (params.tahun !== undefined) query.set('tahun', String(params.tahun));
        return request<Paginated<ReferensiRPH>>(`/dskp?${query.toString()}`);
    },
    createDskp: (input: DskpInput) =>
        request<{ record: ReferensiRPH }>('/dskp', { method: 'POST', body: JSON.stringify(input) }),
    updateDskp: (id: string, input: DskpInput) =>
        request<{ record: ReferensiRPH }>(`/dskp/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    deleteDskp: (id: string) => request<{ ok: boolean }>(`/dskp/${id}`, { method: 'DELETE' }),

    members: () => request<{ members: Profile[] }>('/admin/members'),
    setMembership: (id: string, input: { role?: Profile['role'] | null; status?: Profile['status'] | null }) =>
        request<{ profile: Profile }>(`/admin/members/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
};

export const errorMessage = (error: unknown) =>
    error instanceof ApiError ? error.message : 'Ralat tidak dijangka. Sila cuba lagi.';
