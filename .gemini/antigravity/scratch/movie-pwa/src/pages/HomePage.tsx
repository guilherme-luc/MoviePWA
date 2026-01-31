import React, { useState } from 'react';
import { useGenres } from '../hooks/useGenres';
import { useAllMovies } from '../hooks/useAllMovies';
import { Film, Plus, Database, Search, X, Settings, Dice5 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GenreManagerModal } from '../components/modals/GenreManagerModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { MovieEditorModal } from '../components/modals/MovieEditorModal';
import { RandomMoviePicker } from '../components/modals/RandomMoviePicker';
import type { Movie } from '../types';

export const HomePage: React.FC = () => {
    const { data: genres, isLoading } = useGenres();
    const { data: allMovies } = useAllMovies();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRandomOpen, setIsRandomOpen] = useState(false);

    // Search State
    const [search, setSearch] = useState('');
    const [editMovie, setEditMovie] = useState<Movie | undefined>(undefined);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const totalMovies = genres?.reduce((acc, curr) => acc + curr.count, 0) || 0;

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
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <MovieEditorModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                movieToEdit={editMovie}
            />
            {/* Random Picker */}
            <RandomMoviePicker
                isOpen={isRandomOpen}
                onClose={() => setIsRandomOpen(false)}
                movies={allMovies || []}
            />

            {/* Header ... */}
            <div className="flex items-center gap-3">
                {/* ... Search implementation unchanged ... */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-neutral-500" size={18} />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar filme..."
                        className="w-full bg-neutral-800 border-none text-white text-sm rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 placeholder:text-neutral-500"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}

                    {/* Search Dropdown */}
                    {search.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                            {filteredMovies.length === 0 ? (
                                <div className="p-4 text-center text-neutral-500 text-sm">Nenhum filme encontrado</div>
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
                                                        <Film size={16} className="text-neutral-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-white font-medium text-sm line-clamp-1">{movie.title}</h4>
                                                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
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
                    {/* Random Button */}
                    <button
                        onClick={() => setIsRandomOpen(true)}
                        className="p-2.5 bg-indigo-600/20 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-full transition-all flex-shrink-0"
                        title="O que assistir?"
                    >
                        <Dice5 size={20} />
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2.5 bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors flex-shrink-0"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Header (Unchanged) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-indigo-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="z-10">
                        <p className="text-neutral-400 text-sm font-medium">Filmes</p>
                        <h2 className="text-4xl font-bold mt-1 text-white">{totalMovies}</h2>
                    </div>
                    <Film className="z-10 text-indigo-400 self-end" size={24} />
                </div>

                <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-purple-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="z-10">
                        <p className="text-neutral-400 text-sm font-medium">Gêneros</p>
                        <h2 className="text-4xl font-bold mt-1 text-white">{genres?.length || 0}</h2>
                    </div>
                    <Database className="z-10 text-purple-400 self-end" size={24} />
                </div>
            </div>

            {/* Action Bar (Unchanged) */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Coleções</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                >
                    <Plus size={16} />
                    <span>Novo Gênero</span>
                </button>
            </div>

            {/* Genres Grid (Unchanged) */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-neutral-800 animate-pulse rounded-xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                    {genres?.map((g) => (
                        <Link
                            key={g.genre}
                            to={`/genre/${encodeURIComponent(g.genre)}`}
                            className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-neutral-800/80 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center border border-white/5">
                                    <span className="text-lg font-bold text-neutral-300">{g.genre.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-neutral-200">{g.genre}</h4>
                                    <p className="text-xs text-neutral-500">{g.count} filmes</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {genres?.length === 0 && (
                        <div className="col-span-full text-center py-10 text-neutral-500">
                            Nenhum gênero encontrado. Crie um para começar.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
