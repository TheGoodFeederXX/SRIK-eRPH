import { Suspense, lazy, useEffect, useState } from 'react';
import { useRecords } from './hooks/useRecords';
import { useHashRoute, type Route } from './hooks/useHashRoute';
import { RPHForm } from './components/RPHForm';
import { RPHRecords } from './components/RPHRecords';
import type { RPHRecord } from './types';
import { List, PlusCircle, LogOut, Settings as SettingsIcon, Database, ShieldCheck } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/LoginPage';
import { PageError, PageLoading } from './components/PageState';
import { ToastProvider } from './components/Toast';
import { useToast } from './hooks/useToast';
import { errorMessage } from './lib/apiClient';

// Only the list and form are needed on first paint; the rest loads on demand (audit T-06).
const DSKPManager = lazy(() => import('./components/DSKPManager').then((m) => ({ default: m.DSKPManager })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const SettingsComponent = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })));

const NAV_ITEMS: Array<{ route: Route; label: string; short: string; icon: typeof List }> = [
  { route: { name: 'form' }, label: 'Rekod Baru', short: 'Baru', icon: PlusCircle },
  { route: { name: 'records' }, label: 'Senarai Rekod', short: 'Senarai', icon: List },
  { route: { name: 'dskp' }, label: 'DSKP', short: 'DSKP', icon: Database },
  { route: { name: 'settings' }, label: 'Tetapan', short: 'Tetapan', icon: SettingsIcon },
];

function AppContent() {
  const { user, profile, signOut, loading: authLoading, error: authError, refresh } = useAuth();
  const { notify } = useToast();
  const { route, navigate, href } = useHashRoute();
  const {
    records,
    loading,
    error: recordsError,
    totalCount,
    page,
    setPage,
    pageSize,
    searchTerm,
    setSearchTerm,
    addRecord,
    updateRecord,
    deleteRecord
  } = useRecords();
  const [editingRecord, setEditingRecord] = useState<RPHRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  const isActive = profile?.status === 'active';

  // Deep link #/edit/:id resolves against the loaded list without an extra render.
  const editingFromRoute = route.name === 'form' && route.id
    ? records.find((record) => record.id === route.id) ?? null
    : null;
  const activeRecord = editingFromRoute ?? editingRecord;

  useEffect(() => {
    const title =
      route.name === 'form' ? (route.id ? 'Kemaskini Rekod' : 'Rekod Baru')
        : route.name === 'records' ? 'Senarai Rekod'
          : route.name === 'dskp' ? 'DSKP'
            : route.name === 'admin' ? 'Pengguna'
              : 'Tetapan';
    document.title = `eRPH SRI Al-Khairiah — ${title}`;
  }, [route]);

  if (authLoading) return <PageLoading label="Menyemak sesi…" />;

  if (authError && !user) return <PageError message={authError} onRetry={() => void refresh()} />;

  if (!user) return <LoginPage />;

  const go = (next: Route) => {
    if (next.name === 'form') setEditingRecord(null);
    navigate(next);
  };

  const handleSubmit = async (data: Omit<RPHRecord, 'id'>) => {
    setSubmitError(null);
    try {
      if (editingRecord) {
        await updateRecord(editingRecord.id, data);
        notify('Rekod berjaya dikemaskini.');
      } else {
        await addRecord(data);
        notify('Rekod berjaya disimpan.');
      }
      setEditingRecord(null);
      navigate({ name: 'records' });
    } catch (err) {
      const message = errorMessage(err);
      setSubmitError(message);
      notify(message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      notify('Rekod dipadam.');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const navItems = isAdmin
    ? [...NAV_ITEMS, { route: { name: 'admin' } as Route, label: 'Pengguna', short: 'Pengguna', icon: ShieldCheck }]
    : NAV_ITEMS;

  return (
    <div className={`container${isActive ? ' has-bottom-nav' : ''}`}>
      <header className="app-header" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={48} height={48} className="object-contain" />
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                eRPH <span style={{ color: 'var(--primary)' }}>SRI Al-Khairiah</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Rekod Pengajaran Harian Digital</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {profile && (
              <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                {profile.name || user.email.split('@')[0]}
                {isAdmin && <span className="badge badge-published" style={{ marginLeft: '0.5rem' }}>Pentadbir</span>}
              </p>
            )}
            <button type="button" className="btn btn-outline" onClick={() => void signOut()}>
              <LogOut size={16} aria-hidden="true" /> Log Keluar
            </button>
          </div>
        </div>
      </header>

      {!isActive ? (
        <main className="no-print page-center" style={{ minHeight: '40vh' }}>
          <h2 style={{ fontSize: '1.375rem' }}>Akaun menunggu kelulusan</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '34rem' }}>
            Akaun anda telah didaftarkan tetapi belum diluluskan oleh pentadbir sekolah.
            Sila hubungi pentadbir, kemudian tekan “Semak status”.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button type="button" className="btn btn-primary" onClick={() => void refresh()}>
              Semak status
            </button>
            <button type="button" className="btn btn-outline" onClick={() => void signOut()}>
              Log Keluar
            </button>
          </div>
        </main>
      ) : (
        <>
          <nav className="no-print" aria-label="Navigasi utama">
            <div className="tab-container">
              {navItems.map(({ route: item, label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`tab ${route.name === item.name ? 'active' : ''}`}
                  aria-current={route.name === item.name ? 'page' : undefined}
                  onClick={() => go(item)}
                >
                  <Icon size={18} aria-hidden="true" style={{ marginRight: '0.375rem' }} />
                  {label === 'Rekod Baru' && activeRecord ? 'Kemaskini Rekod' : label}
                </button>
              ))}
            </div>
          </nav>

          {submitError && (
            <div className="no-print alert alert-error" role="alert">
              {submitError}
            </div>
          )}

          <main className="no-print">
            <Suspense fallback={<PageLoading />}>
              {route.name === 'form' ? (
                <RPHForm
                  key={activeRecord?.id ?? 'new'}
                  currentUserId={user.id}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate({ name: 'records' })}
                  initialData={activeRecord ?? undefined}
                />
              ) : route.name === 'records' ? (
                <RPHRecords
                  records={records}
                  loading={loading}
                  error={recordsError}
                  totalCount={totalCount}
                  page={page}
                  setPage={setPage}
                  pageSize={pageSize}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onDelete={handleDelete}
                  onEdit={(record) => {
                    setEditingRecord(record);
                    navigate({ name: 'form', id: record.id });
                  }}
                />
              ) : route.name === 'dskp' ? (
                <DSKPManager isAdmin={isAdmin} />
              ) : route.name === 'admin' && isAdmin ? (
                <AdminPanel currentUserId={profile.id} />
              ) : (
                <SettingsComponent />
              )}
            </Suspense>
          </main>

          <nav className="bottom-nav no-print" aria-label="Navigasi utama mobil">
            {navItems.map(({ route: item, label, short, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-current={route.name === item.name ? 'page' : undefined}
                onClick={() => go(item)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{short}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }} className="no-print">
        &copy; {new Date().getFullYear()} eRPH SRI Al-Khairiah. Dibina oleh Cikgu Najmi.{' '}
        <a href={href({ name: 'settings' })} style={{ color: 'var(--primary)' }}>
          Tetapan akaun
        </a>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
