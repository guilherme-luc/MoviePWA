import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useQueryClient } from '@tanstack/react-query';

interface GenreManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GenreManagerModal: React.FC<GenreManagerModalProps> = ({ isOpen, onClose }) => {
    const [newGenre, setNewGenre] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGenre.trim()) return;

        setIsSubmitting(true);
        setError('');

        try {
            if (!navigator.onLine) throw new Error("Offline. Cannot create genres.");

            await GoogleSheetsService.getInstance().createGenre(newGenre.trim());
            await queryClient.invalidateQueries({ queryKey: ['genres'] });

            setNewGenre('');
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to create genre. Check if it already exists.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Criar Gênero</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">NOME DO GÊNERO</label>
                        <input
                            type="text"
                            value={newGenre}
                            onChange={(e) => setNewGenre(e.target.value)}
                            placeholder="ex: Ficção Científica"
                            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-neutral-600"
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-neutral-400 font-medium hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !newGenre.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">Criando...</span>
                            ) : (
                                <>
                                    <span>Criar</span>
                                    <Check size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
