import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Users, XCircle } from 'lucide-react';
import type { Profile } from '../types';
import { api, errorMessage } from '../lib/apiClient';
import { ConfirmDialog } from './Modal';
import { useToast } from '../hooks/useToast';

const STATUS_LABEL: Record<Profile['status'], string> = {
    pending: 'Menunggu kelulusan',
    active: 'Aktif',
    disabled: 'Dinyahaktifkan',
};

const STATUS_BADGE: Record<Profile['status'], string> = {
    pending: 'badge-pending',
    active: 'badge-published',
    disabled: 'badge-draft',
};

interface PendingAction {
    member: Profile;
    patch: { role?: Profile['role']; status?: Profile['status'] };
    description: string;
}

export const AdminPanel: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
    const { notify } = useToast();
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            const result = await api.members();
            setMembers(result.members);
            setError(null);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    // Pending accounts first so the queue is obvious (audit S-04).
    const ordered = useMemo(() => {
        const weight: Record<Profile['status'], number> = { pending: 0, active: 1, disabled: 2 };
        return [...members].sort((a, b) => weight[a.status] - weight[b.status] || a.name.localeCompare(b.name));
    }, [members]);

    const pendingCount = ordered.filter((member) => member.status === 'pending').length;

    const apply = async ({ member, patch }: PendingAction) => {
        setBusyId(member.id);
        try {
            const result = await api.setMembership(member.id, patch);
            setMembers((prev) => prev.map((item) => (item.id === result.profile.id ? result.profile : item)));
            notify('Perubahan disimpan.');
            setPendingAction(null);
            setError(null);
        } catch (err) {
            const message = errorMessage(err);
            setError(message);
            notify(message, 'error');
        } finally {
            setBusyId(null);
        }
    };

    const isSelf = (member: Profile) => member.id === currentUserId;

    return (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-3 mb-2">
                <Users size={24} aria-hidden="true" style={{ color: 'var(--primary)' }} />
                <h2 style={{ color: 'var(--primary)', fontSize: '1.375rem' }}>Pengurusan Pengguna</h2>
                {pendingCount > 0 && (
                    <span className="badge badge-pending">{pendingCount} menunggu</span>
                )}
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Luluskan akaun guru dan tetapkan peranan. Hanya akaun <strong>Aktif</strong> boleh mengakses data sekolah.
            </p>

            {error && (
                <p className="alert alert-error" role="alert">{error}</p>
            )}

            <ConfirmDialog
                open={pendingAction !== null}
                title="Sahkan perubahan akaun"
                message={pendingAction?.description ?? ''}
                confirmLabel="Teruskan"
                busy={pendingAction ? busyId === pendingAction.member.id : false}
                onCancel={() => setPendingAction(null)}
                onConfirm={() => pendingAction && void apply(pendingAction)}
            />

            {loading ? (
                <div className="page-center" role="status">
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    <p>Memuatkan pengguna…</p>
                </div>
            ) : (
                <>
                    <div className="mobile-only">
                        {ordered.map((member) => (
                            <div key={member.id} className="card-panel mb-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                    <strong>{member.name}</strong>
                                    <span className={`badge ${STATUS_BADGE[member.status]}`}>{STATUS_LABEL[member.status]}</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{member.email}</p>
                                <p style={{ fontSize: '0.875rem' }}>{member.role === 'admin' ? 'Pentadbir' : 'Guru'}</p>
                                <MemberActions
                                    member={member}
                                    self={isSelf(member)}
                                    busy={busyId === member.id}
                                    onRequest={(patch, description) => setPendingAction({ member, patch, description })}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="table-container desktop-only">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>E-mel</th>
                                    <th>Status</th>
                                    <th>Peranan</th>
                                    <th>Tindakan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordered.map((member) => (
                                    <tr key={member.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {member.name}
                                            {isSelf(member) && <span className="badge badge-draft" style={{ marginLeft: '0.5rem' }}>Anda</span>}
                                        </td>
                                        <td>{member.email}</td>
                                        <td><span className={`badge ${STATUS_BADGE[member.status]}`}>{STATUS_LABEL[member.status]}</span></td>
                                        <td>
                                            <span className={`badge ${member.role === 'admin' ? 'badge-published' : 'badge-draft'}`}>
                                                {member.role === 'admin' ? 'Pentadbir' : 'Guru'}
                                            </span>
                                        </td>
                                        <td>
                                            <MemberActions
                                                member={member}
                                                self={isSelf(member)}
                                                busy={busyId === member.id}
                                                onRequest={(patch, description) => setPendingAction({ member, patch, description })}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

const MemberActions: React.FC<{
    member: Profile;
    self: boolean;
    busy: boolean;
    onRequest: (patch: { role?: Profile['role']; status?: Profile['status'] }, description: string) => void;
}> = ({ member, self, busy, onRequest }) => {
    if (self) {
        return <p className="field-hint">Anda tidak boleh mengubah status atau peranan akaun sendiri.</p>;
    }

    return (
        <div className="flex gap-2 flex-wrap">
            {member.status !== 'active' ? (
                <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => onRequest({ status: 'active' }, `Luluskan akaun ${member.email}?`)}
                >
                    <CheckCircle2 size={16} aria-hidden="true" /> Luluskan
                </button>
            ) : (
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy}
                    onClick={() => onRequest({ status: 'disabled' }, `Nyahaktifkan akaun ${member.email}? Akaun ini akan hilang akses serta-merta.`)}
                >
                    <XCircle size={16} aria-hidden="true" /> Nyahaktif
                </button>
            )}
            <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() =>
                    onRequest(
                        { role: member.role === 'admin' ? 'teacher' : 'admin' },
                        `Tukar peranan ${member.email} kepada ${member.role === 'admin' ? 'Guru' : 'Pentadbir'}?`,
                    )
                }
            >
                <ShieldCheck size={16} aria-hidden="true" /> {member.role === 'admin' ? 'Jadikan Guru' : 'Jadikan Pentadbir'}
            </button>
        </div>
    );
};
