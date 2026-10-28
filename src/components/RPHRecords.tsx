import React, { useState } from 'react';
import { Edit2, Trash2, Printer, Search, Loader2, Download, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RPHRecord } from '../types';
import { PDFReadyModal } from './PDFReadyModal';
import { ConfirmDialog } from './Modal';
import { useToast } from '../hooks/useToast';
import { todayMalaysia } from '../lib/dateUtils';
import { errorMessage } from '../lib/apiClient';

interface RPHRecordsProps {
    records: RPHRecord[];
    loading?: boolean;
    error?: string | null;
    totalCount: number;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onDelete: (id: string) => Promise<void>;
    onEdit: (record: RPHRecord) => void;
}

const recordLabel = (record: RPHRecord) => `${record.tarikh} ${record.kelas} ${record.subjek}`;

const StatusBadge: React.FC<{ status?: RPHRecord['status'] }> = ({ status }) => (
    <span className={`badge ${status === 'published' ? 'badge-published' : 'badge-draft'}`}>
        {status === 'published' ? 'Diterbitkan' : 'Draf'}
    </span>
);

/** Windowed page numbers so the control never overflows with many pages (audit S-11). */
const pageWindow = (current: number, total: number): number[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(2, Math.min(current - 2, total - 4));
    const pages = [1];
    for (let i = start; i < start + 3; i += 1) pages.push(i);
    pages.push(total);
    return pages;
};

const RPHCard: React.FC<{
    record: RPHRecord;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onEdit: (record: RPHRecord) => void;
    onDelete: (record: RPHRecord) => void;
    onPrint: (record: RPHRecord) => void;
}> = ({ record, isSelected, onToggleSelect, onEdit, onDelete, onPrint }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="card-panel mb-3"
    >
        <div className="flex items-start gap-3">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(record.id)}
                aria-label={`Pilih rekod ${recordLabel(record)}`}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <strong>{record.tarikh} · {record.hari}</strong>
                    <StatusBadge status={record.status} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {record.kelas} · {record.masa} · Tahun {record.tahun}
                </p>
                <p className="font-semibold">{record.subjek}</p>
                {record.content?.tajukStandardKandungan && (
                    <p className="line-clamp-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {record.content.tajukStandardKandungan}
                    </p>
                )}
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        className="btn btn-outline btn-sm flex-1"
                        onClick={() => onEdit(record)}
                        aria-label={`Edit rekod ${recordLabel(record)}`}
                    >
                        <Edit2 size={16} aria-hidden="true" /> Edit
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline btn-sm flex-1"
                        onClick={() => onDelete(record)}
                        aria-label={`Padam rekod ${recordLabel(record)}`}
                    >
                        <Trash2 size={16} aria-hidden="true" /> Padam
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm flex-1"
                        onClick={() => onPrint(record)}
                        aria-label={`Cetak rekod ${recordLabel(record)}`}
                    >
                        <Printer size={16} aria-hidden="true" /> Cetak
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
);

export const RPHRecords: React.FC<RPHRecordsProps> = ({
    records,
    loading,
    error,
    totalCount,
    page,
    setPage,
    pageSize,
    searchTerm,
    setSearchTerm,
    onDelete,
    onEdit
}) => {
    const { notify } = useToast();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<RPHRecord | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [pdfModalData, setPdfModalData] = useState<{ isOpen: boolean; url: string | null; fileName: string }>({
        isOpen: false,
        url: null,
        fileName: ''
    });

    // Only IDs on the current page count, so a stale selection can never produce an
    // empty bulk PDF after paging or searching (audit F-07).
    const selectedRecords = records.filter((record) => selectedIds.includes(record.id));
    const selectedOnPage = selectedRecords.map((record) => record.id);
    const isBulkPDF = selectedRecords.length > 0;

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        if (selectedOnPage.length === records.length && records.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(records.map((record) => record.id));
        }
    };

    const handleDownloadExcel = async () => {
        try {
            const { default: ExcelJS } = await import('exceljs');
            const dataToExport = records.map((rec) => ({
                Tarikh: rec.tarikh,
                Hari: rec.hari,
                Kelas: rec.kelas,
                Masa: rec.masa,
                Subjek: rec.subjek,
                'Tajuk / Standard Kandungan': rec.content?.tajukStandardKandungan || '',
                Aktiviti: rec.content?.aktiviti || '',
                Refleksi: rec.content?.refleksi || ''
            }));

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Rekod eRPH');
            worksheet.columns = Object.keys(dataToExport[0] ?? { Tarikh: '' }).map((header) => ({
                header,
                key: header,
                width: 24,
            }));
            worksheet.addRows(dataToExport);
            worksheet.getRow(1).font = { bold: true };

            const buffer = await workbook.xlsx.writeBuffer();
            const url = URL.createObjectURL(
                new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `Rekod_eRPH_Halaman_${page}_${todayMalaysia()}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            notify(`${dataToExport.length} rekod dieksport ke Excel.`);
        } catch (err) {
            notify(errorMessage(err), 'error');
        }
    };

    const openPdf = async (generate: () => Promise<Blob>, fileName: string) => {
        setIsGeneratingPDF(true);
        try {
            const { generateRPH_PDF, generateBulkRPH_PDF } = await import('../lib/pdfGenerator');
            void generateRPH_PDF;
            void generateBulkRPH_PDF;
            const blob = await generate();
            setPdfModalData({ isOpen: true, url: URL.createObjectURL(blob), fileName });
        } catch (err) {
            notify(errorMessage(err), 'error');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSinglePrint = (record: RPHRecord) =>
        openPdf(
            async () => (await import('../lib/pdfGenerator')).generateRPH_PDF(record),
            `eRPH_${record.tarikh}_${record.kelas.replace(/ /g, '_')}.pdf`,
        );

    const handleBulkPrint = () => {
        const chosen = selectedRecords;
        if (chosen.length === 0) return;
        void openPdf(
            async () => (await import('../lib/pdfGenerator')).generateBulkRPH_PDF(chosen),
            `eRPH_Bulk_${todayMalaysia()}.pdf`,
        );
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await onDelete(pendingDelete.id);
            setPendingDelete(null);
        } finally {
            setDeleting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <React.Fragment>
            <PDFReadyModal
                isOpen={pdfModalData.isOpen}
                onClose={() => {
                    if (pdfModalData.url) URL.revokeObjectURL(pdfModalData.url);
                    setPdfModalData({ ...pdfModalData, isOpen: false, url: null });
                }}
                pdfUrl={pdfModalData.url}
                fileName={pdfModalData.fileName}
            />

            <ConfirmDialog
                open={pendingDelete !== null}
                title="Padam rekod ini?"
                message={pendingDelete ? `Rekod ${recordLabel(pendingDelete)} akan dipadam secara kekal.` : ''}
                busy={deleting}
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => void confirmDelete()}
            />

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '1.5rem' }}>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <div>
                        <h2 style={{ color: 'var(--primary)', fontSize: '1.375rem' }}>Senarai Rekod Pengajaran</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Jumlah rekod: <strong>{totalCount}</strong>
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => (isBulkPDF ? handleBulkPrint() : void handleDownloadExcel())}
                            disabled={records.length === 0}
                        >
                            <Download size={20} aria-hidden="true" />
                            {isBulkPDF
                                ? `Muat Turun ${selectedRecords.length} Rekod (PDF)`
                                : `Muat Turun Halaman Ini — ${records.length} Rekod (Excel)`}
                        </button>
                        <div className="relative w-full md:w-auto">
                            <label htmlFor="record-search" className="field-label">Cari rekod</label>
                            <Search
                                aria-hidden="true"
                                size={20}
                                style={{ position: 'absolute', left: '0.75rem', bottom: '0.9rem', color: 'var(--text-muted)' }}
                            />
                            <input
                                id="record-search"
                                type="search"
                                placeholder="Subjek, kelas, hari atau masa"
                                className="pl-12"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                style={{ minWidth: '16rem' }}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <p className="alert alert-error" role="alert">
                        <AlertCircle size={18} aria-hidden="true" /> {error}
                    </p>
                )}

                <div className="mobile-only">
                    {loading ? (
                        <div className="py-10 text-center" role="status">
                            <Loader2 size={40} className="animate-spin mx-auto mb-2" aria-hidden="true" style={{ color: 'var(--primary)' }} />
                            <p>Memuatkan rekod…</p>
                        </div>
                    ) : records.length > 0 ? (
                        <>
                            <label className="flex items-center justify-between gap-3 mb-3" style={{ minHeight: '44px' }}>
                                <span>Pilih semua di halaman ini</span>
                                <input
                                    type="checkbox"
                                    checked={selectedOnPage.length === records.length && records.length > 0}
                                    onChange={toggleSelectAll}
                                    aria-label="Pilih semua rekod di halaman ini"
                                />
                            </label>
                            <AnimatePresence mode="popLayout">
                                {records.map((record) => (
                                    <RPHCard
                                        key={record.id}
                                        record={record}
                                        isSelected={selectedIds.includes(record.id)}
                                        onToggleSelect={toggleSelect}
                                        onEdit={onEdit}
                                        onDelete={setPendingDelete}
                                        onPrint={handleSinglePrint}
                                    />
                                ))}
                            </AnimatePresence>
                        </>
                    ) : (
                        <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                            <Search size={48} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
                            <h3 style={{ color: 'var(--text-main)' }}>
                                {searchTerm ? 'Tiada rekod sepadan' : 'Belum ada rekod'}
                            </h3>
                            <p>{searchTerm ? `Carian “${searchTerm}” tiada keputusan.` : 'Mulakan dengan tab Rekod Baru.'}</p>
                        </div>
                    )}
                </div>

                <div className="table-container desktop-only">
                    <table>
                        <caption className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
                            Senarai rekod RPH
                        </caption>
                        <thead>
                            <tr>
                                <th style={{ width: '56px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedOnPage.length === records.length && records.length > 0}
                                        onChange={toggleSelectAll}
                                        aria-label="Pilih semua rekod di halaman ini"
                                    />
                                </th>
                                <th>Tarikh / Hari</th>
                                <th>Kelas / Masa</th>
                                <th>Subjek / Tajuk</th>
                                <th>Status</th>
                                <th className="no-print">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                                            <Loader2 size={40} className="animate-spin mx-auto mb-3" aria-hidden="true" style={{ color: 'var(--primary)' }} />
                                            <p>Memuatkan rekod…</p>
                                        </td>
                                    </tr>
                                ) : records.length > 0 ? (
                                    records.map((record) => (
                                        <tr key={record.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(record.id)}
                                                    onChange={() => toggleSelect(record.id)}
                                                    aria-label={`Pilih rekod ${recordLabel(record)}`}
                                                />
                                            </td>
                                            <td>
                                                <div className="font-semibold">{record.tarikh}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{record.hari}</div>
                                            </td>
                                            <td>
                                                <div className="font-semibold">{record.kelas}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{record.masa}</div>
                                            </td>
                                            <td>
                                                <div className="font-semibold">{record.subjek}</div>
                                                <div className="line-clamp-2" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                    {record.content?.tajukStandardKandungan || '—'}
                                                </div>
                                            </td>
                                            <td><StatusBadge status={record.status} /></td>
                                            <td className="no-print">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => onEdit(record)}
                                                        aria-label={`Edit rekod ${recordLabel(record)}`}
                                                    >
                                                        <Edit2 size={16} aria-hidden="true" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => setPendingDelete(record)}
                                                        aria-label={`Padam rekod ${recordLabel(record)}`}
                                                    >
                                                        <Trash2 size={16} aria-hidden="true" /> Padam
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleSinglePrint(record)}
                                                        aria-label={`Cetak rekod ${recordLabel(record)}`}
                                                    >
                                                        <Printer size={16} aria-hidden="true" /> Cetak
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center">
                                            <h3 style={{ color: 'var(--text-main)' }}>
                                                {searchTerm ? 'Tiada rekod sepadan' : 'Belum ada rekod'}
                                            </h3>
                                            <p style={{ color: 'var(--text-muted)' }}>
                                                {searchTerm
                                                    ? `Carian “${searchTerm}” tiada keputusan.`
                                                    : 'Mulakan dengan tab Rekod Baru.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {!loading && totalPages > 0 && (
                    <nav
                        aria-label="Paginasi rekod"
                        className="flex justify-center items-center gap-3 mt-6 pt-3"
                        style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                        <button
                            type="button"
                            className="btn btn-outline btn-icon"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            aria-label="Halaman sebelumnya"
                        >
                            <ChevronLeft size={20} aria-hidden="true" />
                        </button>
                        <span style={{ fontWeight: 600 }}>Halaman {page} / {totalPages}</span>
                        {pageWindow(page, totalPages).map((number, index, list) => (
                            <React.Fragment key={number}>
                                {index > 0 && number - list[index - 1] > 1 && <span aria-hidden="true">…</span>}
                                <button
                                    type="button"
                                    className={`btn ${page === number ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                    aria-current={page === number ? 'page' : undefined}
                                    aria-label={`Halaman ${number}`}
                                    onClick={() => setPage(number)}
                                >
                                    {number}
                                </button>
                            </React.Fragment>
                        ))}
                        <button
                            type="button"
                            className="btn btn-outline btn-icon"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            aria-label="Halaman seterusnya"
                        >
                            <ChevronRight size={20} aria-hidden="true" />
                        </button>
                    </nav>
                )}
            </motion.div>

            {isGeneratingPDF && (
                <div className="page-center" role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, background: 'rgb(255 255 255 / 0.92)', zIndex: 10000 }}>
                    <Loader2 size={48} className="animate-spin" aria-hidden="true" style={{ color: 'var(--primary)' }} />
                    <h3 style={{ color: 'var(--primary)' }}>Menjana PDF…</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Sila tunggu sebentar.</p>
                </div>
            )}
        </React.Fragment>
    );
};
