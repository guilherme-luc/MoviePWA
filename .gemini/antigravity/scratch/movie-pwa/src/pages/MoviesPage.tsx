import React, { useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMovies } from '../hooks/useMovies';
import { ArrowLeft, Search, Plus, Edit2, Wand2, Loader2 } from 'lucide-react';
import { MovieEditorModal } from '../components/modals/MovieEditorModal';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import type { Movie } from '../types';

export const MoviesPage: React.FC = () => {
    const { genre } = useParams<{ genre: string }>();
    const decodedGenre = decodeURIComponent(genre || '');
    const queryClient = useQueryClient();

    const { data: movies, isLoading } = useMovies(decodedGenre);
    const [search, setSearch] = useState('');

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | undefined>(undefined);

    // Auto-Fetch State
    const [isAutoFetching, setIsAutoFetching] = useState(false);
    const isAutoFetchingRef = useRef(false); // Ref for loop control
    const [autoFetchProgress, setAutoFetchProgress] = useState(0);
    const [autoFetchTotal, setAutoFetchTotal] = useState(0);

    const filteredMovies = useMemo(() => {
        if (!movies) return [];
        const q = search.toLowerCase();
        return movies.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.barcode.toLowerCase().includes(q) ||
            m.year.includes(q)
        );
    }, [movies, search]);

    const handleEdit = (movie: Movie) => {
        setSelectedMovie(movie);
        setIsEditorOpen(true);
    };

    const handleAddNew = () => {
        setSelectedMovie(undefined);
        setIsEditorOpen(true);
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

        const apiKey = localStorage.getItem('tmdb_api_key');
        if (!apiKey) {
            alert("Configure sua API Key primeiro! (Engrenagem na Home)");
            return;
        }

        if (!confirm(`Deseja buscar capas automaticamente para ${missingImages.length} filmes?`)) return;

        setIsAutoFetching(true);
        isAutoFetchingRef.current = true;
        setAutoFetchTotal(missingImages.length);
        setAutoFetchProgress(0);

        const updates: { movie: Movie, imageType: 'tmdb', imageValue: string }[] = [];
        const BATCH_SIZE = 10; // Save every 10 or at end

        let successCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;

        for (let i = 0; i < missingImages.length; i++) {
            if (!isAutoFetchingRef.current) break;

            const movie = missingImages[i];

            try {
                // Fetch TMDB
                const query = encodeURIComponent(movie.title);
                const yearParam = movie.year ? `&year=${movie.year}` : '';
                const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}${yearParam}&language=pt-BR&include_adult=false`;

                const res = await fetch(url);
                const data = await res.json();

                if (!res.ok) {
                    console.error(`TMDB Error for ${movie.title}:`, data);
                    errorCount++;
                    continue;
                }

                if (data.results && data.results.length > 0) {
                    // Pick best result (sorted by popularity)
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

                // Throttle to respect TMDB rate limits (approx 40 req/10s -> 4 req/s -> 250ms)
                // Being safe with 350ms
                await new Promise(r => setTimeout(r, 350));

            } catch (e) {
                console.error(`Falha ao buscar capa para ${movie.title}`, e);
                errorCount++;
            }

            setAutoFetchProgress(prev => prev + 1);

            // Batch Save
            if (updates.length >= BATCH_SIZE || i === missingImages.length - 1) {
                if (updates.length > 0) {
                    await GoogleSheetsService.getInstance().batchUpdateImages(updates);
                    await queryClient.invalidateQueries({ queryKey: ['movies'] }); // Refresh UI live
                    updates.length = 0; // Clear buffer
                }
            }
        }

        setIsAutoFetching(false);
        isAutoFetchingRef.current = false;
        alert(`Processo finalizado!\n\n✅ Atualizados: ${successCount}\n❌ Não encontrados: ${notFoundCount}\n⚠️ Erros: ${errorCount}`);
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            <MovieEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                movieToEdit={selectedMovie}
                initialGenre={decodedGenre}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-full hover:bg-white/5 text-neutral-300 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{decodedGenre}</h2>
                        <p className="text-neutral-400 text-sm">{movies?.length || 0} filmes</p>
                    </div>
                </div>

                {/* Magic Wand Button */}
                <button
                    onClick={handleMagicWand}
                    disabled={isAutoFetching && autoFetchProgress > 0} // Can only stop 
                    className={`p-3 rounded-full transition-all ${isAutoFetching
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                        }`}
                >
                    {isAutoFetching ? <Loader2 className="animate-spin" size={24} /> : <Wand2 size={24} />}
                </button>
            </div>

            {/* Progress Bar */}
            {isAutoFetching && (
                <div className="mb-6 bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(autoFetchProgress / autoFetchTotal) * 100}%` }}
                    />
                </div>
            )}

            {/* Search */}
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

            {/* List */}
            <div className="flex-1 pb-24">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-neutral-800 animate-pulse rounded-xl" />)}
                    </div>
                ) : filteredMovies.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                        <p>Nenhum filme encontrado.</p>
                        {search && <button onClick={() => setSearch('')} className="text-indigo-400 text-sm mt-2">Limpar busca</button>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMovies.map((movie) => (
                            <div
                                key={`${movie._rowIndex}-${movie.barcode}`}
                                className="glass-panel p-3 rounded-xl flex items-center gap-3 justify-between group active:scale-[0.99] transition-all"
                                onClick={() => handleEdit(movie)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
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
                                                onError={(e) => {
                                                    // Hide broken images
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                                <div className="w-4 h-4 bg-white/10 rounded-full" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-hidden">
                                        <h3 className="font-semibold text-neutral-200">{movie.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full">{movie.year}</span>
                                            {movie.barcode && (
                                                <span className="text-xs font-mono text-neutral-500">{movie.barcode}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-neutral-600 group-hover:text-indigo-400 transition-colors flex-shrink-0">
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={handleAddNew}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-indigo-500/30 z-20"
            >
                <Plus size={28} />
            </button>

        </div>
    );
};
