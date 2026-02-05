import React, { useState } from 'react';
import { ArrowRight, Film } from 'lucide-react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useQueryClient } from '@tanstack/react-query';
import { useCollection } from '../../providers/CollectionProvider';

interface StartupGenreModalProps {
    isOpen: boolean;
}

export const StartupGenreModal: React.FC<StartupGenreModalProps> = ({ isOpen }) => {
    const [newGenre, setNewGenre] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();
    const { format } = useCollection();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGenre.trim()) return;

        setIsSubmitting(true);
        setError('');

        try {
            if (!navigator.onLine) throw new Error("Offline. Cannot create genres.");

            // Use current format
            const targetFormat = format || 'DVD';
            await GoogleSheetsService.getInstance().createGenre(newGenre.trim(), targetFormat);

            await queryClient.invalidateQueries({ queryKey: ['genres'] });

            setNewGenre('');
            // No onClose needed really, the parent condition (genres.length === 0) will become false
            // But we might want to reload or just let React Query handle it.
            // React Query update should cause the parent to unmount this modal automatically if logic is right.
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to create genre.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-neutral-900 rounded-2xl w-full max-w-sm shadow-2xl border border-primary-500/30 overflow-hidden animate-in zoom-in-95 duration-300">

                <div className="p-8 pb-0 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
                        <Film className="text-primary-500" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Bem-vindo!</h3>
                    <p className="text-neutral-400 text-sm">
                        Sua coleção {format === 'VHS' ? 'de Fitas VHS' : 'de DVDs'} está vazia.
                        Para começar, crie sua primeira categoria (gênero).
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-4">
                    <div>
                        <input
                            type="text"
                            value={newGenre}
                            onChange={(e) => setNewGenre(e.target.value)}
                            placeholder="ex: Ação, Comédia, Nostalgia..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-neutral-700"
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting || !newGenre.trim()}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] mt-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Criando...</span>
                        ) : (
                            <>
                                <span>Começar Coleção</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <p className="text-xs text-neutral-600 text-center mt-2">
                        Você poderá adicionar mais gêneros depois.
                    </p>
                </form>

            </div>
        </div>
    );
};
