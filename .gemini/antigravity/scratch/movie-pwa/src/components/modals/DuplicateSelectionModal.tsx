import React from 'react';
import { X, Film, Trash2, Edit2, Star, Disc, CassetteTape } from 'lucide-react';
import type { Movie } from '../../types';
import clsx from 'clsx';

interface DuplicateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupTitle: string;
    movies: Movie[];
    onEdit: (movie: Movie) => void;
    onDelete: (movie: Movie) => void;
}

export const DuplicateSelectionModal: React.FC<DuplicateSelectionModalProps> = ({
    isOpen,
    onClose,
    groupTitle,
    movies,
    onEdit,
    onDelete
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Film className="text-primary-500" />
                            {groupTitle}
                        </h2>
                        <p className="text-neutral-400 text-sm mt-1">
                            Este filme aparece {movies.length} vezes na sua coleção.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {movies.map((movie, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 border border-white/5 hover:border-white/10 rounded-xl transition-all group"
                        >
                            {/* Info */}
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                                    movie.format === 'VHS' ? 'bg-orange-600/20 text-orange-500' : 'bg-blue-600/20 text-blue-500'
                                )}>
                                    {movie.format === 'VHS' ? <CassetteTape size={18} /> : <Disc size={18} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">
                                            {movie.format || 'DVD'}
                                        </span>
                                        {movie.userRating && (
                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                                                <Star size={10} fill="currentColor" />
                                                {movie.userRating}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-0.5">
                                        ID: {movie.barcode || 'N/A'} • {movie.year}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(movie)}
                                    className="p-2 bg-neutral-700 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                    title="Editar esta cópia"
                                >
                                    <Edit2 size={16} />
                                    <span className="text-sm hidden sm:inline">Editar</span>
                                </button>
                                <button
                                    onClick={() => onDelete(movie)}
                                    className="p-2 bg-neutral-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                                    title="Excluir esta cópia"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-neutral-950/50 rounded-b-2xl border-t border-neutral-800 text-center">
                    <p className="text-xs text-neutral-500">
                        Cada cópia é independente. Editar uma não altera as outras.
                    </p>
                </div>
            </div>
        </div>
    );
};
