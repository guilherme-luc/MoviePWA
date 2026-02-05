import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Edit2 } from 'lucide-react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useQueryClient } from '@tanstack/react-query';
import { useCollection } from '../../providers/CollectionProvider';

interface GenreManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    genreToEdit?: string | null; // If present, entering Edit Mode
}

export const GenreManagerModal: React.FC<GenreManagerModalProps> = ({ isOpen, onClose, genreToEdit }) => {
    const [genreName, setGenreName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();
    const { format: contextFormat } = useCollection();

    useEffect(() => {
        if (isOpen) {
            setGenreName(genreToEdit || '');
            setError('');
        }
    }, [isOpen, genreToEdit]);

    if (!isOpen) return null;

    const isEditMode = !!genreToEdit;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!genreName.trim()) return;
        if (isEditMode && genreName === genreToEdit) {
            onClose(); // No change
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            if (!navigator.onLine) throw new Error("Offline. Cannot manage genres.");

            const format = contextFormat || 'DVD';

            if (isEditMode) {
                // Rename
                await GoogleSheetsService.getInstance().renameGenre(genreToEdit!, genreName.trim(), format);
            } else {
                // Create
                await GoogleSheetsService.getInstance().createGenre(genreName.trim(), format);
            }

            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            await queryClient.invalidateQueries({ queryKey: ['movies'] }); // Renaming might affect movies list queries if they rely on sheet names directly (they do)
            await queryClient.invalidateQueries({ queryKey: ['all_movies'] });

            setGenreName('');
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to save genre.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditMode || !genreToEdit) return;

        if (!confirm(`Tem certeza que deseja EXCLUIR o gênero "${genreToEdit}"?\n\n⚠️ ISSO APAGARÁ TODOS OS FILMES DESTE GÊNERO!\n\nEssa ação não pode ser desfeita.`)) {
            return;
        }

        // Double confirmation for safety
        const verification = prompt(`Para confirmar, digite o nome do gênero: "${genreToEdit}"`);
        if (verification !== genreToEdit) {
            alert("Nome incorreto. Exclusão cancelada.");
            return;
        }

        setIsSubmitting(true);
        try {
            const format = contextFormat || 'DVD';
            await GoogleSheetsService.getInstance().deleteGenre(genreToEdit, format);

            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['all_movies'] });

            onClose();
            alert("Gênero excluído com sucesso.");
        } catch (e: any) {
            console.error(e);
            alert("Erro ao excluir gênero: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-neutral-900 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-semibold text-white">
                        {isEditMode ? 'Editar Gênero' : 'Criar Gênero'}
                    </h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">NOME DO GÊNERO</label>
                        <input
                            type="text"
                            value={genreName}
                            onChange={(e) => setGenreName(e.target.value)}
                            placeholder="ex: Ficção Científica"
                            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-neutral-600"
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-between items-center pt-2">
                        {isEditMode ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Excluir Gênero"
                            >
                                <Trash2 size={20} />
                            </button>
                        ) : (
                            <div /> /* Spacer */
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-neutral-400 font-medium hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !genreName.trim()}
                                className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/20"
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">Salvando...</span>
                                ) : (
                                    <>
                                        <span>{isEditMode ? 'Salvar' : 'Criar'}</span>
                                        {isEditMode ? <Edit2 size={16} /> : <Check size={16} />}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

            </div>
        </div>
    );
};
