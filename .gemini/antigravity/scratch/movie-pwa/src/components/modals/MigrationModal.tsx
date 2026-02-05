import React, { useState, useEffect } from 'react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { Loader2, ArrowRightLeft, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface MigrationModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ isOpen, onComplete }) => {
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'migrating' | 'completed' | 'error'>('idle');
    const [count, setCount] = useState(0);


    useEffect(() => {
        if (isOpen && status === 'idle') {
            checkMigration();
        }
    }, [isOpen]);

    const checkMigration = async () => {
        setStatus('analyzing');
        try {
            const movies = await GoogleSheetsService.getInstance().findLegacyVHSMovies();
            if (movies.length > 0) {
                setCount(movies.length);
                setStatus('idle'); // Ready to migrate
            } else {
                onComplete(); // Nothing to migrate
            }
        } catch (e) {
            console.error("Migration check failed", e);
            onComplete(); // Skip on error to avoid blocking
        }
    };

    const handleMigrate = async () => {
        setStatus('migrating');
        try {
            const service = GoogleSheetsService.getInstance();
            const movies = await service.findLegacyVHSMovies();
            await service.migrateMoviesToVHSFile(movies);
            setStatus('completed');
        } catch (e) {
            console.error("Migration failed", e);
            setStatus('error');
        }
    };

    if (!isOpen || count === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-800 rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-xl">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <ArrowRightLeft className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Migração Necessária</h2>
                        <p className="text-sm text-neutral-400">Separando coleções DVD e VHS</p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-6">
                    {status === 'idle' && (
                        <div className="bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                            <p className="text-neutral-300 mb-2">
                                Detectamos <strong>{count} filmes VHS</strong> que precisam ser movidos para a nova planilha exclusiva de VHS.
                            </p>
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>Origem: MoviePWA DVD Collection</span>
                            </div>
                            <div className="flex flex-col items-center justify-center py-2">
                                <div className="h-4 w-0.5 bg-neutral-700 my-1"></div>
                                <ArrowRightLeft className="w-4 h-4 text-neutral-500 rotate-90" />
                                <div className="h-4 w-0.5 bg-neutral-700 my-1"></div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-primary-400">
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>Destino: MoviePWA VHS Collection</span>
                            </div>
                        </div>
                    )}

                    {status === 'migrating' && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                            <p className="text-white font-medium">Migrando filmes...</p>
                            <p className="text-sm text-neutral-400">Isso pode levar alguns segundos.</p>
                        </div>
                    )}

                    {status === 'completed' && (
                        <div className="text-center py-8">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Sucesso!</h3>
                            <p className="text-neutral-400">Sua coleção foi organizada corretamente.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-red-500/10 p-4 rounded-xl text-red-400 text-sm">
                            Ocorreu um erro durante a migração. Verifique o console ou tente novamente mais tarde.
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 transition-opacity duration-300">
                    {status === 'idle' && (
                        <button
                            onClick={handleMigrate}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-xl font-bold transition-all"
                        >
                            Confirmar Migração
                        </button>
                    )}
                    {(status === 'completed' || status === 'error') && (
                        <button
                            onClick={onComplete}
                            className="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-2 rounded-xl font-medium"
                        >
                            Continuar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
