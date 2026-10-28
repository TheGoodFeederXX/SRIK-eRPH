import React, { useState, useEffect, useMemo } from 'react';
import { api, errorMessage } from '../lib/apiClient';
import { type ReferensiRPH } from '../types';
import {
    Plus, Search, Edit2, Trash2, X, Save,
    ChevronLeft, ChevronRight, Loader2,
    Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, ConfirmDialog } from './Modal';
import { useToast } from '../hooks/useToast';

export const DSKPManager: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
    const [records, setRecords] = useState<ReferensiRPH[]>([]);
    const [loading, setLoading] = useState(true);
    const { notify } = useToast();

    // Filter + server-side pagination state
    const [search, setSearch] = useState('');
    const [filterTahun, setFilterTahun] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<ReferensiRPH | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        subjek: '',
        tahun: '' as string | number,
        bidang: '',
        sk: '',
        sp: [''] as string[],
        spi: [] as Array<{ tp: number; desc: string }>,
    });
    const [isAddingNewSubjek, setIsAddingNewSubjek] = useState(false);
    const [isAddingNewTahun, setIsAddingNewTahun] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<ReferensiRPH | null>(null);

    useEffect(() => {
        void fetchRecords();
    }, [currentPage, itemsPerPage, search, filterTahun]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterTahun, itemsPerPage]);

    // Unique lists for dropdowns
    const uniqueSubjects = useMemo(() => {
        const subjects = records.map(r => r.subjek).filter(Boolean);
        return Array.from(new Set(subjects)).sort();
    }, [records]);

    const uniqueYears = useMemo(() => {
        const years = records.map(r => r.tahun).filter(t => t !== null && t !== undefined);
        return Array.from(new Set(years)).sort((a, b) => Number(a) - Number(b));
    }, [records]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const result = await api.listDskp({
                page: currentPage,
                pageSize: itemsPerPage,
                search: search.trim() || undefined,
                tahun: filterTahun ? Number(filterTahun) : undefined,
            });
            setRecords(result.data);
            setTotalCount(result.totalCount);
        } catch (error) {
            notify(errorMessage(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    const reload = async () => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            await fetchRecords();
        }
    };

    const payload = () => ({
        subjek: formData.subjek.trim(),
        tahun: Number(formData.tahun),
        bidang: formData.bidang.trim() || null,
        sk: formData.sk.trim(),
        sp: formData.sp.map((item) => item.trim()).filter(Boolean),
        spi: formData.spi.filter((item) => item.desc.trim()),
    });

    const resetForm = () => {
        setFormData({ subjek: '', tahun: '', bidang: '', sk: '', sp: [''], spi: [] });
        setIsAddingNewSubjek(false);
        setIsAddingNewTahun(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body = payload();
            if (body.sp.length === 0) {
                throw new Error('Sekurang-kurangnya satu Standard Pembelajaran diperlukan.');
            }

            await api.createDskp(body);
            await reload();
            setIsAddModalOpen(false);
            resetForm();
            notify('Rekod DSKP berjaya ditambah!', 'success');
        } catch (error) {
            notify(errorMessage(error), 'error');
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentRecord) return;

        try {
            const body = payload();
            if (body.sp.length === 0) {
                throw new Error('Sekurang-kurangnya satu Standard Pembelajaran diperlukan.');
            }

            await api.updateDskp(currentRecord.id, body);
            await reload();
            setIsEditModalOpen(false);
            setCurrentRecord(null);
            resetForm();
            notify('Rekod DSKP berjaya dikemaskini!', 'success');
        } catch (error) {
            notify(errorMessage(error), 'error');
        }
    };

    const handleDelete = async () => {
        if (!recordToDelete) return;

        try {
            await api.deleteDskp(recordToDelete.id);
            await reload();
            setRecordToDelete(null);
            notify('Rekod DSKP berjaya dipadam!', 'success');
        } catch (error) {
            notify(errorMessage(error), 'error');
        }
    };

    const openEditModal = (record: ReferensiRPH) => {
        setCurrentRecord(record);
        setFormData({
            subjek: record.subjek,
            tahun: record.tahun || '',
            bidang: record.bidang ?? '',
            sk: record.sk,
            sp: record.sp.length ? record.sp : [''],
            spi: record.spi,
        });
        setIsAddingNewSubjek(false);
        setIsAddingNewTahun(false);
        setIsEditModalOpen(true);
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
    const paginatedRecords = records;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '1.25rem' }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            marginBottom: '0.5rem',
                            letterSpacing: '-0.025em'
                        }}>
                            Pengurusan DSKP
                        </h2>
                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '1.05rem',
                            fontWeight: 500
                        }}>
                            Urus Subjek dan Standard Kandungan
                        </p>
                    </div>
                    {isAdmin && (
                    <button
                        onClick={() => {
                            resetForm();
                            setIsAddModalOpen(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.875rem 1.75rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(20, 133, 63, 0.2)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(20, 133, 63, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 133, 63, 0.2)';
                        }}
                    >
                        <Plus size={20} /> Tambah Rekod
                    </button>
                    )}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '2.5rem',
                    backgroundColor: '#f8fafc',
                    padding: '1.75rem',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                    <div>
                        <label htmlFor="dskp-search" className="field-label">Cari</label>
                        <div style={{ position: 'relative' }}>
                            <Search style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#94a3b8'
                            }} size={18} />
                            <input
                                type="text"
                                placeholder="Cari subjek, SK atau bidang..."
                                style={{
                                    width: '100%',
                                    paddingLeft: '3rem',
                                    paddingRight: '1rem',
                                    paddingTop: '0.75rem',
                                    paddingBottom: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: '1.5px solid #e2e8f0',
                                    fontSize: '0.95rem',
                                    backgroundColor: 'white',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
                                }}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20, 133, 63, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="dskp-filter-tahun" className="field-label">Tahun</label>
                        <select
                            id="dskp-filter-tahun"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                border: '1.5px solid #e2e8f0',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                transition: 'all 0.2s ease',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                            value={filterTahun}
                            onChange={(e) => setFilterTahun(e.target.value)}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20, 133, 63, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <option value="">Semua Tahun</option>
                            {[1, 2, 3, 4, 5, 6].map(t => (
                                <option key={t} value={t}>Tahun {t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    minHeight: '500px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{
                                backgroundColor: '#f8fafc',
                                borderBottom: '2px solid #e2e8f0'
                            }}>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '1.125rem 1.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    width: '18%'
                                }}>
                                    Subjek
                                </th>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '1.125rem 1.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    width: '12%'
                                }}>
                                    Tahun
                                </th>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '1.125rem 1.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    width: '52%'
                                }}>
                                    Tajuk / Standard Kandungan
                                </th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '1.125rem 1.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    width: '18%'
                                }}>
                                    Tindakan
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} style={{
                                            textAlign: 'center',
                                            padding: '4rem 1.5rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Loader2 size={40} className="animate-spin" style={{
                                                    color: 'var(--primary)',
                                                    marginBottom: '1rem'
                                                }} />
                                                <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>
                                                    Memuatkan data...
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{
                                            textAlign: 'center',
                                            padding: '4rem 1.5rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '1.05rem',
                                            fontWeight: 500
                                        }}>
                                            <div className="flex flex-col items-center gap-4">
                                                <Inbox size={48} strokeWidth={1} />
                                                <span>Tiada rekod ditemui.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((record) => (
                                        <motion.tr
                                            key={record.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td style={{
                                                padding: '1.25rem 1.5rem',
                                                fontSize: '0.95rem',
                                                fontWeight: 600,
                                                color: '#0f172a'
                                            }}>
                                                {record.subjek}
                                            </td>
                                            <td style={{
                                                padding: '1.25rem 1.5rem',
                                                fontSize: '0.9rem',
                                                color: '#64748b',
                                                fontWeight: 500
                                            }}>
                                                {record.tahun ? `Tahun ${record.tahun}` : '-'}
                                            </td>
                                            <td style={{
                                                padding: '1.25rem 1.5rem',
                                                fontSize: '0.9rem',
                                                color: '#475569',
                                                lineHeight: '1.7',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {record.sk}
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
                                                    {!isAdmin && (
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', alignSelf: 'center' }}>Baca sahaja</span>
                                                    )}
                                                    {isAdmin && (<>
                                                    <button
                                                        onClick={() => openEditModal(record)}
                                                        style={{
                                                            padding: '0.625rem',
                                                            backgroundColor: 'white',
                                                            border: '1.5px solid #dbeafe',
                                                            borderRadius: '0.625rem',
                                                            color: '#2563eb',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Edit"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                                            e.currentTarget.style.borderColor = '#2563eb';
                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                            e.currentTarget.style.borderColor = '#dbeafe';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <Edit2 size={17} />
                                                    </button>
                                                    <button
                                                        onClick={() => setRecordToDelete(record)}
                                                        style={{
                                                            padding: '0.625rem',
                                                            backgroundColor: 'white',
                                                            border: '1.5px solid #fee2e2',
                                                            borderRadius: '0.625rem',
                                                            color: '#dc2626',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Padam"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#fef2f2';
                                                            e.currentTarget.style.borderColor = '#dc2626';
                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                            e.currentTarget.style.borderColor = '#fee2e2';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                    </>)}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {!loading && records.length > 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1.5rem',
                        marginTop: '2rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #e2e8f0',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.95rem',
                            color: '#64748b',
                            fontWeight: 500
                        }}>
                            <span>Papar</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                style={{
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '0.625rem',
                                    padding: '0.5rem 0.75rem',
                                    outline: 'none',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    color: '#475569',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>dari <strong style={{ color: '#0f172a' }}>{totalCount}</strong> rekod</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '0.625rem',
                                    borderRadius: '0.625rem',
                                    border: '1.5px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#475569'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentPage !== 1) {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <ChevronLeft size={20} aria-hidden="true" />
                                <span className="sr-only">Halaman sebelumnya</span>
                            </button>
                            <span style={{
                                fontWeight: 600,
                                color: '#0f172a',
                                fontSize: '0.95rem',
                                padding: '0 0.5rem'
                            }}>
                                Halaman {currentPage} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                style={{
                                    padding: '0.625rem',
                                    borderRadius: '0.625rem',
                                    border: '1.5px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                                    opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#475569'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentPage !== totalPages && totalPages !== 0) {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <ChevronRight size={20} aria-hidden="true" />
                                <span className="sr-only">Halaman seterusnya</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                open={isAddModalOpen || isEditModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                }}
                title={isAddModalOpen ? 'Tambah DSKP Baru' : 'Kemaskini DSKP'}
                wide
            >
                <form onSubmit={isAddModalOpen ? handleAdd : handleEdit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="dskp-subjek">Subjek</label>
                            {!isAddingNewSubjek ? (
                                <select
                                    id="dskp-subjek"
                                    required
                                    value={formData.subjek}
                                    onChange={(e) => {
                                        if (e.target.value === 'ADD_NEW') {
                                            setIsAddingNewSubjek(true);
                                            setFormData({ ...formData, subjek: '' });
                                        } else {
                                            setFormData({ ...formData, subjek: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Pilih Subjek</option>
                                    {uniqueSubjects.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                    <option value="ADD_NEW">+ Tambah Subjek Baru</option>
                                </select>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={formData.subjek}
                                        onChange={e => setFormData({ ...formData, subjek: e.target.value })}
                                        placeholder="Nama Subjek Baru"
                                        aria-label="Nama subjek baharu"
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNewSubjek(false)}
                                        className="btn btn-outline btn-icon"
                                        style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', border: 'none' }}
                                        aria-label="Kembali ke senarai subjek"
                                    >
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="dskp-tahun">Tahun</label>
                            {!isAddingNewTahun ? (
                                <select
                                    id="dskp-tahun"
                                    required
                                    value={formData.tahun}
                                    onChange={(e) => {
                                        if (e.target.value === 'ADD_NEW') {
                                            setIsAddingNewTahun(true);
                                            setFormData({ ...formData, tahun: '' });
                                        } else {
                                            setFormData({ ...formData, tahun: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Pilih Tahun</option>
                                    {uniqueYears.map(t => (
                                        <option key={String(t)} value={String(t)}>Tahun {t}</option>
                                    ))}
                                    <option value="ADD_NEW">+ Tambah Tahun Baru</option>
                                </select>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max="6"
                                        required
                                        autoFocus
                                        value={formData.tahun}
                                        onChange={e => setFormData({ ...formData, tahun: e.target.value })}
                                        placeholder="1 – 6"
                                        aria-label="Tahun"
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNewTahun(false)}
                                        className="btn btn-outline btn-icon"
                                        style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', border: 'none' }}
                                        aria-label="Kembali ke senarai tahun"
                                    >
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="dskp-bidang">Bidang (pilihan)</label>
                        <input
                            id="dskp-bidang"
                            type="text"
                            value={formData.bidang}
                            onChange={e => setFormData({ ...formData, bidang: e.target.value })}
                            placeholder="Contoh: Al-Quran"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="dskp-sk">Standard Kandungan (SK)</label>
                        <textarea
                            id="dskp-sk"
                            required
                            rows={3}
                            value={formData.sk}
                            onChange={e => setFormData({ ...formData, sk: e.target.value })}
                            placeholder="Masukkan butiran SK…"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <fieldset className="input-group">
                        <legend className="field-label">Standard Pembelajaran (SP) — sekurang-kurangnya satu</legend>
                        {formData.sp.map((item, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    required
                                    value={item}
                                    aria-label={`SP ${index + 1}`}
                                    placeholder={`SP ${index + 1}`}
                                    onChange={(e) => {
                                        const next = [...formData.sp];
                                        next[index] = e.target.value;
                                        setFormData({ ...formData, sp: next });
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline btn-icon"
                                    aria-label={`Buang SP ${index + 1}`}
                                    onClick={() => setFormData({ ...formData, sp: formData.sp.filter((_, i) => i !== index) })}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setFormData({ ...formData, sp: [...formData.sp, ''] })}
                        >
                            <Plus size={16} aria-hidden="true" /> Tambah SP
                        </button>
                    </fieldset>

                    <fieldset className="input-group">
                        <legend className="field-label">Standard Prestasi (SPI) — pilihan</legend>
                        {formData.spi.map((item, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="number"
                                    min="0"
                                    style={{ maxWidth: '90px' }}
                                    value={item.tp}
                                    aria-label={`TP untuk SPI ${index + 1}`}
                                    onChange={(e) => {
                                        const next = [...formData.spi];
                                        next[index] = { ...next[index], tp: Number(e.target.value) };
                                        setFormData({ ...formData, spi: next });
                                    }}
                                />
                                <input
                                    type="text"
                                    value={item.desc}
                                    aria-label={`Huraian SPI ${index + 1}`}
                                    placeholder="Huraian tahap penguasaan"
                                    onChange={(e) => {
                                        const next = [...formData.spi];
                                        next[index] = { ...next[index], desc: e.target.value };
                                        setFormData({ ...formData, spi: next });
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline btn-icon"
                                    aria-label={`Buang SPI ${index + 1}`}
                                    onClick={() => setFormData({ ...formData, spi: formData.spi.filter((_, i) => i !== index) })}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setFormData({ ...formData, spi: [...formData.spi, { tp: formData.spi.length + 1, desc: '' }] })}
                        >
                            <Plus size={16} aria-hidden="true" /> Tambah SPI
                        </button>
                    </fieldset>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setIsEditModalOpen(false);
                            }}
                        >
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Save size={18} aria-hidden="true" /> Simpan
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={recordToDelete !== null}
                title="Padam rekod DSKP?"
                message={recordToDelete ? `Rekod "${recordToDelete.subjek}" — ${recordToDelete.sk} akan dipadam secara kekal.` : ''}
                onCancel={() => setRecordToDelete(null)}
                onConfirm={() => void handleDelete()}
            />

        </motion.div>
    );
};
