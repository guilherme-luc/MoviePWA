import vhsLogo from '../../assets/vhs-logo.png';
import dvdLogo from '../../assets/dvd-logo.png';

// ... (in component)

{/* Title Info */ }
<div className="text-center mb-8 space-y-3 flex flex-col items-center">
    <h2 className="text-2xl font-bold text-white leading-tight">
        {displayedMovie.title}
    </h2>

    <div className="flex items-center gap-3">
        {/* Format Logo */}
        {(displayedMovie.format === 'VHS') ? (
            <img src={vhsLogo} alt="VHS" className="h-4 md:h-5 opacity-90 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
        ) : (
            <img src={dvdLogo} alt="DVD" className="h-4 md:h-5 opacity-90 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
        )}
        <span className="text-neutral-500 text-sm">• {displayedMovie.year}</span>
    </div>
</div>
isOpen: boolean;
onClose: () => void;
movies: Movie[]; // Pool of movies to pick from
}

export const RandomMoviePicker: React.FC<RandomMoviePickerProps> = ({ isOpen, onClose, movies }) => {
    const [displayedMovie, setDisplayedMovie] = useState<Movie | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Cache "decoy" images to ensure smooth animation
    const [decoyPool, setDecoyPool] = useState<Movie[]>([]);
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

    // Initialize Decoy Pool on Mount (or when movies change)
    useEffect(() => {
        if (!movies || movies.length === 0) return;

        const loadDecoys = async () => {
            // Pick 10 random movies to serve as "smooth animation frames"
            const pool: Movie[] = [];
            const candidates = [...movies].sort(() => 0.5 - Math.random()).slice(0, 15);

            for (const m of candidates) {
                const url = getImageUrl(m);
                if (url) {
                    // Fire and forget preload, or wait? 
                    // Let's simplified preload: just creating the object triggers browser cache
                    const img = new Image();
                    img.src = url;
                    pool.push(m);
                }
            }
            setDecoyPool(pool);
        };

        loadDecoys();
    }, [movies]);

    const pickRandom = async () => {
        if (!movies || movies.length === 0) return;
        if (isAnimating) return;

        setIsAnimating(true);

        // 1. Pick Winner
        const randomIndex = Math.floor(Math.random() * movies.length);
        const winner = movies[randomIndex];
        const winnerUrl = getImageUrl(winner);

        // 2. Start Animation Loop (using Decoys)
        let loopCounter = 0;
        const availableDecoys = decoyPool.length > 0 ? decoyPool : movies.slice(0, 10); // Fallback

        animationRef.current = setInterval(() => {
            // Show a decoy
            const decoy = availableDecoys[loopCounter % availableDecoys.length];
            setDisplayedMovie(decoy);
            loopCounter++;
        }, 120); // Slightly slower than 100ms for better perception

        // 3. Preload Winner in Background
        if (winnerUrl) {
            try {
                await preloadImage(winnerUrl);
            } catch (e) {
                console.warn("Failed to preload winner image", e);
            }
        } else {
            // Artificial delay if no image to load, just for suspense
            await new Promise(r => setTimeout(r, 1000));
        }

        // 4. Ensure minimum spin time (e.g. 1.5s total) for effect
        // We calculate how much time passed since start? 
        // Or just `await` a minimum promise alongside the preload.
        // Let's keeping it simple: The `await preloadImage` naturally takes time. 
        // If it's cached, it's instant. If instant, we might want a minimum delay.

        const minTime = new Promise(r => setTimeout(r, 1200));
        await minTime;

        // 5. Stop and Show Winner
        if (animationRef.current) clearInterval(animationRef.current);
        setDisplayedMovie(winner);
        setIsAnimating(false);
    };

    // Auto-pick on open
    useEffect(() => {
        if (isOpen && !displayedMovie) {
            // Only auto-pick if we don't have one already (or always?)
            // User expects a fresh pick on open usually.
            pickRandom();
        }
        return () => {
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, [isOpen]);

    if (!isOpen || !displayedMovie) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

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
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-medium border border-white/10">
                                {displayedMovie.genre}
                            </div>
                            <div className={`
                                px-2 py-0.5 rounded text-[10px] font-bold border
                                ${displayedMovie.format === 'VHS'
                                    ? 'bg-amber-900/80 border-amber-500/50 text-amber-200'
                                    : 'bg-blue-900/80 border-blue-500/50 text-blue-200'}
                            `}>
                                {displayedMovie.format || 'DVD'}
                            </div>
                        </div>
                    </div>

                    {/* Title Info */}
                    <div className="text-center mb-8 space-y-1">
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            {displayedMovie.title}
                        </h2>
                        <p className="text-neutral-400 text-lg">{displayedMovie.year}</p>
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
