import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api, errorMessage } from '../lib/apiClient';

export const LoginPage: React.FC = () => {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (password.length < 8) {
                    throw new Error('Kata laluan perlu sekurang-kurangnya 8 aksara.');
                }
                await register(email, password, name);
                setMessage('Akaun dicipta. Akses data menunggu kelulusan pentadbir sekolah.');
            }
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 font-jawi">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md glass-modern p-10 text-center border-slate-300 shadow-2xl relative"
            >

                <div className="mb-8">
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm inline-flex items-center justify-center mb-6 border border-white">
                        <img src="/logo.png" alt="Logo eRPH" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 id="login-title" className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
                        {isLogin ? 'Selamat Kembali' : 'Daftar Akaun'}
                    </h1>
                    <p className="text-slate-600 font-medium">
                        {isLogin ? 'Log masuk ke sistem eRPH digital anda' : 'Sila isi maklumat untuk mendaftar'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="text-left space-y-5" aria-labelledby="login-title">
                    {!isLogin && (
                        <div className="input-group">
                            <label htmlFor="name" className="font-bold text-slate-800 mb-1 block">Nama Penuh</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" aria-hidden="true" />
                                <input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nama guru"
                                    className="pl-12 w-full py-3 bg-white border-slate-300 focus:border-emerald-600 transition-all rounded-xl min-h-[44px]"
                                    aria-required="true"
                                />
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email" className="font-bold text-slate-800 mb-1 block">E-mel</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" aria-hidden="true" />
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="anda@email.com"
                                className="pl-12 w-full py-3 bg-white border-slate-300 focus:border-emerald-600 transition-all rounded-xl min-h-[44px]"
                                aria-required="true"
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password" className="font-bold text-slate-800 mb-1 block">Kata Laluan</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" aria-hidden="true" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-12 w-full py-3 bg-white border-slate-300 transition-all rounded-xl min-h-[44px]"
                                aria-required="true"
                                aria-describedby={!isLogin ? 'password-hint' : undefined}
                                style={{ paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="btn btn-outline btn-icon"
                                style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none' }}
                                aria-label={showPassword ? 'Sembunyikan kata laluan' : 'Papar kata laluan'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                        {!isLogin && (
                            <p className="field-hint" id="password-hint">Sekurang-kurangnya 8 aksara.</p>
                        )}
                        {isLogin && (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ alignSelf: 'flex-start', border: 'none', padding: 0, minHeight: 'auto', color: 'var(--primary)' }}
                                onClick={async () => {
                                    if (!email) {
                                        setError('Masukkan e-mel anda dahulu.');
                                        return;
                                    }
                                    try {
                                        await api.forgotPassword(email);
                                        setResetSent(true);
                                        setError(null);
                                    } catch (err) {
                                        setError(errorMessage(err));
                                    }
                                }}
                            >
                                Lupa kata laluan?
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                role="alert"
                                className="alert alert-error"
                            >
                                <AlertCircle size={18} aria-hidden="true" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                        {resetSent && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                role="status"
                                className="alert alert-info"
                            >
                                <span>Pautan set semula kata laluan telah dihantar ke e-mel anda (jika akaun wujud).</span>
                            </motion.div>
                        )}
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                role="status"
                                className="alert alert-success"
                            >
                                <CheckCircle2 size={18} aria-hidden="true" />
                                <span>{message}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-lg shadow-lg shadow-emerald-900/10 active:scale-[0.98] mt-2"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} aria-label="Memproses..." />
                        ) : isLogin ? (
                            <>
                                <LogIn size={20} aria-hidden="true" /> Log Masuk
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} aria-hidden="true" /> Daftar Akaun
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-slate-600 text-sm font-medium">
                        {isLogin ? 'Belum mempunyai akaun?' : 'Sudah mempunyai akaun?'}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                                setMessage(null);
                            }}
                            className="ml-2 text-emerald-700 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded px-1"
                        >
                            {isLogin ? 'Daftar sekarang' : 'Log masuk'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
