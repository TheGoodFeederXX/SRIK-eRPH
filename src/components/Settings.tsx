import React, { useState } from 'react';
import { api, errorMessage } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';

export const Settings: React.FC = () => {
    const { profile, user, refresh, signOut } = useAuth();
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [nameLoading, setNameLoading] = useState(false);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Username/Name change state
    const [username, setUsername] = useState(profile?.name || user?.name || '');
    const [nameError, setNameError] = useState<string | null>(null);
    const [nameSuccess, setNameSuccess] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        if (!newPassword || !confirmPassword || !currentPassword) {
            setPasswordError('Sila isi semua medan kata laluan.');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Kata laluan baru mestilah sekurang-kurangnya 8 aksara.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Kata laluan baru dan pengesahan tidak sepadan.');
            return;
        }

        if (newPassword === currentPassword) {
            setPasswordError('Kata laluan baru mestilah berbeza daripada kata laluan semasa.');
            return;
        }

        setPasswordLoading(true);

        try {
            // The server verifies the current password with Neon Auth before changing it (audit S-05).
            await api.changePassword(currentPassword, newPassword);
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            // Sessions are revoked after a password change: sign in again.
            setTimeout(() => {
                void signOut();
            }, 2000);
        } catch (err: unknown) {
            setPasswordError(errorMessage(err));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleUsernameChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameError(null);
        setNameSuccess(false);

        if (!username.trim()) {
            setNameError('Nama tidak boleh kosong.');
            return;
        }

        setNameLoading(true);

        try {
            await api.rename(username.trim());
            await refresh();
            setNameSuccess(true);
        } catch (err: unknown) {
            setNameError(errorMessage(err));
        } finally {
            setNameLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem' }}
            >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Tetapan Akaun
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Urus kata laluan dan maklumat profil anda
                </p>
            </motion.div>

            {/* Change Username/Name Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    boxShadow: 'var(--shadow)',
                    marginBottom: '1.5rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <User size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Tukar Nama
                    </h3>
                </div>

                <form onSubmit={handleUsernameChange}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label htmlFor="settings-name" className="field-label">Nama</label>
                        <input
                            id="settings-name"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nama anda"
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Nama ini akan dipaparkan di halaman utama
                        </p>
                    </div>

                    <AnimatePresence>
                        {nameError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: '1rem' }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem'
                                }}>
                                    <AlertCircle size={16} />
                                    {nameError}
                                </div>
                            </motion.div>
                        )}
                        {nameSuccess && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: '1rem' }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#dcfce7',
                                    color: '#166534',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem'
                                }}>
                                    <CheckCircle size={16} />
                                    Nama berjaya dikemaskini!
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={nameLoading}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: nameLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.1s, opacity 0.2s',
                            opacity: nameLoading ? 0.7 : 1
                        }}
                    >
                        {nameLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} /> Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save size={20} /> Simpan Nama
                            </>
                        )}
                    </button>
                </form>
            </motion.div>

            {/* Change Password Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    boxShadow: 'var(--shadow)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Lock size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Tukar Kata Laluan
                    </h3>
                </div>

                <form onSubmit={handlePasswordChange}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="settings-current-password" className="field-label">Kata Laluan Semasa</label>
                        <input
                            id="settings-current-password"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="settings-new-password" className="field-label">Kata Laluan Baru</label>
                        <input
                            id="settings-new-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Minimum 8 aksara. Anda akan dilog keluar selepas menukar kata laluan.
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label htmlFor="settings-confirm-password" className="field-label">Sahkan Kata Laluan Baru</label>
                        <input
                            id="settings-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <AnimatePresence>
                        {passwordError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: '1rem' }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem'
                                }}>
                                    <AlertCircle size={16} />
                                    {passwordError}
                                </div>
                            </motion.div>
                        )}
                        {passwordSuccess && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: '1rem' }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#dcfce7',
                                    color: '#166534',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem'
                                }}>
                                    <CheckCircle size={16} />
                                    Kata laluan berjaya ditukar!
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: passwordLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.1s, opacity 0.2s',
                            opacity: passwordLoading ? 0.7 : 1
                        }}
                    >
                        {passwordLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} /> Menukar...
                            </>
                        ) : (
                            <>
                                <Lock size={20} /> Tukar Kata Laluan
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};
