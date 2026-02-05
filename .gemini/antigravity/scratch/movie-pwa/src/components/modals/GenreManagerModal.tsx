import React, { useState } from 'react';
import { X, Check, Trash2, Edit2, AlertTriangle, Loader2 } from 'lucide-react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useQueryClient } from '@tanstack/react-query';
import { useCollection } from '../../providers/CollectionProvider';
import { useGenres } from '../../hooks/useGenres';

interface GenreManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GenreManagerModal: React.FC<GenreManagerModalProps> = ({ isOpen, onClose }) => {
    const { format } = useCollection();
    const [newGenre, setNewGenre] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // Stores genre name currently being processed
    const [error, setError] = useState('');

    const queryClient = useQueryClient();
    const { data: genreCounts, isLoading: isLoadingGenres } = useGenres();

    if (!isOpen) return null;

    // Create
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGenre.trim()) return;
        if (!format) return;

        setIsSubmitting(true);
        setError('');

        try {
            if (!navigator.onLine) throw new Error("Offline. Cannot create genres.");

            await GoogleSheetsService.getInstance().createGenre(newGenre.trim(), format);
            await queryClient.invalidateQueries({ queryKey: ['genres'] });

            // Allow immediately adding another
            setNewGenre('');
            // onClose(); // Optional: Keep open to manage/add more
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to create genre. Check if it already exists.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Rename
    const handleRename = async (oldName: string) => {
        const newName = prompt(`Novo nome para "${oldName}":`, oldName);
        if (!newName || newName === oldName || !format) return;

        setActionLoading(oldName);
        try {
            await GoogleSheetsService.getInstance().renameGenre(oldName, newName.trim(), format);
            await queryClient.invalidateQueries();
        } catch (e: any) {
            alert("Erro ao renomear: " + (e.message || "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    // Delete
    const handleDelete = async (genreName: string, count: number) => {
        if (!format) return;

        const message = count > 0
            ? `⚠️ PERIGO: EXCLUSÃO DE DADOS ⚠️\n\nO gênero "${genreName}" contém ${count} filmes.\n\nAo excluir este gênero, TODOS os filmes nele serão APAGADOS PERMANENTEMENTE do Google Sheets.\n\nIsso NÃO pode ser desfeito.\nDeseja realmente continuar?`
            : `Excluir o gênero vazio "${genreName}"?`;

        if (!confirm(message)) return;

        // Double check for safety if it has movies
        if (count > 0) {
            if (!confirm(`Tem certeza ABSOLUTA? Digite OK para confirmar.`)) return;
        }

        setActionLoading(genreName);
        try {
            await GoogleSheetsService.getInstance().deleteGenre(genreName, format);
            await queryClient.invalidateQueries();
        } catch (e: any) {
            alert("Erro ao excluir: " + (e.message || "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">

                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-neutral-800/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Edit2 size={18} className="text-primary-400" />
                        Gerenciar Gêneros
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">

                    {/* Create New */}
                    <form onSubmit={handleSubmit} className="mb-6 bg-neutral-800/50 p-4 rounded-xl border border-white/5">
                        <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Novo Gênero</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newGenre}
                                onChange={(e) => setNewGenre(e.target.value)}
                                placeholder="ex: Documentário"
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-all placeholder:text-neutral-600"
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting || !newGenre.trim()}
                                className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                    </form>

                    {/* List */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider px-1">
                            Gêneros Existentes ({genreCounts?.length || 0})
                        </label>

                        {isLoadingGenres ? (
                            <div className="flex justify-center py-8 text-neutral-500">
                                <Loader2 size={24} className="animate-spin" />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {genreCounts?.map((g) => (
                                    <div key={g.genre} className="flex items-center justify-between p-3 bg-neutral-800 hover:bg-neutral-800/80 rounded-lg group border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{g.genre}</span>
                                            <span className="text-xs text-neutral-500">{g.count} filmes</span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {actionLoading === g.genre ? (
                                                <Loader2 size={18} className="text-primary-400 animate-spin m-2" />
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleRename(g.genre)}
                                                        className="p-2 hover:bg-blue-500/10 text-neutral-400 hover:text-blue-400 rounded-lg transition-colors"
                                                        title="Renomear"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(g.genre, g.count)}
                                                        className="p-2 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {(!genreCounts || genreCounts.length === 0) && (
                                    <p className="text-center text-neutral-500 py-4 text-sm">Nenhum gênero encontrado.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
