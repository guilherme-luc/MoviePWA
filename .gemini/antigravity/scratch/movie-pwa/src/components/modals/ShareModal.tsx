import React, { useRef, useState } from 'react';
import { X, Share2, Download, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { Movie } from '../../types';
import { triggerConfetti } from '../../utils/confetti';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    movie: Movie;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, movie }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastAction, setLastAction] = useState<'download' | 'share' | null>(null);

    const generateImage = async () => {
        if (!cardRef.current) return null;
        try {
            // Wait for images to load if needed, but usually they are cached
            const dataUrl = await toPng(cardRef.current, {
                quality: 0.95,
                pixelRatio: 2, // High res for retina
                cacheBust: true,
            });
            return dataUrl;
        } catch (err) {
            console.error('Failed to generate image', err);
            return null;
        }
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        const dataUrl = await generateImage();
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = `${movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_card.png`;
            link.href = dataUrl;
            link.click();
            setLastAction('download');
            triggerConfetti();
        }
        setIsGenerating(false);
    };

    const handleShare = async () => {
        setIsGenerating(true);
        const dataUrl = await generateImage();
        if (dataUrl) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], 'movie_card.png', { type: 'image/png' });

                if (navigator.share) {
                    await navigator.share({
                        title: `Olha esse filme: ${movie.title}`,
                        text: `Recomendo o filme ${movie.title} (${movie.year})!`,
                        files: [file],
                    });
                    setLastAction('share');
                    triggerConfetti();
                } else {
                    alert('Seu navegador não suporta compartilhamento nativo. Tente baixar a imagem.');
                }
            } catch (err) {
                console.error('Share failed', err);
                alert('Erro ao compartilhar. Tente baixar a imagem.');
            }
        }
        setIsGenerating(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">

                <div className="w-full flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Share2 className="text-primary-400" size={24} />
                        Compartilhar
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* The Card Preview (Also the capture target) */}
                <div className="relative group w-full aspect-[9/16] max-h-[500px] shadow-2xl overflow-hidden rounded-xl mb-6 select-none">
                    <div
                        ref={cardRef}
                        className="w-full h-full bg-neutral-900 relative flex flex-col font-sans"
                    >
                        {/* Background Image (Blurred) */}
                        <div className="absolute inset-0 z-0">
                            {movie.imageValue ? (
                                <img
                                    src={movie.imageType === 'tmdb' ? `https://image.tmdb.org/t/p/w500${movie.imageValue}` : movie.imageValue}
                                    className="w-full h-full object-cover opacity-40 blur-sm scale-110"
                                    alt=""
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-800" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-primary-900/30" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex-1 flex flex-col p-6 items-center justify-center text-center">

                            {/* Main Poster (Shadowed) */}
                            <div className="relative w-40 h-60 rounded-lg shadow-2xl shadow-black/60 mb-6 transform rotate-[-2deg] border-2 border-white/10 overflow-hidden bg-neutral-800">
                                {movie.imageValue ? (
                                    <img
                                        src={movie.imageType === 'tmdb' ? `https://image.tmdb.org/t/p/w342${movie.imageValue}` : movie.imageValue}
                                        className="w-full h-full object-cover"
                                        alt={movie.title}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600">No Image</div>
                                )}
                            </div>

                            <h1 className="text-3xl font-black text-white leading-tight mb-2 drop-shadow-lg">
                                {movie.title}
                            </h1>
                            <p className="text-primary-200 font-medium text-lg mb-4">
                                {movie.year} • {movie.genre}
                            </p>

                            <div className="flex items-center gap-1 mb-6">
                                {[1, 2, 3, 4, 5].map(star => {
                                    const rating = parseFloat(movie.userRating || movie.rating || '0') / 2;
                                    return (
                                        <svg key={star} className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-neutral-600'}`} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    );
                                })}
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/10 w-full">
                                <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                                    Minha Coleção
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-2 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
                    >
                        {lastAction === 'download' ? <Check size={18} className="text-green-400" /> : <Download size={18} />}
                        {isGenerating && lastAction === 'download' ? 'Gerando...' : 'Baixar'}
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {lastAction === 'share' ? <Check size={18} /> : <Share2 size={18} />}
                        {isGenerating && lastAction === 'share' ? 'Enviando...' : 'Stories'}
                    </button>
                </div>

            </div>
        </div>
    );
};
