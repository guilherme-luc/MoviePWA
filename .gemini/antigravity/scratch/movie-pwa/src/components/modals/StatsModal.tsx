import React, { useMemo } from 'react';
import { X, PieChart, TrendingUp, Calendar } from 'lucide-react';
import type { Movie } from '../../types';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[];
    genres_: { genre: string; count: number }[]; // passed from useGenres or calculated
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, movies, genres_ }) => {

    const stats = useMemo(() => {
        if (!movies) return null;

        // 1. Decades
        const decades: Record<string, number> = {};
        movies.forEach(m => {
            const year = parseInt(m.year);
            if (!isNaN(year)) {
                const decade = Math.floor(year / 10) * 10;
                decades[decade] = (decades[decade] || 0) + 1;
            }
        });

        // 2. Top Genres (using passed data)
        const sortedGenres = [...genres_].sort((a, b) => b.count - a.count).slice(0, 5);
        const maxGenreCount = sortedGenres[0]?.count || 1;

        // 3. Total
        const total = movies.length;

        return { decades, sortedGenres, maxGenreCount, total };
    }, [movies, genres_]);

    if (!isOpen || !stats) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

            <div className="relative z-10 w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-neutral-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <PieChart size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Estatísticas da Coleção</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">

                    {/* Big Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-bold text-white block">{stats.total}</span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Filmes</span>
                        </div>
                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-bold text-indigo-400 block">{genres_.length}</span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Gêneros</span>
                        </div>
                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1">
                            <span className="text-3xl font-bold text-emerald-400 block">
                                {Object.keys(stats.decades).length}
                            </span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Décadas</span>
                        </div>
                    </div>

                    {/* Top Genres Bars */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-indigo-400" />
                            <h3 className="text-white font-semibold">Gêneros Favoritos</h3>
                        </div>
                        <div className="space-y-3">
                            {stats.sortedGenres.map(g => (
                                <div key={g.genre} className="group">
                                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                                        <span className="group-hover:text-white transition-colors">{g.genre}</span>
                                        <span>{g.count}</span>
                                    </div>
                                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                                            style={{ width: `${(g.count / stats.maxGenreCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Decades Grid */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar size={16} className="text-emerald-400" />
                            <h3 className="text-white font-semibold">Por Década</h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {Object.entries(stats.decades)
                                .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Descending
                                .map(([decade, count]) => (
                                    <div key={decade} className="bg-neutral-800/50 border border-white/5 p-3 rounded-xl hover:bg-neutral-800 transition-colors">
                                        <div className="text-emerald-400 font-bold text-lg">{decade}s</div>
                                        <div className="text-xs text-neutral-500">{count} filmes</div>
                                    </div>
                                ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
