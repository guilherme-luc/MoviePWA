import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAllMovies } from '../hooks/useAllMovies';
import { ArrowLeft, Search, Plus, Wand2, Loader2, CheckSquare, Trash2, X, Star, Eye, AlertTriangle } from 'lucide-react';
import { MovieEditorModal } from '../components/modals/MovieEditorModal';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import type { Movie } from '../types';
import { MovieCardSkeleton } from '../components/movies/MovieCardSkeleton';
import { MovieCard } from '../components/movies/MovieCard';
import { useMovieGrouping, type GroupedMovie } from '../hooks/useMovieGrouping';
import { DuplicateSelectionModal } from '../components/modals/DuplicateSelectionModal';

import { PullToRefresh } from '../components/ui/PullToRefresh';

import { useShowcase } from '../providers/ShowcaseProvider';
import { useCollection } from '../providers/CollectionProvider';

export const MoviesPage: React.FC = () => {
    const { isShowcaseMode } = useShowcase();
    const { format } = useCollection();
    const { genre } = useParams<{ genre: string }>();
    const decodedGenre = decodeURIComponent(genre || '');
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: allMovies, isLoading, isError } = useAllMovies();

    // Filter by Format AND Genre
    const movies = useMemo(() => {
        if (!allMovies) return [];
        return allMovies.filter((m: Movie) =>
            (m.format || 'DVD') === format &&
            m.genre === decodedGenre
        );
    }, [allMovies, format, decodedGenre]);

    const [search, setSearch] = useState('');

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | undefined>(undefined);
    const [lastViewedMovie, setLastViewedMovie] = useState<Movie | undefined>(undefined);

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
    const [tagFilter, setTagFilter] = useState('');
    const [sortBy, setSortBy] = useState<string>('title_asc');

    // Extract Tags
    const allTags = useMemo(() => {
        if (!movies) return [];
        const tags = new Set<string>();
        movies.forEach((m: Movie) => m.tags?.forEach((t: string) => tags.add(t)));
        return Array.from(tags).sort();
    }, [movies]);

    const handleBack = () => {
        if (search || tagFilter) {
            setSearch('');
            setTagFilter('');

            // If we have a history of a movie being viewed, restore it
            if (lastViewedMovie) {
                setSelectedMovie(lastViewedMovie);
                setIsEditorOpen(true);
                setLastViewedMovie(undefined); // Clear history after restoring
            }
        } else {
            navigate(-1);
        }
    };

    // Filtering and Sorting
    const filteredMovies = useMemo(() => {
        if (!movies) return [];
        let result = movies.filter((m: Movie) =>
            m.title.toLowerCase().includes(search.toLowerCase()) ||
            (m.director && m.director.toLowerCase().includes(search.toLowerCase())) ||
            (m.cast && m.cast.toLowerCase().includes(search.toLowerCase()))
        );

        if (viewMode === 'watched') {
            result = result.filter((m: Movie) => m.watched);
        } else if (viewMode === 'watchlist') {
            result = result.filter((m: Movie) => !m.watched);
        }

        if (tagFilter) {
            result = result.filter((m: Movie) => m.tags?.includes(tagFilter));
        }

        // Apply Sorting
        return result.sort((a, b) => {
            // Helper for strict alphanumeric sorting (ignore spaces/accents)
            const normalize = (s: string) => s.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric (including spaces)

            if (sortBy === 'title_asc') return normalize(a.title).localeCompare(normalize(b.title));
            if (sortBy === 'title_desc') return normalize(b.title).localeCompare(normalize(a.title));
            if (sortBy === 'year_desc') return String(b.year).localeCompare(String(a.year));
            if (sortBy === 'year_asc') return String(a.year).localeCompare(String(b.year));
            if (sortBy === 'rating_desc') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
            if (sortBy === 'rating_asc') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
            return 0;
        });
    }, [movies, search, viewMode, tagFilter, sortBy]);

    // Grouping Logic
    const groupedMovies = useMovieGrouping(filteredMovies);
    const [selectedGroup, setSelectedGroup] = useState<GroupedMovie | null>(null);

    // In selection mode, we show ALL movies (flat) to allow specific selection.
    // In normal mode, we show GROUPED movies.
    const displayMovies = isSelectionMode ? filteredMovies : groupedMovies;

    const handleCardClick = (movie: Movie) => {
        if (isSelectionMode) {
            handleToggleSelection(movie);
            return;
        }

        const grouped = movie as GroupedMovie;
        if (grouped.groupCount && grouped.groupCount > 1) {
            setSelectedGroup(grouped);
        } else {
            handleEdit(movie);
        }
    };

    const handleEdit = (movie: Movie) => {
        setSelectedMovie(movie);
        setIsEditorOpen(true);
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
        if (!format) return alert("Erro: Formato não selecionado");
        if (!confirm(`Tem certeza que deseja excluir ${selectedMovies.length} filmes? Esta ação não pode ser desfeita.`)) return;

        const sortedToDelete = [...selectedMovies].sort((a: Movie, b: Movie) => (b._rowIndex || 0) - (a._rowIndex || 0));

        try {
            for (const movie of sortedToDelete) {
                await GoogleSheetsService.getInstance().deleteMovie(movie, format);
            }
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['all_movies'] });
            exitSelectionMode();
            alert("Filmes excluídos com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir alguns filmes.");
        }
    };

    const handleMagicWand = async () => {
        if (!format) return;
        if (isAutoFetchingRef.current) {
            isAutoFetchingRef.current = false;
            setIsAutoFetching(false);
            return;
        }

        const missingImages = movies?.filter((m: Movie) => (!m.imageValue || !m.backdropValue) && m.title) || [];
        if (missingImages.length === 0) {
            alert("Todos os filmes já têm capa! 🎉");
            return;
        }

        const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
        if (!apiKey) {
            const key = prompt("API Key do TMDB não encontrada. Insira sua chave:");
            if (key) {
                localStorage.setItem('tmdb_api_key', key);
            } else {
                return;
            }
        }

        if (!confirm(`Deseja buscar capas automaticamente para ${missingImages.length} filmes?`)) return;

        setIsAutoFetching(true);
        isAutoFetchingRef.current = true;
        setAutoFetchTotal(missingImages.length);
        setAutoFetchProgress(0);

        const updates: { movie: Movie, imageType: 'tmdb' | 'base64', imageValue: string, backdropType?: 'tmdb' | 'base64', backdropValue?: string }[] = [];
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
                    if (best) {
                        updates.push({
                            movie,
                            imageType: movie.imageType || 'tmdb',
                            imageValue: movie.imageValue || best.poster_path || '',
                            backdropType: 'tmdb',
                            backdropValue: movie.backdropValue || best.backdrop_path || ''
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
                    await GoogleSheetsService.getInstance().batchUpdateImages(updates, format);
                    await queryClient.invalidateQueries({ queryKey: ['movies'] });
                    await queryClient.invalidateQueries({ queryKey: ['all_movies'] });
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
                onClose={() => {
                    setIsEditorOpen(false);
                    setSelectedMovie(undefined);
                }}
                movieToEdit={selectedMovie}
                initialFormat={format || 'DVD'}
                initialGenre={decodedGenre}
                onSearch={setSearch}
            />

            <DuplicateSelectionModal
                isOpen={!!selectedGroup}
                onClose={() => setSelectedGroup(null)}
                groupTitle={selectedGroup?.title || ''}
                movies={selectedGroup?.instances || []}
                onEdit={(m) => {
                    setSelectedGroup(null);
                    handleEdit(m);
                }}
                onDelete={async (m) => {
                    if (!format) return;
                    if (!confirm("Excluir esta cópia permanentemente?")) return;
                    try {
                        await GoogleSheetsService.getInstance().deleteMovie(m, format);
                        await queryClient.invalidateQueries({ queryKey: ['movies'] });
                        await queryClient.invalidateQueries({ queryKey: ['all_movies'] });
                        setSelectedGroup(null);
                    } catch (e) {
                        alert("Erro ao excluir. Verifique o console.");
                        console.error(e);
                    }
                }}
            />

            {/* Selection Header */}
            {isSelectionMode ? (
                <div className="flex items-center justify-between mb-6 bg-primary-500/10 p-4 -mx-4 sm:mx-0 sm:rounded-2xl border border-primary-500/30">
                    <div className="flex items-center gap-3">
                        <button onClick={exitSelectionMode} className="p-2 text-white hover:bg-white/10 rounded-full">
                            <X size={20} />
                        </button>
                        <span className="font-bold text-primary-200">{selectedMovies.length} selecionados</span>
                    </div>
                    <button onClick={() => {
                        if (selectedMovies.length === filteredMovies.length) {
                            setSelectedMovies([]);
                        } else {
                            setSelectedMovies(filteredMovies);
                        }
                    }} className="text-sm text-primary-400 font-medium">
                        {selectedMovies.length === filteredMovies.length ? 'Desmarcar' : 'Todos'}
                    </button>
                </div>
            ) : (
                /* Normal Header */
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/5 text-neutral-300 transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-white max-w-[200px] truncate">{decodedGenre}</h2>
                                <p className="text-neutral-400 text-sm">{movies?.length || 0} filmes</p>
                            </div>
                        </div>

                        {!isShowcaseMode && (
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
                                        : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                                        }`}
                                >
                                    {isAutoFetching ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Mode Toggle - Improved Design */}
                    <div className="flex p-1 bg-neutral-900/50 rounded-xl border border-white/5 backdrop-blur-sm">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${viewMode === 'all'
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setViewMode('watched')}
                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${viewMode === 'watched'
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                                }`}
                        >
                            <Eye size={12} />
                            Vistos
                        </button>
                        <button
                            onClick={() => setViewMode('watchlist')}
                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${viewMode === 'watchlist'
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                                }`}
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
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${(autoFetchProgress / autoFetchTotal) * 100}%` }}
                    />
                </div>
            )}

            {/* Search & Sort Row */}
            {!isSelectionMode && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                        <input
                            type="text"
                            name="genre_search"
                            id="genre-search"
                            placeholder="Buscar título, ano ou código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-neutral-800 border-none rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-primary-500/50 transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex gap-2">
                        {/* Tag Filter */}
                        <div className={`relative flex-1 sm:flex-initial ${tagFilter ? 'min-w-[120px]' : ''}`}>
                            <select
                                value={tagFilter}
                                onChange={(e) => setTagFilter(e.target.value)}
                                className={`
                                    w-full h-full appearance-none bg-neutral-800 text-neutral-300 pl-4 pr-10 py-3 rounded-xl border-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer text-sm font-medium
                                    ${tagFilter ? 'text-primary-400 bg-primary-500/10' : ''}
                                `}
                            >
                                <option value="">Tags</option>
                                <option value={""}>Todas</option>
                                {allTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative flex-1 sm:flex-initial">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full h-full appearance-none bg-neutral-800 text-neutral-300 pl-4 pr-10 py-3 rounded-xl border-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer text-sm font-medium"
                            >
                                <option value="title_asc">A-Z</option>
                                <option value="title_desc">Z-A</option>
                                <option value="year_desc">Recentes</option>
                                <option value="year_asc">Antigos</option>
                                <option value="rating_desc">Melhores</option>
                                <option value="rating_asc">Piores</option>
                                <option value="duration_desc">Longos</option>
                                <option value="duration_asc">Curtos</option>
                                <option value="added_desc">Novos</option>
                                <option value="added_asc">Antigos</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* List */}
            <PullToRefresh onRefresh={async () => {
                await queryClient.invalidateQueries({ queryKey: ['movies', decodedGenre] });
                // Optional: trigger auto-enrichment check if user pulls
            }}>
                <div className="flex-1 pb-32">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <MovieCardSkeleton key={i} />)}
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 animate-in fade-in">
                            <AlertTriangle size={48} className="text-red-500 mb-4 opacity-50" />
                            <p className="text-lg font-medium text-neutral-300">Erro ao carregar filmes</p>
                            <p className="text-sm mb-6">Verifique sua conexão e tente novamente.</p>
                            <button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['movies', decodedGenre] })}
                                className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-full font-medium transition-colors"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    ) : filteredMovies.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400">
                            <p>Nenhum filme encontrado.</p>
                            {search && <button onClick={() => setSearch('')} className="text-primary-400 text-sm mt-2">Limpar busca</button>}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {displayMovies.map((movie) => (
                                <MovieCard
                                    key={`${movie._rowIndex}-${movie.barcode}`}
                                    movie={movie}
                                    isSelected={selectedMovies.some(m => m === movie)}
                                    isSelectionMode={isSelectionMode}
                                    isShowcaseMode={isShowcaseMode}
                                    onClick={handleCardClick}
                                    groupCount={isSelectionMode ? undefined : (movie as GroupedMovie).groupCount}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PullToRefresh>

            {/* Bottom Actions Bar (Selection Mode) */}
            {
                isSelectionMode ? (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-900 border-t border-white/10 flex items-center justify-center gap-4 animate-in slide-in-from-bottom z-[90] pb-8">
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
                    /* FAB - Adjusted for Safe Area and Bottom Nav */
                    !isShowcaseMode && (
                        <button
                            onClick={handleAddNew}
                            className="fixed bottom-24 right-6 md:bottom-6 w-14 h-14 bg-primary-600 hover:bg-primary-500 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-primary-500/30 z-20"
                        >
                            <Plus size={28} />
                        </button>
                    )
                )
            }

        </div >
    );
};

