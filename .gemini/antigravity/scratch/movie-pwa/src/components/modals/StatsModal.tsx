import React, { useMemo } from 'react';
import { X, PieChart, TrendingUp, Calendar } from 'lucide-react';
import type { Movie } from '../../types';
import { BadgeSystem } from '../gamification/BadgeSystem';


interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[];
    genres_: { genre: string; count: number }[]; // passed from useGenres or calculated
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, movies, genres_ }) => {

    const stats = useMemo(() => {
        if (!movies) return null;

        let watchedCount = 0;
        let totalUserRating = 0;
        let ratedMoviesCount = 0;

        // 1. Decades
        const decades: Record<string, number> = {};
        movies.forEach(m => {
            const year = parseInt(m.year);
            if (!isNaN(year)) {
                const decade = Math.floor(year / 10) * 10;
                decades[decade] = (decades[decade] || 0) + 1;
            }

            // Watched
            if (m.watched) watchedCount++;

            // Rating
            if (m.userRating) {
                const r = parseFloat(m.userRating);
                if (!isNaN(r)) {
                    totalUserRating += r;
                    ratedMoviesCount++;
                }
            }
        });

        // 2. Top Genres (using passed data)
        const sortedGenres = [...genres_].sort((a, b) => b.count - a.count).slice(0, 5);
        const maxGenreCount = sortedGenres[0]?.count || 1;

        // 3. Total
        const total = movies.length;
        const unwatchedCount = total - watchedCount;
        const avgRating = ratedMoviesCount > 0 ? (totalUserRating / ratedMoviesCount).toFixed(1) : '0.0';

        return { decades, sortedGenres, maxGenreCount, total, watchedCount, unwatchedCount, avgRating, ratedMoviesCount };
    }, [movies, genres_]);

    if (!isOpen || !stats) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

            <div className="relative z-10 w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-neutral-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg text-white shadow-lg shadow-primary-500/20">
                            <PieChart size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Estatísticas da Coleção</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">

                    {/* Big Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {/* Total */}
                        <div className="glass-panel bg-neutral-800/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-neutral-800/50 transition-colors group">
                            <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform duration-300">{stats.total}</span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1 font-medium">Filmes</span>
                        </div>

                        {/* Genres */}
                        <div className="glass-panel bg-neutral-800/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-neutral-800/50 transition-colors group">
                            <span className="text-3xl font-bold text-primary-400 group-hover:scale-110 transition-transform duration-300">{genres_.length}</span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1 font-medium">Gêneros</span>
                        </div>

                        {/* Avg Rating */}
                        <div className="glass-panel bg-neutral-800/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-neutral-800/50 transition-colors group">
                            <span className="text-3xl font-bold text-yellow-400 group-hover:scale-110 transition-transform duration-300 flex items-center gap-1">
                                {stats.avgRating} <span className="text-sm text-yellow-500/50">★</span>
                            </span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1 font-medium">Média ({stats.ratedMoviesCount})</span>
                        </div>

                        {/* Watched % */}
                        <div className="glass-panel bg-neutral-800/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-neutral-800/50 transition-colors group">
                            <span className="text-3xl font-bold text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                                {Math.round((stats.watchedCount / (stats.total || 1)) * 100)}%
                            </span>
                            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1 font-medium">Assistidos</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Top Genres Bars */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={18} className="text-primary-400" />
                                <h3 className="text-white font-semibold text-lg">Gêneros Favoritos</h3>
                            </div>
                            <div className="space-y-4 bg-neutral-800/20 p-5 rounded-3xl border border-white/5">
                                {stats.sortedGenres.map((g, idx) => (
                                    <div key={g.genre} className="group">
                                        <div className="flex justify-between text-xs font-medium text-neutral-400 mb-1.5 px-1">
                                            <span className="group-hover:text-white transition-colors">{g.genre}</span>
                                            <span>{g.count}</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-gradient-to-r from-primary-500 to-purple-500' :
                                                    idx === 1 ? 'bg-primary-600' :
                                                        'bg-neutral-600'
                                                    }`}
                                                style={{ width: `${(g.count / stats.maxGenreCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Watched Status Bar */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className={`w-2 h-2 rounded-full ${stats.unwatchedCount === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                    <h3 className="text-white font-semibold text-lg">Progresso</h3>
                                </div>
                                <div className="bg-neutral-800/20 p-5 rounded-3xl border border-white/5">
                                    <div className="flex h-4 w-full rounded-full overflow-hidden bg-black/50 mb-3">
                                        <div
                                            className="bg-emerald-500 h-full transition-all duration-1000"
                                            style={{ width: `${(stats.watchedCount / (stats.total || 1)) * 100}%` }}
                                            title="Assistidos"
                                        />
                                        <div
                                            className="bg-neutral-700 h-full transition-all duration-1000"
                                            style={{ width: `${(stats.unwatchedCount / (stats.total || 1)) * 100}%` }}
                                            title="Não Assistidos"
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-neutral-300">Assistidos: <strong className="text-white">{stats.watchedCount}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-neutral-700" />
                                            <span className="text-neutral-300">Fila: <strong className="text-white">{stats.unwatchedCount}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decades Grid (Compact) */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar size={18} className="text-emerald-400" />
                                    <h3 className="text-white font-semibold text-lg">Por Década</h3>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.entries(stats.decades)
                                        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
                                        .slice(0, 8) // Show top 8 decades to fit
                                        .map(([decade, count]) => (
                                            <div key={decade} className="bg-neutral-800/50 border border-white/5 p-2 rounded-xl text-center hover:bg-neutral-700 transition-colors">
                                                <div className="text-emerald-400 font-bold text-sm">{decade}s</div>
                                                <div className="text-[10px] text-neutral-500">{count}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5">
                        <BadgeSystem movies={movies} />
                    </div>

                </div>
            </div>
        </div>
    );
};
