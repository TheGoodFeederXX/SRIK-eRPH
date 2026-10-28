import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api } from './lib/apiClient';

vi.mock('./lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('./lib/apiClient')>('./lib/apiClient');
  return {
    ...actual,
    api: {
      session: vi.fn(),
      dskpMeta: vi.fn(),
      listRecords: vi.fn(),
      listDskp: vi.fn(),
      members: vi.fn(),
      logout: vi.fn(),
    },
  };
});

const activeTeacher = {
  user: { id: 'u1', email: 'guru@sekolah.edu.my', name: 'Guru' },
  profile: { id: 'u1', email: 'guru@sekolah.edu.my', name: 'Guru', role: 'teacher' as const, status: 'active' as const },
};

describe('App shell', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.mocked(api.dskpMeta).mockResolvedValue({ subjects: ['Sains'], years: [3] });
    vi.mocked(api.listRecords).mockResolvedValue({ data: [], totalCount: 0, page: 1, pageSize: 10 });
    vi.mocked(api.listDskp).mockResolvedValue({ data: [], totalCount: 0, page: 1, pageSize: 10 });
    vi.mocked(api.members).mockResolvedValue({ members: [] });
  });

  it('shows the login page without a session', async () => {
    vi.mocked(api.session).mockResolvedValue({ user: null, profile: null });
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /Selamat Kembali/i })).toBeTruthy());
  });

  it('renders the worker shell with navigation for an active teacher', async () => {
    vi.mocked(api.session).mockResolvedValue(activeTeacher);
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /eRPH/ })).toBeTruthy());
    expect(screen.getAllByRole('button', { name: /Senarai Rekod/i }).length).toBeGreaterThan(0);
    // Teachers never see the admin tab.
    expect(screen.queryByRole('button', { name: /^Pengguna$/i })).toBeNull();
  });

  it('renders the pending-approval screen with a status check', async () => {
    vi.mocked(api.session).mockResolvedValue({
      ...activeTeacher,
      profile: { ...activeTeacher.profile, status: 'pending' },
    });
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: /menunggu kelulusan/i })).toBeTruthy());
    expect(screen.getByRole('button', { name: /Semak status/i })).toBeTruthy();
  });

  it('navigates by hash to the DSKP view', async () => {
    vi.mocked(api.session).mockResolvedValue(activeTeacher);
    window.location.hash = '#/dskp';
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: /Pengurusan DSKP/i })).toBeTruthy());
  });
});
