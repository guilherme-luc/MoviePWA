import React, { useState } from 'react';
import { useGenres } from '../hooks/useGenres';
import { useAllMovies } from '../hooks/useAllMovies';
import { Film, Plus, Database, Search, X, Dice5, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GenreManagerModal } from '../components/modals/GenreManagerModal';
import { MovieEditorModal } from '../components/modals/MovieEditorModal';
import { RandomMoviePicker } from '../components/modals/RandomMoviePicker';
import { SmartSuggestionModal } from '../components/modals/SmartSuggestionModal';
import { StatsModal } from '../components/modals/StatsModal';
import type { Movie } from '../types';
import { Skeleton } from '../components/ui/Skeleton';
import { getGenreGradient, getGenreIcon } from '../utils/genreUtils';

import { useShowcase } from '../providers/ShowcaseProvider';
import { useCollection } from '../providers/CollectionProvider';

export const HomePage: React.FC = () => {
    const { isShowcaseMode } = useShowcase();
    const { format, isVHS } = useCollection();
    const { data: allGenres, isLoading, isError } = useGenres();
    const { data: rawMovies } = useAllMovies();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRandomOpen, setIsRandomOpen] = useState(false);
    const [isSmartOpen, setIsSmartOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false); // Stats State

    // Search State
    const [search, setSearch] = useState('');
    const [editMovie, setEditMovie] = useState<Movie | undefined>(undefined);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Filter by Format
    const allMovies = rawMovies?.filter(m => {
        // Legacy support: if format is missing, assume DVD
        const movieFormat = m.format || 'DVD';
        return movieFormat === format;
    });

    // Filter Genres based on filtered movies
    const genres = allGenres?.map(g => {
        // Count only movies of this format in this genre
        const count = allMovies?.filter(m => m.genre === g.genre).length || 0;
        return { ...g, count };
    });

    const totalMovies = allMovies?.length || 0;

    const filteredMovies = allMovies?.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5) || []; // Limit to 5 results for preview

    const handleSelectMovie = (movie: Movie) => {
        setEditMovie(movie);
        setIsEditOpen(true);
        setSearch(''); // Clear search on select? Optional.
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 relative min-h-screen">

            <GenreManagerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <MovieEditorModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                movieToEdit={editMovie}
            />
            {/* Smart Suggestions */}
            <SmartSuggestionModal
                isOpen={isSmartOpen}
                onClose={() => setIsSmartOpen(false)}
                movies={allMovies || []}
            />
            {/* Random Picker */}
            <RandomMoviePicker
                isOpen={isRandomOpen}
                onClose={() => setIsRandomOpen(false)}
                movies={allMovies || []}
            />

            {/* Stats Dashboard */}
            <StatsModal
                isOpen={isStatsOpen}
                onClose={() => setIsStatsOpen(false)}
                movies={allMovies || []}
                genres_={genres || []}
            />

            {/* Header with Search & Settings */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-neutral-400" size={18} />
                    </div>
                    <input
                        type="text"
                        name="search"
                        id="home-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar filme..."
                        className="w-full bg-neutral-800 border-none text-white text-sm rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary-500 placeholder:text-neutral-400"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}

                    {/* Search Dropdown */}
                    {search.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                            {filteredMovies.length === 0 ? (
                                <div className="p-6 text-center text-neutral-400 text-sm flex flex-col items-center gap-2">
                                    <Film size={32} className="text-neutral-600" />
                                    <p className="font-medium">Nenhum filme encontrado</p>
                                    <p className="text-xs text-neutral-500">Tente outro termo de busca</p>
                                </div>
                            ) : (
                                <ul>
                                    {filteredMovies.map((movie, idx) => (
                                        <li key={idx}>
                                            <button
                                                onClick={() => handleSelectMovie(movie)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                            >
                                                {movie.imageValue ? (
                                                    <img
                                                        src={movie.imageType === 'tmdb' ? `https://image.tmdb.org/t/p/w92${movie.imageValue}` : movie.imageValue}
                                                        className="w-10 h-14 object-cover rounded bg-neutral-900"
                                                        alt=""
                                                    />
                                                ) : (
                                                    <div className="w-10 h-14 bg-neutral-700 rounded flex items-center justify-center">
                                                        <Film size={16} className="text-neutral-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-white font-medium text-sm line-clamp-1">{movie.title}</h4>
                                                    <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                                        {movie.genre}
                                                    </span>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* Smart Suggestion Button */}
                    <button
                        onClick={() => setIsSmartOpen(true)}
                        className="p-2.5 bg-primary-600/20 text-primary-400 hover:text-white hover:bg-primary-600 rounded-full transition-all flex-shrink-0 border border-primary-500/30"
                        title="Sugestão Inteligente"
                    >
                        <Sparkles size={20} />
                    </button>

                    {/* Random Button */}
                    <button
                        onClick={() => setIsRandomOpen(true)}
                        className="p-2.5 bg-primary-600/20 text-primary-400 hover:text-white hover:bg-primary-600 rounded-full transition-all flex-shrink-0"
                        title="Sorteio Aleatório"
                    >
                        <Dice5 size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Header */}
            <div className="grid grid-cols-2 gap-4 cursor-pointer" onClick={() => setIsStatsOpen(true)}>
                <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-neutral-800/80 transition-all border border-transparent hover:border-primary-500/30">
                    <div className="absolute -right-4 -top-4 bg-primary-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all"></div>
                    <div className="z-10">
                        <p className="text-neutral-400 text-sm font-medium">Filmes</p>
                        <h2 className="text-4xl font-bold mt-1 text-white">{totalMovies}</h2>
                    </div>
                    <div className="z-10 flex justify-between items-end w-full">
                        <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-1 rounded-full">Ver Estatísticas</span>
                        <Film className="text-primary-400" size={24} />
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-neutral-800/80 transition-all border border-transparent hover:border-primary-500/30">
                    <div className="absolute -right-4 -top-4 bg-primary-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all"></div>
                    <div className="z-10">
                        <p className="text-neutral-400 text-sm font-medium">Gêneros</p>
                        <h2 className="text-4xl font-bold mt-1 text-white">{genres?.length || 0}</h2>
                    </div>
                    <Database className="z-10 text-primary-400 self-end" size={24} />
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${isVHS ? 'text-amber-500 font-mono tracking-widest uppercase' : 'text-white'}`}>
                    {isVHS ? '> Coleções' : 'Coleções'}
                </h3>
                {!isShowcaseMode && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={`
                            ${isVHS ? 'bg-amber-900/40 text-amber-500 hover:bg-amber-900/60' : 'bg-neutral-800 text-primary-400 hover:bg-neutral-700'} 
                            px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors
                        `}
                    >
                        <Plus size={16} />
                        <span>Novo Gênero</span>
                    </button>
                )}
            </div>

            {/* Genres Grid */}
            {isError ? (
                <div className="glass-panel p-8 rounded-2xl text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Database className="text-red-400" size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-neutral-200 mb-2">Limite de Requisições Atingido</h3>
                            <p className="text-sm text-neutral-400 max-w-md mx-auto mb-4">
                                A Google Sheets API tem um limite de requisições por minuto.
                                Aguarde alguns segundos e tente novamente.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-full font-medium transition-colors"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                    {genres?.map((g) => (
                        <Link
                            key={g.genre}
                            to={`/genre/${encodeURIComponent(g.genre)}`}
                            className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-neutral-800/80 transition-all active:scale-[0.98] group"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 shadow-lg group-hover:scale-110 transition-transform"
                                    style={{ background: getGenreGradient(g.genre) }}
                                >
                                    <span className="text-2xl">{getGenreIcon(g.genre)}</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-neutral-200">{g.genre}</h4>
                                    <p className="text-xs text-neutral-400">{g.count} filmes</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {genres?.length === 0 && (
                        <div className="col-span-full text-center py-12 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center">
                                <Film size={32} className="text-neutral-600" />
                            </div>
                            <div>
                                <p className="text-neutral-400 font-medium mb-1">Nenhum gênero encontrado</p>
                                <p className="text-xs text-neutral-500">Crie seu primeiro gênero para começar</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
