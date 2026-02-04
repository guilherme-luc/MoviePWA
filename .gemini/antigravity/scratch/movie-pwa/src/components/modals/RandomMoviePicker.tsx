import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, RefreshCw, Play, Dice5 } from 'lucide-react';
import { useCollection } from '../../providers/CollectionProvider';
import type { Movie } from '../../types';
import vhsLogo from '../../assets/vhs-logo.png';
import dvdLogo from '../../assets/dvd-logo.png';

interface RandomMoviePickerProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[]; // Pool of movies to pick from
}

export const RandomMoviePicker: React.FC<RandomMoviePickerProps> = ({ isOpen, onClose, movies }) => {
    const navigate = useNavigate();
    const { setFormat } = useCollection();
    const [displayedMovie, setDisplayedMovie] = useState<Movie | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Helper to get image URL
    const getImageUrl = (movie: Movie) => {
        if (!movie?.imageValue) return null;
        return movie.imageType === 'tmdb'
            ? `https://image.tmdb.org/t/p/w342${movie.imageValue}`
            : movie.imageValue;
    };

    // Preload an image URL
    const preloadImage = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve();
            img.onerror = () => reject(); // If fails, we resolve anyway to not block? Or reject?
        });
    };

    // Initialize (No Decoy Pool needed anymore)

    const pickRandom = async () => {
        if (!movies || movies.length === 0) return;
        if (isAnimating) return;

        setIsAnimating(true);

        // 1. Pick Winner
        const randomIndex = Math.floor(Math.random() * movies.length);
        const winner = movies[randomIndex];
        const winnerUrl = getImageUrl(winner);

        // 2. Start Animation Loop (Randomly picking from ALL movies)

        // IMMEDIATE: Set a random movie right now so the modal has something to show
        setDisplayedMovie(movies[Math.floor(Math.random() * movies.length)]);

        animationRef.current = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * movies.length);
            setDisplayedMovie(movies[randomIdx]);
        }, 120);

        // 3. Preload Winner in Background
        if (winnerUrl) {
            try {
                await preloadImage(winnerUrl);
            } catch (e) {
                // Ignore
            }
        } else {
            await new Promise(r => setTimeout(r, 1000));
        }

        // 4. Ensure minimum spin time
        const minTime = new Promise(r => setTimeout(r, 1200));
        await minTime;

        // 5. Stop and Show Winner
        if (animationRef.current) clearInterval(animationRef.current);
        setDisplayedMovie(winner);
        setIsAnimating(false);
    };

    // Auto-pick on open
    useEffect(() => {
        if (isOpen && movies && movies.length > 0 && !displayedMovie) {
            pickRandom();
        }
        return () => {
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, [isOpen, movies]);

    const handleWatch = () => {
        if (!displayedMovie) return;

        // 1. Set the correct format context
        if (displayedMovie.format) {
            setFormat(displayedMovie.format as 'DVD' | 'VHS');
        }

        // 2. Navigate to the app
        navigate('/app');

        // In the future we can pass state to open the movie details modal automatically
        // e.g. navigate('/app', { state: { openMovieId: displayedMovie.id } });
    };

    if (!isOpen || !displayedMovie) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-sm bg-neutral-900 border border-primary-500/30 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.2)] overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-300">

                {/* Header Pattern */}
                <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-primary-600/20 to-transparent pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 text-white rounded-full transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="pt-12 pb-8 px-6 flex flex-col items-center w-full">

                    <div className="text-primary-400 font-medium tracking-wider text-xs uppercase mb-6 flex items-center gap-2">
                        <Dice5 size={16} />
                        {isAnimating ? 'Sorteando...' : 'Sorteado para você'}
                    </div>

                    {/* Poster Card */}
                    <div className={`
                        relative w-48 aspect-[2/3] bg-neutral-800 rounded-xl overflow-hidden shadow-2xl mb-6 border border-white/10
                        transition-transform duration-100
                        ${isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
                    `}>
                        {displayedMovie.imageValue ? (
                            <img
                                src={getImageUrl(displayedMovie) || ''}
                                alt={displayedMovie.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                                <span className="text-4xl">🎬</span>
                            </div>
                        )}

                        {/* Genre Badge */}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-medium border border-white/10">
                            {displayedMovie.genre}
                        </div>
                    </div>

                    {/* Title Info */}
                    <div className="text-center mb-8 space-y-3 flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            {displayedMovie.title}
                        </h2>

                        <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                            {/* Format Logo - Brighter and Clearer */}
                            {(displayedMovie.format === 'VHS') ? (
                                <img src={vhsLogo} alt="VHS" className="h-6 md:h-8 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] brightness-0 invert" />
                            ) : (
                                <img src={dvdLogo} alt="DVD" className="h-5 md:h-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] brightness-0 invert" />
                            )}
                            <span className="text-neutral-400 text-sm font-medium tracking-wide border-l border-white/20 pl-3">
                                {displayedMovie.year}
                            </span>
                        </div>
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

                        <button
                            onClick={handleWatch}
                            className="flex-1 bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
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
