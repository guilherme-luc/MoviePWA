import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Play, Dice5 } from 'lucide-react';
import type { Movie } from '../../types';

interface RandomMoviePickerProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[]; // Pool of movies to pick from
}

export const RandomMoviePicker: React.FC<RandomMoviePickerProps> = ({ isOpen, onClose, movies }) => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const pickRandom = () => {
        if (!movies || movies.length === 0) return;

        setIsAnimating(true);
        let counter = 0;
        const maxShuffles = 10; // Number of "flickers" before stopping

        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * movies.length);
            setSelectedMovie(movies[randomIndex]);
            counter++;

            if (counter >= maxShuffles) {
                clearInterval(interval);
                setIsAnimating(false);
            }
        }, 100);
    };

    // Auto-pick on open
    useEffect(() => {
        if (isOpen) {
            pickRandom();
        }
    }, [isOpen]);

    if (!isOpen || !selectedMovie) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-sm bg-neutral-900 border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.2)] overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-300">

                {/* Header Pattern */}
                <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-indigo-600/20 to-transparent pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 text-white rounded-full transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="pt-12 pb-8 px-6 flex flex-col items-center w-full">

                    <div className="text-indigo-400 font-medium tracking-wider text-xs uppercase mb-6 flex items-center gap-2">
                        <Dice5 size={16} />
                        Sorteado para você
                    </div>

                    {/* Poster Card */}
                    <div className={`
                        relative w-48 aspect-[2/3] bg-neutral-800 rounded-xl overflow-hidden shadow-2xl mb-6 border border-white/10
                        transition-transform duration-100
                        ${isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
                    `}>
                        {selectedMovie.posterBase64 ? (
                            <img src={selectedMovie.posterBase64} alt={selectedMovie.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                                <span className="text-4xl">🎬</span>
                            </div>
                        )}

                        {/* Genre Badge */}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-medium border border-white/10">
                            {selectedMovie.genre}
                        </div>
                    </div>

                    {/* Title Info */}
                    <div className="text-center mb-8 space-y-1">
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            {selectedMovie.title}
                        </h2>
                        <p className="text-neutral-400 text-lg">{selectedMovie.year}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex w-full gap-3">
                        <button
                            onClick={pickRandom}
                            disabled={isAnimating}
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group"
                        >
                            <RefreshCw size={20} className={`group-hover:rotate-180 transition-transform duration-500 ${isAnimating ? 'animate-spin' : ''}`} />
                            Tentar Outro
                        </button>

                        {/* Placeholder for "Watch" if we had deep links, for now looks cool */}
                        <button
                            onClick={onClose}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="currentColor" />
                            Assistir
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
