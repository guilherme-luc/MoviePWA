import React, { useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMovies } from '../hooks/useMovies';
import { ArrowLeft, Search, Plus, Edit2, Wand2, Loader2, CheckSquare, Trash2, X, Star, Eye } from 'lucide-react';
import { MovieEditorModal } from '../components/modals/MovieEditorModal';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import type { Movie } from '../types';
import { MovieCardSkeleton } from '../components/movies/MovieCardSkeleton';

export const MoviesPage: React.FC = () => {
    const { genre } = useParams<{ genre: string }>();
    const decodedGenre = decodeURIComponent(genre || '');
    const queryClient = useQueryClient();

    const { data: movies, isLoading } = useMovies(decodedGenre);
    const [search, setSearch] = useState('');

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | undefined>(undefined);

    // Bulk Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);

    // Auto-Fetch State
    const [isAutoFetching, setIsAutoFetching] = useState(false);
    const isAutoFetchingRef = useRef(false);
    const [autoFetchProgress, setAutoFetchProgress] = useState(0);
    const [autoFetchTotal, setAutoFetchTotal] = useState(0);

    // Filter State
    const [viewMode, setViewMode] = useState<'all' | 'watched' | 'watchlist'>('all');

    const filteredMovies = useMemo(() => {
        if (!movies) return [];
        const q = search.toLowerCase();

        let result = movies.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.barcode.toLowerCase().includes(q) ||
            m.year.includes(q)
        );

        // Apply View Mode Filter
        if (viewMode === 'watched') {
            result = result.filter(m => m.watched);
        } else if (viewMode === 'watchlist') {
            result = result.filter(m => !m.watched);
        }

        return result;
    }, [movies, search, viewMode]);

    const handleEdit = (movie: Movie) => {
        if (isSelectionMode) {
            handleToggleSelection(movie);
        } else {
            setSelectedMovie(movie);
            setIsEditorOpen(true);
        }
    };

    const handleAddNew = () => {
        setSelectedMovie(undefined);
        setIsEditorOpen(true);
    };

    // Selection Logic
    const handleToggleSelection = (movie: Movie) => {
        if (selectedMovies.some(m => m === movie)) {
            setSelectedMovies(prev => prev.filter(m => m !== movie));
        } else {
            setSelectedMovies(prev => [...prev, movie]);
        }
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedMovies([]);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedMovies.length} filmes? Esta ação não pode ser desfeita.`)) return;

        // Sort descending by index to avoid shifting issues when deleting rows
        // Note: This relies on _rowIndex being accurate.
        const sortedToDelete = [...selectedMovies].sort((a, b) => (b._rowIndex || 0) - (a._rowIndex || 0));

        try {
            // Sequential delete for safety
            for (const movie of sortedToDelete) {
                await GoogleSheetsService.getInstance().deleteMovie(movie);
            }
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            exitSelectionMode();
            alert("Filmes excluídos com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir alguns filmes.");
        }
    };

    const handleMagicWand = async () => {
        if (isAutoFetchingRef.current) {
            isAutoFetchingRef.current = false;
            setIsAutoFetching(false);
            return;
        }

        const missingImages = movies?.filter(m => !m.imageValue && m.title) || [];
        if (missingImages.length === 0) {
            alert("Todos os filmes já têm capa! 🎉");
            return;
        }

        const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
        if (!apiKey) {
            // Fix: Use prompt to ask for key if missing, or redirect
            const key = prompt("API Key do TMDB não encontrada. Insira sua chave:");
            if (key) {
                localStorage.setItem('tmdb_api_key', key);
            } else {
                return;
            }
        }
        // ... (rest of logic)

        if (!confirm(`Deseja buscar capas automaticamente para ${missingImages.length} filmes?`)) return;

        setIsAutoFetching(true);
        isAutoFetchingRef.current = true;
        setAutoFetchTotal(missingImages.length);
        setAutoFetchProgress(0);

        const updates: { movie: Movie, imageType: 'tmdb', imageValue: string }[] = [];
        const BATCH_SIZE = 10;

        let successCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;

        for (let i = 0; i < missingImages.length; i++) {
            if (!isAutoFetchingRef.current) break;

            const movie = missingImages[i];
            try {
                const query = encodeURIComponent(movie.title);
                const yearParam = movie.year ? `&year=${movie.year}` : '';
                const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey || localStorage.getItem('tmdb_api_key')}&query=${query}${yearParam}&language=pt-BR&include_adult=false`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.results && data.results.length > 0) {
                    const best = data.results.sort((a: any, b: any) => b.popularity - a.popularity)[0];
                    if (best && best.poster_path) {
                        updates.push({
                            movie,
                            imageType: 'tmdb',
                            imageValue: best.poster_path
                        });
                        successCount++;
                    } else {
                        notFoundCount++;
                    }
                } else {
                    notFoundCount++;
                }

                await new Promise(r => setTimeout(r, 350));

            } catch (e) {
                errorCount++;
            }

            setAutoFetchProgress(prev => prev + 1);

            if (updates.length >= BATCH_SIZE || i === missingImages.length - 1) {
                if (updates.length > 0) {
                    await GoogleSheetsService.getInstance().batchUpdateImages(updates);
                    await queryClient.invalidateQueries({ queryKey: ['movies'] });
                    updates.length = 0;
                }
            }
        }

        setIsAutoFetching(false);
        isAutoFetchingRef.current = false;
        alert(`Processo finalizado!\n\n✅ Atualizados: ${successCount}`);
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            <MovieEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                movieToEdit={selectedMovie}
                initialGenre={decodedGenre}
            />

            {/* Selection Header */}
            {isSelectionMode ? (
                <div className="flex items-center justify-between mb-6 bg-indigo-500/10 p-4 -mx-4 sm:mx-0 sm:rounded-2xl border border-indigo-500/30">
                    <div className="flex items-center gap-3">
                        <button onClick={exitSelectionMode} className="p-2 text-white hover:bg-white/10 rounded-full">
                            <X size={20} />
                        </button>
                        <span className="font-bold text-indigo-200">{selectedMovies.length} selecionados</span>
                    </div>
                    <button onClick={() => {
                        if (selectedMovies.length === filteredMovies.length) {
                            setSelectedMovies([]);
                        } else {
                            setSelectedMovies(filteredMovies);
                        }
                    }} className="text-sm text-indigo-400 font-medium">
                        {selectedMovies.length === filteredMovies.length ? 'Desmarcar' : 'Todos'}
                    </button>
                </div>
            ) : (
                /* Normal Header */
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="p-2 rounded-full hover:bg-white/5 text-neutral-300 transition-colors">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h2 className="text-2xl font-bold text-white max-w-[200px] truncate">{decodedGenre}</h2>
                                <p className="text-neutral-400 text-sm">{movies?.length || 0} filmes</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* Select Mode Button */}
                            <button
                                onClick={() => setIsSelectionMode(true)}
                                className="p-3 bg-neutral-800 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all"
                                title="Selecionar Filmes"
                            >
                                <CheckSquare size={20} />
                            </button>

                            {/* Magic Wand Button */}
                            <button
                                onClick={handleMagicWand}
                                disabled={isAutoFetching && autoFetchProgress > 0}
                                className={`p-3 rounded-full transition-all ${isAutoFetching
                                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                                    : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                                    }`}
                            >
                                {isAutoFetching ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex p-1 bg-neutral-900 rounded-xl">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setViewMode('watched')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${viewMode === 'watched' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <Eye size={12} />
                            Vistos
                        </button>
                        <button
                            onClick={() => setViewMode('watchlist')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${viewMode === 'watchlist' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <Star size={12} />
                            Watchlist
                        </button>
                    </div>
                </div>
            )}

            {/* Progress Bar (Auto Fetch) */}
            {isAutoFetching && (
                <div className="mb-6 bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(autoFetchProgress / autoFetchTotal) * 100}%` }}
                    />
                </div>
            )}

            {/* Search */}
            {!isSelectionMode && (
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar título, ano ou código..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-neutral-800 border-none rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                    />
                </div>
            )}

            {/* List */}
            <div className="flex-1 pb-32">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <MovieCardSkeleton key={i} />)}
                    </div>
                ) : filteredMovies.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                        <p>Nenhum filme encontrado.</p>
                        {search && <button onClick={() => setSearch('')} className="text-indigo-400 text-sm mt-2">Limpar busca</button>}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredMovies.map((movie) => {
                            const isSelected = selectedMovies.some(m => m === movie);
                            return (
                                <div
                                    key={`${movie._rowIndex}-${movie.barcode}`}
                                    className={`
                                        glass-panel p-3 rounded-xl flex items-center gap-3 justify-between group active:scale-[0.99] transition-all
                                        ${isSelectionMode ? 'cursor-pointer' : ''}
                                        ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : ''}
                                    `}
                                    onClick={() => handleEdit(movie)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">

                                        {/* Checkbox for Selection */}
                                        {isSelectionMode && (
                                            <div className={`
                                                w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0
                                                ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-neutral-600'}
                                             `}>
                                                {isSelected && <CheckSquare size={14} className="text-white" />}
                                            </div>
                                        )}

                                        {/* Thumbnail */}
                                        <div className="w-12 h-16 bg-neutral-900 rounded-md flex-shrink-0 overflow-hidden border border-white/5 relative">
                                            {movie.imageValue ? (
                                                <img
                                                    src={movie.imageType === 'tmdb'
                                                        ? `https://image.tmdb.org/t/p/w92${movie.imageValue}`
                                                        : movie.imageValue}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                                    <div className="w-4 h-4 bg-white/10 rounded-full" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="overflow-hidden">
                                            <h3 className={`font-semibold transition-colors ${isSelected ? 'text-indigo-200' : 'text-neutral-200'}`}>
                                                {movie.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-xs text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full">{movie.year}</span>

                                                {/* User Rating Badge */}
                                                {movie.userRating && (
                                                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                                        <Star size={10} fill="currentColor" /> {movie.userRating}
                                                    </span>
                                                )}

                                                {/* Watched Badge */}
                                                {movie.watched && (
                                                    <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1" title="Assistido">
                                                        <Eye size={12} />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!isSelectionMode && (
                                        <button className="p-2 text-neutral-600 group-hover:text-indigo-400 transition-colors flex-shrink-0">
                                            <Edit2 size={18} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom Actions Bar (Selection Mode) */}
            {isSelectionMode ? (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-900 border-t border-white/10 flex items-center justify-center gap-4 animate-in slide-in-from-bottom z-30">
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedMovies.length === 0}
                        className="flex flex-col items-center gap-1 text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed px-6"
                    >
                        <Trash2 size={24} />
                        <span className="text-xs">Excluir ({selectedMovies.length})</span>
                    </button>
                </div>
            ) : (
                /* FAB */
                <button
                    onClick={handleAddNew}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-indigo-500/30 z-20"
                >
                    <Plus size={28} />
                </button>
            )}

        </div>
    );
};

