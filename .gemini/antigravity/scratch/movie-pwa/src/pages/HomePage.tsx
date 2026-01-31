import React, { useState } from 'react';
import { useGenres } from '../hooks/useGenres';
import { Film, Plus, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GenreManagerModal } from '../components/modals/GenreManagerModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { Settings } from 'lucide-react';

export const HomePage: React.FC = () => {
    const { data: genres, isLoading } = useGenres();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const totalMovies = genres?.reduce((acc, curr) => acc + curr.count, 0) || 0;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">

            <GenreManagerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Header with Settings */}
            <div className="flex justify-end">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Stats Header */}
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

            {/* Action Bar */}
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

            {/* Genres Grid */}
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
