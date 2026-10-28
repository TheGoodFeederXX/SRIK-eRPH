import React from 'react';
import type { RPHRecord } from '../types';

interface RPHPrintLayoutProps {
    record: RPHRecord;
    minHeight?: string;
}

export const RPHPrintLayout: React.FC<RPHPrintLayoutProps> = ({ record, minHeight = '4.5in' }) => {
    return (
        <div
            className="print-record-container"
            style={{
                padding: '2.5rem',
                backgroundColor: 'white',
                minHeight: minHeight,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}
        >
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
                    <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>SEKOLAH RENDAH ISLAM AL-KHAIRIAH</h1>
                        <h2 style={{ fontSize: '1rem', margin: '0.2rem 0 0 0' }}>REKOD PENGAJARAN HARIAN</h2>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <div><strong>Tarikh:</strong> {record.tarikh}</div>
                    <div><strong>Hari:</strong> {record.hari}</div>
                    <div><strong>Kelas:</strong> {record.kelas}</div>
                    <div><strong>Masa:</strong> {record.masa}</div>
                </div>

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <strong>Subjek:</strong>
                    <div style={{ marginTop: '0.15rem' }}>{record.subjek}</div>
                </div>

                {record.content?.bidang && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <strong>Bidang:</strong>
                        <div style={{ marginTop: '0.15rem' }}>{record.content.bidang}</div>
                    </div>
                )}

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <strong>Tajuk / Standard Kandungan (SK):</strong>
                    <div style={{ marginTop: '0.15rem', whiteSpace: 'pre-wrap' }}>{record.content?.tajukStandardKandungan || '—'}</div>
                </div>

                {record.content?.sp && record.content.sp.length > 0 && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <strong>Standard Pembelajaran (SP):</strong>
                        <ul style={{ marginTop: '0.15rem', paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                            {record.content.sp.map((sp, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>{sp}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {record.content?.spi && record.content.spi.length > 0 && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <strong>Standard Prestasi (SPI):</strong>
                        <ul style={{ marginTop: '0.15rem', paddingLeft: '1.25rem', listStyleType: 'none' }}>
                            {record.content.spi.map((spi, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                    <strong>TP{spi.tp}:</strong> {spi.desc}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <strong>Objektif:</strong>
                    <div style={{ marginTop: '0.15rem', whiteSpace: 'pre-wrap' }}>{record.content?.objektif || '—'}</div>
                </div>

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <strong>Aktiviti:</strong>
                    <div style={{ marginTop: '0.15rem', whiteSpace: 'pre-wrap', minHeight: '80px' }}>{record.content?.aktiviti || '—'}</div>
                </div>

                <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <strong>Refleksi:</strong>
                    <div style={{ marginTop: '0.15rem', whiteSpace: 'pre-wrap' }}>{record.content?.refleksi || '-'}</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.8rem' }}>
                <div style={{ borderTop: '1px solid #000', width: '150px', textAlign: 'center', paddingTop: '0.25rem' }}>
                    <p>Tandatangan Guru</p>
                </div>
                <div style={{ borderTop: '1px solid #000', width: '150px', textAlign: 'center', paddingTop: '0.25rem' }}>
                    <p>Guru Besar/PK</p>
                </div>
            </div>
        </div >
    );
};
