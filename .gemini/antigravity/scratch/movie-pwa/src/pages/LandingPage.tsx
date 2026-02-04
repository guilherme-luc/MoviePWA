import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Dice5 } from 'lucide-react';
import { useCollection } from '../providers/CollectionProvider';
import { useAllMovies } from '../hooks/useAllMovies';
import vhsLogo from '../assets/vhs-logo.png';
import dvdLogo from '../assets/dvd-logo.png';
import { RandomMoviePicker } from '../components/modals/RandomMoviePicker';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { setFormat } = useCollection();
    const { data: allMovies } = useAllMovies(); // Fetch all movies (no filter)
    const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);
    const [isRandomOpen, setIsRandomOpen] = useState(false);

    const handleSelect = (format: 'DVD' | 'VHS') => {
        setFormat(format);
        navigate('/app');
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col md:flex-row">

            <RandomMoviePicker
                isOpen={isRandomOpen}
                onClose={() => setIsRandomOpen(false)}
                movies={allMovies || []}
            />

            {/* LEFT SIDE - VHS (Retro/Analog) */}
            <div
                className={`
                    relative w-full md:w-1/2 h-1/2 md:h-full cursor-pointer overflow-hidden transition-all duration-700 ease-in-out
                    ${hoveredSide === 'right' ? 'md:w-2/5 opacity-60 grayscale' : 'md:w-1/2'}
                    ${hoveredSide === 'left' ? 'md:w-3/5 z-20' : ''}
                    border-b-4 md:border-b-0 md:border-r-4 border-black box-border group
                `}
                onMouseEnter={() => setHoveredSide('left')}
                onMouseLeave={() => setHoveredSide(null)}
                onClick={() => handleSelect('VHS')}
            >
                {/* Background with scanlines and noise */}
                <div className="absolute inset-0 bg-neutral-900 z-0">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2VGaWx0ZXIpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-20 brightness-150 contrast-150 mix-blend-overlay animate-noise" />
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-700/40 via-orange-900/40 to-black mix-blend-multiply" />
                    {/* Scanlines effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30 z-10" />
                </div>

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-amber-500 font-mono tracking-widest uppercase">

                    <div className="mb-8 transform group-hover:scale-105 transition-transform duration-500 w-full max-w-xs md:max-w-sm">
                        <img
                            src={vhsLogo}
                            alt="VHS Logo"
                            className="w-full h-auto drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                    </div>

                    <p className="text-sm md:text-base opacity-80 mb-8 border-t border-b border-amber-500/50 py-2 w-48 text-center typewriter">
                        COLEÇÃO ANALÓGICA
                    </p>

                    <button className="flex items-center gap-3 px-8 py-3 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-black transition-all font-bold group-hover:animate-pulse">
                        IMPORTAR FITA <ArrowRight size={18} />
                    </button>

                    {/* VCR OSD */}
                    <div className="absolute top-8 left-8 text-xl opacity-60 pointer-events-none font-bold">
                        PLAY ►
                    </div>
                </div>
            </div>

            {/* CENTRAL RANDOMIZER BUTTON */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsRandomOpen(true);
                    }}
                    className="
                        group flex flex-col items-center justify-center gap-2 
                        bg-neutral-900 hover:bg-neutral-800 
                        p-6 rounded-full border-4 border-white/10 hover:border-primary-500/50 
                        hover:scale-110 active:scale-95 transition-all duration-300 
                        shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:shadow-primary-500/20
                    "
                    title="Sortear entre TODAS as coleções"
                >
                    <Dice5 size={32} className="text-neutral-400 group-hover:text-primary-400 group-hover:rotate-180 transition-all duration-500" />
                </button>
            </div>

            {/* RIGHT SIDE - DVD (Modern/Digital) */}
            <div
                className={`
                    relative w-full md:w-1/2 h-1/2 md:h-full cursor-pointer overflow-hidden transition-all duration-700 ease-in-out
                    ${hoveredSide === 'left' ? 'md:w-2/5 opacity-60 grayscale' : 'md:w-1/2'}
                    ${hoveredSide === 'right' ? 'md:w-3/5 z-20' : ''}
                    bg-neutral-900 group
                `}
                onMouseEnter={() => setHoveredSide('right')}
                onMouseLeave={() => setHoveredSide(null)}
                onClick={() => handleSelect('DVD')}
            >
                {/* Background - Sleek Glassmorphism */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-neutral-900 to-black" />
                    <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary-500/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-primary-900/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-white font-sans">

                    <div className="mb-8 relative transform group-hover:scale-105 transition-transform duration-500 w-full max-w-xs md:max-w-sm flex items-center justify-center">
                        {/* Organic Glow (Replaces Drop Shadow to avoid square artifacts) */}
                        <div className="absolute w-[80%] h-[60%] bg-blue-600/50 blur-[50px] rounded-full z-0" />

                        <img
                            src={dvdLogo}
                            alt="DVD Logo"
                            className="w-full h-auto relative z-10 opacity-100 mix-blend-screen"
                        />
                    </div>

                    <p className="text-sm md:text-base text-neutral-400 mb-8 font-light tracking-[0.2em] uppercase">
                        Coleção Digital
                    </p>

                    <button className="flex items-center gap-3 px-8 py-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        ACESSAR DISCO <ArrowRight size={18} />
                    </button>

                    {/* Modern Metadata */}
                    <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1 opacity-40 text-xs text-right font-mono">
                        <span>DOLBY DIGITAL</span>
                        <span>WIDESCREEN</span>
                    </div>
                </div>
            </div>

            {/* SPLITTER LINE */}
            <div className="absolute top-1/2 left-0 right-0 h-1 md:top-0 md:bottom-0 md:left-1/2 md:w-1 bg-black z-30 pointer-events-none shadow-[0_0_20px_rgba(0,0,0,1)]" />

            {/* GLOBAL OVERLAY TEXT (Moved slightly up to avoid button overlap) */}
            <div className={`absolute top-[42%] md:top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none transition-opacity duration-300 ${hoveredSide ? 'opacity-0' : 'opacity-100'}`}>
                <div className="bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white font-bold text-sm tracking-widest uppercase shadow-2xl">
                    Selecione o Formato
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
