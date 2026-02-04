import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Dice5 } from 'lucide-react';
import { useCollection } from '../providers/CollectionProvider';
import { useAllMovies } from '../hooks/useAllMovies';
import vhsLogo from '../assets/vhs-logo.png';
import dvdLogo from '../assets/dvd-logo.png';
import vhsGif from '../assets/VHS.gif';
import dvdGif from '../assets/DVD.gif';
import { RandomMoviePicker } from '../components/modals/RandomMoviePicker';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { setFormat } = useCollection();
    const { data: allMovies } = useAllMovies(); // Fetch all movies (no filter)
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
                    md:w-1/2
                    border-b-4 md:border-b-0 md:border-r-4 border-black box-border group
                `}
                onClick={() => handleSelect('VHS')}
            >
                {/* Background - VHS GIF */}
                <div className="absolute inset-0 z-0">
                    <img src={vhsGif} alt="Background" className="w-full h-full object-cover object-left opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
                </div>

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-amber-500 font-mono tracking-widest uppercase">

                    <div className="mb-8 transform group-hover:scale-105 transition-transform duration-500 w-full max-w-sm md:max-w-md flex items-center justify-center h-32 md:h-40">
                        <img
                            src={vhsLogo}
                            alt="VHS Logo"
                            className="w-full h-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                    </div>

                    <p className="text-sm md:text-base opacity-80 mb-8 border-t border-b border-amber-500/50 py-2 w-48 text-center typewriter text-amber-200">
                        COLEÇÃO ANALÓGICA
                    </p>

                    <button className="flex items-center gap-3 px-8 py-3 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-black transition-all font-bold group-hover:animate-pulse">
                        IMPORTAR FITAS <ArrowRight size={18} />
                    </button>

                    {/* VCR OSD */}
                    <div className="absolute top-8 left-8 text-xl opacity-60 pointer-events-none font-bold text-white shadow-black drop-shadow-md">
                        PLAY ►
                    </div>
                </div>
            </div>

            {/* CENTRAL RANDOMIZER BUTTON */}
            {!isRandomOpen && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto animate-in fade-in zoom-in duration-300">
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
            )}

            {/* RIGHT SIDE - DVD (Modern/Digital) */}
            <div
                className={`
                    relative w-full md:w-1/2 h-1/2 md:h-full cursor-pointer overflow-hidden transition-all duration-700 ease-in-out
                    md:w-1/2
                    bg-neutral-900 group
                `}
                onClick={() => handleSelect('DVD')}
            >
                {/* Background - DVD GIF */}
                <div className="absolute inset-0 z-0">
                    <img src={dvdGif} alt="Background" className="w-full h-full object-cover opacity-50 contrast-125" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
                </div>

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-white font-sans">

                    <div className="mb-8 relative transform group-hover:scale-105 transition-transform duration-500 w-full max-w-xs md:max-w-sm flex items-center justify-center h-32 md:h-40">
                        {/* Organic Glow */}
                        <div className="absolute w-[80%] h-[60%] bg-white/20 blur-[50px] rounded-full z-0" />

                        <img
                            src={dvdLogo}
                            alt="DVD Logo"
                            className="w-full h-auto relative z-10 brightness-0 invert"
                        />
                    </div>

                    <p className="text-sm md:text-base text-neutral-400 mb-8 font-light tracking-[0.2em] uppercase border-t border-b border-transparent py-2">
                        Coleção Digital
                    </p>

                    <button className="flex items-center gap-3 px-8 py-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        ACESSAR DISCOS <ArrowRight size={18} />
                    </button>

                    {/* Modern Metadata */}
                    <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1 opacity-40 text-xs text-right font-mono">
                        <span>DOLBY DIGITAL</span>
                        <span>WIDESCREEN</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
