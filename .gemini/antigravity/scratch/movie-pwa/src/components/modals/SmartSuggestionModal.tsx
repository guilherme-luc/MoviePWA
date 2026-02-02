import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Smile, Film, BrainCircuit, RefreshCw, Play } from 'lucide-react';
import type { Movie } from '../../types';


interface SmartSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[]; // All movies to filter from
}

type Step = 'intro' | 'mood' | 'time' | 'status' | 'analysis' | 'result';
type Mood = 'laugh' | 'tension' | 'adrenaline' | 'emotion' | 'any';
type Duration = 'short' | 'medium' | 'long' | 'any';
type Status = 'new' | 'rewatch' | 'any';

export const SmartSuggestionModal: React.FC<SmartSuggestionModalProps> = ({ isOpen, onClose, movies }) => {
    const [step, setStep] = useState<Step>('intro');
    const [preferences, setPreferences] = useState({
        mood: 'any' as Mood,
        duration: 'any' as Duration,
        status: 'any' as Status
    });
    const [result, setResult] = useState<Movie | null>(null);
    const [analysisText, setAnalysisText] = useState('Analisando sua coleção...');

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('intro');
            setResult(null);
            setPreferences({ mood: 'any', duration: 'any', status: 'any' });
        }
    }, [isOpen]);

    const handleNext = (nextStep: Step) => {
        setStep(nextStep);
    };

    const runAnalysis = async () => {
        setStep('analysis');

        // Simulated Analysis Steps
        const messages = [
            "Escaneando seus gostos...",
            "Filtrando por duração...",
            "Consultando o oráculo do cinema...",
            "Encontrando a combinação perfeita..."
        ];

        for (const msg of messages) {
            setAnalysisText(msg);
            await new Promise(r => setTimeout(r, 600));
        }

        // --- ALGORITHM ---
        let pool = [...movies];

        // 1. Filter by Status
        if (preferences.status === 'new') {
            pool = pool.filter(m => !m.watched);
        } else if (preferences.status === 'rewatch') {
            pool = pool.filter(m => m.watched);
        }

        // 2. Filter by Duration (Wildcard strategy: keep if missing)
        const parseDuration = (d?: string) => {
            if (!d) return null; // Missing
            const match = d.match(/(\d+)h\s*(\d*)m?/);
            if (!match) return null;
            return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
        };

        if (preferences.duration !== 'any') {
            pool = pool.filter(m => {
                const mins = parseDuration(m.duration);
                if (mins === null) return true; // Keep wildcard

                if (preferences.duration === 'short') return mins < 100;
                if (preferences.duration === 'medium') return mins >= 100 && mins <= 140;
                if (preferences.duration === 'long') return mins > 140;
                return true;
            });
        }

        // 3. Filter by Mood (Genre Mapping)
        if (preferences.mood !== 'any') {
            pool = pool.filter(m => {
                const g = m.genre.toLowerCase();
                const t = m.tags?.join(' ').toLowerCase() || '';
                const combined = g + ' ' + t;

                if (preferences.mood === 'laugh') return combined.includes('comédia') || combined.includes('animação') || combined.includes('família');
                if (preferences.mood === 'tension') return combined.includes('suspense') || combined.includes('terror') || combined.includes('mistério') || combined.includes('crime');
                if (preferences.mood === 'adrenaline') return combined.includes('ação') || combined.includes('aventura') || combined.includes('ficção') || combined.includes('guerra');
                if (preferences.mood === 'emotion') return combined.includes('drama') || combined.includes('romance') || combined.includes('música');
                return true;
            });
        }

        // 4. Select Winner
        // Prefer higher rated movies if pool is large
        if (pool.length === 0) {
            // Fallback: Relax constraints (e.g. ignore mood)
            pool = [...movies];
            // Simple random fallback
        }

        const winner = pool[Math.floor(Math.random() * pool.length)];
        setResult(winner);
        setStep('result');
    };

    const getImageUrl = (movie: Movie) => {
        if (!movie?.imageValue) return null;
        return movie.imageType === 'tmdb'
            ? `https://image.tmdb.org/t/p/w342${movie.imageValue}` // Medium quality is enough
            : movie.imageValue;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col min-h-[400px] animate-in zoom-in-95 duration-300">

                {/* Header Gradient */}
                <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-purple-600/20 to-transparent pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* --- STEPS --- */}

                {step === 'intro' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Sparkles className="text-purple-400" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Sugestão Inteligente</h2>
                        <p className="text-neutral-400 mb-8 max-w-xs">
                            Não sabe o que assistir? Responda 3 perguntas rápidas e eu encontro o filme perfeito na sua coleção.
                        </p>
                        <button
                            onClick={() => handleNext('mood')}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/25"
                        >
                            Começar
                        </button>
                    </div>
                )}

                {step === 'mood' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <div className="flex-1">
                            <StepHeader step={1} title="Qual a vibe de hoje?" />

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <OptionCard
                                    icon={<Smile size={24} />}
                                    label="Dar Risada"
                                    desc="Comédia, Animação"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'laugh' }); handleNext('time'); }}
                                />
                                <OptionCard
                                    icon={<Clock size={24} />} // Using Clock as generic 'Tension' icon placeholder or maybe Zap
                                    label="Tensão"
                                    desc="Suspense, Terror"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'tension' }); handleNext('time'); }}
                                />
                                <OptionCard
                                    icon={<Play size={24} />}
                                    label="Adrenalina"
                                    desc="Ação, Aventura"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'adrenaline' }); handleNext('time'); }}
                                />
                                <OptionCard
                                    icon={<Film size={24} />}
                                    label="Emoção / Drama"
                                    desc="Drama, Romance"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'emotion' }); handleNext('time'); }}
                                />
                            </div>
                            <button
                                onClick={() => { setPreferences({ ...preferences, mood: 'any' }); handleNext('time'); }}
                                className="w-full mt-4 py-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors border border-white/5"
                            >
                                Surpreenda-me (Qualquer gênero)
                            </button>
                        </div>
                    </div>
                )}

                {step === 'time' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <StepHeader step={2} title="Quanto tempo você tem?" />
                        <div className="grid grid-cols-1 gap-3 mt-6">
                            <OptionCard
                                icon={<Clock size={20} />}
                                label="Rapidinho (< 1h 40min)"
                                desc="Ideal para dias corridos"
                                onClick={() => { setPreferences({ ...preferences, duration: 'short' }); handleNext('status'); }}
                            />
                            <OptionCard
                                icon={<Clock size={20} />}
                                label="Sessão Pipoca (~ 2h)"
                                desc="Duração padrão de filme"
                                onClick={() => { setPreferences({ ...preferences, duration: 'medium' }); handleNext('status'); }}
                            />
                            <OptionCard
                                icon={<Clock size={20} />}
                                label="Épico (> 2h 20min)"
                                desc="Tenho a noite toda"
                                onClick={() => { setPreferences({ ...preferences, duration: 'long' }); handleNext('status'); }}
                            />
                            <button
                                onClick={() => { setPreferences({ ...preferences, duration: 'any' }); handleNext('status'); }}
                                className="w-full mt-2 py-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors border border-white/5"
                            >
                                Tanto faz
                            </button>
                        </div>
                    </div>
                )}

                {step === 'status' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <StepHeader step={3} title="O que vamos ver?" />
                        <div className="grid grid-cols-1 gap-3 mt-6">
                            <OptionCard
                                icon={<Sparkles size={20} />}
                                label="Algo NOVO"
                                desc="Que eu nunca assisti"
                                onClick={() => { setPreferences({ ...preferences, status: 'new' }); runAnalysis(); }}
                            />
                            <OptionCard
                                icon={<RefreshCw size={20} />}
                                label="Rever um Favorito"
                                desc="Algo que já vi"
                                onClick={() => { setPreferences({ ...preferences, status: 'rewatch' }); runAnalysis(); }}
                            />
                            <button
                                onClick={() => { setPreferences({ ...preferences, status: 'any' }); runAnalysis(); }}
                                className="w-full mt-2 py-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors border border-white/5"
                            >
                                Tanto faz
                            </button>
                        </div>
                    </div>
                )}

                {step === 'analysis' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping" />
                            <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BrainCircuit className="text-purple-400" size={32} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Processando...</h3>
                        <p className="text-purple-300/80 animate-pulse">{analysisText}</p>
                    </div>
                )}

                {step === 'result' && result && (
                    <div className="flex-1 flex flex-col p-6 animate-in zoom-in-95 duration-500">
                        <div className="text-center mb-4">
                            <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Melhor Combinação Encontrada</span>
                        </div>

                        {/* Result Card */}
                        <div className="flex-1 flex flex-col items-center">
                            <div className="relative w-40 aspect-[2/3] bg-neutral-800 rounded-xl overflow-hidden shadow-2xl mb-4 border border-white/10 ring-4 ring-purple-500/20">
                                {result.imageValue ? (
                                    <img src={getImageUrl(result) || ''} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">🎬</div>
                                )}
                            </div>

                            <h2 className="text-2xl font-bold text-white text-center leading-tight mb-1">{result.title}</h2>
                            <div className="flex gap-2 text-sm text-neutral-400 mb-6">
                                <span>{result.year}</span>
                                <span>•</span>
                                <span>{result.genre}</span>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-white text-black hover:bg-neutral-200 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mb-3"
                            >
                                <Play size={20} fill="currentColor" />
                                Assistir Agora
                            </button>

                            <button
                                onClick={() => setStep('intro')}
                                className="text-neutral-500 hover:text-white text-sm py-2"
                            >
                                Reiniciar
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

// UI Helpers
const StepHeader = ({ step, title }: { step: number, title: string }) => (
    <div className="text-center">
        <span className="inline-block px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded-full mb-3 border border-purple-500/20">
            Passo {step} de 3
        </span>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
    </div>
);

const OptionCard = ({ icon, label, desc, onClick }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-start p-4 bg-neutral-800/50 hover:bg-purple-600/20 hover:border-purple-500/50 border border-white/5 rounded-xl transition-all text-left w-full group active:scale-[0.98]"
    >
        <div className="mb-2 text-neutral-400 group-hover:text-purple-400 transition-colors">{icon}</div>
        <span className="text-white font-bold text-sm block">{label}</span>
        <span className="text-neutral-500 text-xs">{desc}</span>
    </button>
);
