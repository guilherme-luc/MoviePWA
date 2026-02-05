import React, { useState, useEffect } from 'react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { Loader2, ArrowRightLeft, Check, AlertTriangle } from 'lucide-react';
import type { Movie } from '../../types';

interface MigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    legacyMovies: Movie[];
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ isOpen, onClose, legacyMovies }) => {
    const [status, setStatus] = useState<'idle' | 'migrating' | 'completed' | 'error'>('idle');
    // const [progress, setProgress] = useState(0); // Removed unused progress state
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Auto-start migration or wait for user button?
            // Let's ask user confirmation first in the UI
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleMigration = async () => {
        setStatus('migrating');
        // setProgress(0);
        setError('');

        try {
            const service = GoogleSheetsService.getInstance();
            await service.migrateMoviesToVHSFile(legacyMovies);
            setStatus('completed');
        } catch (err: any) {
            console.error("Migration failed:", err);
            setError(err.message || "Erro desconhecido na migração.");
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl border border-amber-500/30 overflow-hidden">

                <div className="p-6 text-center border-b border-white/5">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <ArrowRightLeft className="text-amber-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Migração Necessária</h3>
                    <p className="text-amber-400 font-mono text-sm tracking-widest uppercase">DETECTADO FORMATO VHS ANTIGO</p>
                </div>

                <div className="p-6">
                    {status === 'idle' && (
                        <div className="flex flex-col gap-4">
                            <p className="text-neutral-300 text-sm leading-relaxed text-center">
                                Encontramos <b>{legacyMovies.length}</b> filmes marcados como VHS na sua planilha antiga.
                                <br /><br />
                                Para usar o novo sistema de <b>Coleção VHS dedicada</b>, precisamos mover esses itens para a nova planilha.
                            </p>
                            <button
                                onClick={handleMigration}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                            >
                                MIGRAR AGORA
                            </button>
                        </div>
                    )}

                    {status === 'migrating' && (
                        <div className="flex flex-col items-center py-6">
                            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                            <h4 className="text-white font-medium">Movendo seus filmes...</h4>
                            <p className="text-neutral-400 text-xs mt-2">Isso pode levar alguns instantes.</p>
                            <p className="text-neutral-500 text-xs mt-4">Não feche a janela.</p>
                        </div>
                    )}

                    {status === 'completed' && (
                        <div className="flex flex-col items-center py-2">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <Check className="text-green-500" size={24} />
                            </div>
                            <h4 className="text-white font-bold text-lg">Migração Concluída!</h4>
                            <p className="text-neutral-400 text-sm mt-2 text-center">
                                Seus filmes VHS agora estão seguros na nova coleção.
                            </p>
                            <button
                                onClick={() => {
                                    window.location.reload(); // Reload to refresh data
                                }}
                                className="mt-6 w-full bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded-lg"
                            >
                                Recarregar Aplicação
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center py-2">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <h4 className="text-white font-bold">Falha na Migração</h4>
                            <p className="text-red-400 text-sm mt-2 text-center">{error}</p>

                            <div className="flex gap-2 w-full mt-6">
                                <button
                                    onClick={onClose}
                                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded-lg"
                                >
                                    Ignorar (Não recomendado)
                                </button>
                                <button
                                    onClick={handleMigration}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-medium py-2 rounded-lg"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
