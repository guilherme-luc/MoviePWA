import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useCollection } from '../../providers/CollectionProvider';
import { Loader2, Disc, CassetteTape } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartupGenreModalProps {
    isOpen: boolean;
}

export const StartupGenreModal: React.FC<StartupGenreModalProps> = ({ isOpen }) => {
    const { format } = useCollection();
    const [genreName, setGenreName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!genreName.trim() || !format) return;

        setIsSubmitting(true);
        try {
            await GoogleSheetsService.getInstance().createGenre(genreName.trim(), format);
            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            // The modal will close automatically because the parent component (HomePage) 
            // will track genre count, which is now > 0
        } catch (error) {
            console.error("Failed to create genre", error);
            alert("Erro ao criar gênero. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isVHS = format === 'VHS';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isVHS ? 'from-orange-500 via-red-500 to-purple-600' : 'from-blue-500 via-cyan-400 to-blue-600'}`} />

                    <div className="flex flex-col items-center text-center mb-8 mt-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${isVHS ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isVHS ? <CassetteTape size={40} /> : <Disc size={40} />}
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            {isVHS ? 'Inicie sua Coleção VHS' : 'Inicie sua Coleção DVD'}
                        </h2>
                        <p className="text-neutral-400">
                            Para começar, crie sua primeira categoria (gênero) para organizar seus filmes.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={genreName}
                                onChange={(e) => setGenreName(e.target.value)}
                                placeholder="Ex: Ação, Comédia, Terror..."
                                className="w-full bg-neutral-800 border-2 border-neutral-700 focus:border-primary-500 focus:outline-none rounded-xl px-4 py-4 text-white text-lg placeholder-neutral-500 text-center transition-colors"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!genreName.trim() || isSubmitting}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                                ${!genreName.trim()
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                    : isVHS
                                        ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/20'
                                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-900/20'
                                }
                            `}
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    Criar Categoria
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
