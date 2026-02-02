import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Smile, Film, BrainCircuit, RefreshCw, Play } from 'lucide-react';
import { geminiService, isGeminiAvailable } from '../../services/GeminiService';
import type { Movie } from '../../types';

interface SmartSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[]; // All movies to filter from
}

type Step = 'intro' | 'mood' | 'submood' | 'time' | 'status' | 'analysis' | 'result';
type Mood = 'laugh' | 'tension' | 'adrenaline' | 'emotion' | 'any';
type SubMood = string;
type Duration = 'short' | 'medium' | 'long' | 'any';
type Status = 'new' | 'rewatch' | 'any';

const SUB_MOODS: Record<Mood, { label: string, desc: string, value: string }[]> = {
    'laugh': [
        { label: 'Pastelão / Bobo', desc: 'Para desligar o cérebro', value: 'slapstick' },
        { label: 'Sátira / Inteligente', desc: 'Humor ácido e críticas', value: 'satire' },
        { label: 'Romântica', desc: 'Leve e apaixonante', value: 'romcom' },
        { label: 'Animação / Família', desc: 'Para todas as idades', value: 'family' }
    ],
    'tension': [
        { label: 'Susto (Jump Scares)', desc: 'Terror clássico', value: 'jump_scare' },
        { label: 'Psicológico', desc: 'Mexe com a mente', value: 'psychological' },
        { label: 'Mistério / Crime', desc: 'Quem matou?', value: 'mystery' },
        { label: 'Sangrento (Slasher)', desc: 'Violência gráfica', value: 'slasher' }
    ],
    'adrenaline': [
        { label: 'Policial / Crime', desc: 'Tiros e perseguições', value: 'police' },
        { label: 'Super-Heróis', desc: 'Poderes e efeitos', value: 'scifi_action' },
        { label: 'Guerra / Histórico', desc: 'Batalhas épicas', value: 'war' },
        { label: 'Espionagem / Thriller', desc: 'Tensão e agentes secretos', value: 'spy' }
    ],
    'emotion': [
        { label: 'Romance Clichê', desc: 'Final feliz garantido', value: 'romance_cliche' },
        { label: 'Drama Pesado', desc: 'Para chorar no banho', value: 'heavy_drama' },
        { label: 'Inspirador', desc: 'Histórias de superação', value: 'inspiring' },
        { label: 'Íntimo / Indie', desc: 'Diálogos profundos', value: 'indie' }
    ],
    'any': []
};

export const SmartSuggestionModal: React.FC<SmartSuggestionModalProps> = ({ isOpen, onClose, movies }) => {
    const [step, setStep] = useState<Step>('intro');
    const [preferences, setPreferences] = useState({
        mood: 'any' as Mood,
        subMood: 'any' as SubMood,
        duration: 'any' as Duration,
        status: 'any' as Status
    });
    const [result, setResult] = useState<Movie | null>(null);
    const [analysisText, setAnalysisText] = useState('Analisando sua coleção...');
    const [reasoning, setReasoning] = useState<string | null>(null);
    const [isAiActive, setIsAiActive] = useState(false);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('intro');
            setResult(null);
            setReasoning(null);
            setPreferences({ mood: 'any', subMood: 'any', duration: 'any', status: 'any' });
            setIsAiActive(isGeminiAvailable());
        }
    }, [isOpen]);

    const handleNext = (nextStep: Step) => {
        setStep(nextStep);
    };

    const runAnalysis = async () => {
        setStep('analysis');
        setAnalysisText(isAiActive ? 'Conectando ao cérebro do Gemini...' : 'Analisando sua coleção...');

        // Simulated Analysis Steps
        const messages = isAiActive
            ? ["Lendo sinopses...", "Entendendo seus pedidos...", "Gerando justificativa..."]
            : ["Escaneando seus gostos...", "Filtrando por duração...", "Encontrando a combinação perfeita..."];

        for (const msg of messages) {
            setAnalysisText(msg);
            await new Promise(r => setTimeout(r, isAiActive ? 800 : 600));
        }

        // --- FILTER POOL (Common Logic) ---
        let pool = [...movies];

        // 1. Filter by Status
        if (preferences.status === 'new') {
            pool = pool.filter(m => !m.watched);
        } else if (preferences.status === 'rewatch') {
            pool = pool.filter(m => m.watched);
        }

        // 2. Filter by Duration
        const parseDuration = (d?: string) => {
            if (!d) return null;
            const match = d.match(/(\d+)h\s*(\d*)m?/);
            if (!match) return null;
            return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
        };

        if (preferences.duration !== 'any') {
            pool = pool.filter(m => {
                const mins = parseDuration(m.duration);
                if (mins === null) return true;
                if (preferences.duration === 'short') return mins < 100;
                if (preferences.duration === 'medium') return mins >= 100 && mins <= 140;
                if (preferences.duration === 'long') return mins > 140;
                return true;
            });
        }

        // 3. Filter by Mood (Strict filter for Local, "Hint" for AI)
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

        // Fallback if pool is empty
        if (pool.length === 0) {
            pool = [...movies]; // Reset to full list
            if (isAiActive) setAnalysisText("Nenhum match exato, buscando alternativa...");
        }

        // --- SELECTION ---
        let winner: Movie;
        let aiReasoning = null;

        if (isAiActive) {
            // GEMINI MODE
            try {
                // Limit candidates to random 20 to avoid token limits/latency if list is huge
                const candidates = pool.sort(() => 0.5 - Math.random()).slice(0, 20);
                const recommendation = await geminiService.getRecommendation(candidates, preferences);

                if (recommendation) {
                    // Find the movie object that matches the title
                    const found = movies.find(m => m.title === recommendation.movieTitle);
                    if (found) {
                        winner = found;
                        aiReasoning = recommendation.reasoning;
                    } else {
                        // Fallback if AI hallucinates a title
                        winner = candidates[0];
                        aiReasoning = `O Gemini sugeriu "${recommendation.movieTitle}", mas não achei na lista. Fica este como consolo!`;
                    }
                } else {
                    // Should not happen as service throws now, but safe fallback
                    winner = pool[Math.floor(Math.random() * pool.length)];
                    aiReasoning = "O Gemini ficou em silêncio (sem resposta).";
                }
            } catch (e: any) {
                winner = pool[Math.floor(Math.random() * pool.length)];
                // Show the specific error to help debug (e.g. "API Key not valid")
                const msg = e.message || 'Erro desconhecido';
                if (msg.includes('400') || msg.includes('API key')) {
                    aiReasoning = "Erro de Chave API: Verifique se sua chave está correta e reinicie o app.";
                } else if (msg.includes('429')) {
                    aiReasoning = "O Gemini está sobrecarregado (Muitos pedidos). Tente de novo em instantes.";
                } else {
                    aiReasoning = `O Gemini falhou: ${msg.slice(0, 50)}... mas escolhi este!`;
                }
            }
        } else {
            // LOCAL MODE
            winner = pool[Math.floor(Math.random() * pool.length)];
        }

        setResult(winner);
        setReasoning(aiReasoning);
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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col min-h-[400px] animate-in zoom-in-95 duration-300">

                {/* Header Gradient */}
                <div className={`absolute top-0 w-full h-32 pointer-events-none bg-gradient-to-b ${isAiActive ? 'from-blue-600/30' : 'from-purple-600/20'} to-transparent`} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* --- STEPS --- */}

                {step === 'intro' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4">
                        <div className={`w-20 h-20 ${isAiActive ? 'bg-blue-500/20' : 'bg-purple-500/20'} rounded-full flex items-center justify-center mb-6 animate-pulse`}>
                            {isAiActive ? <BrainCircuit className="text-blue-400" size={40} /> : <Sparkles className="text-purple-400" size={40} />}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">
                            {isAiActive ? 'Consultor Gemini AI' : 'Sugestão Inteligente'}
                        </h2>
                        <p className="text-neutral-400 mb-8 max-w-xs">
                            {isAiActive
                                ? 'O Gemini analisará cada filme da sua coleção para encontrar a escolha perfeita para seu momento.'
                                : 'Não sabe o que assistir? Responda 3 perguntas rápidas e eu encontro o filme perfeito na sua coleção.'}
                        </p>
                        <button
                            onClick={() => handleNext('mood')}
                            className={`w-full ${isAiActive ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/25'} text-white py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg`}
                        >
                            Começar
                        </button>
                    </div>
                )}

                {step === 'mood' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <div className="flex-1">
                            <StepHeader step={1} title="Qual a vibe de hoje?" color={isAiActive ? 'blue' : 'purple'} />

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <OptionCard
                                    icon={<Smile size={24} />}
                                    label="Dar Risada"
                                    desc="Comédia, Animação"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'laugh' }); handleNext('submood'); }}
                                    color={isAiActive ? 'blue' : 'purple'}
                                />
                                <OptionCard
                                    icon={<Clock size={24} />}
                                    label="Tensão"
                                    desc="Suspense, Terror"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'tension' }); handleNext('submood'); }}
                                    color={isAiActive ? 'blue' : 'purple'}
                                />
                                <OptionCard
                                    icon={<Play size={24} />}
                                    label="Adrenalina"
                                    desc="Ação, Aventura"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'adrenaline' }); handleNext('submood'); }}
                                    color={isAiActive ? 'blue' : 'purple'}
                                />
                                <OptionCard
                                    icon={<Film size={24} />}
                                    label="Emoção / Drama"
                                    desc="Drama, Romance"
                                    onClick={() => { setPreferences({ ...preferences, mood: 'emotion' }); handleNext('submood'); }}
                                    color={isAiActive ? 'blue' : 'purple'}
                                />
                            </div>
                            <button
                                onClick={() => { setPreferences({ ...preferences, mood: 'any', subMood: 'any' }); handleNext('time'); }}
                                className="w-full mt-4 py-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors border border-white/5"
                            >
                                Surpreenda-me (Qualquer gênero)
                            </button>
                        </div>
                    </div>
                )}

                {step === 'submood' && preferences.mood !== 'any' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <div className="flex-1">
                            <StepHeader step={2} title="Especifique o estilo..." color={isAiActive ? 'blue' : 'purple'} />

                            <div className="grid grid-cols-1 gap-3 mt-6">
                                {SUB_MOODS[preferences.mood].map((sub) => (
                                    <OptionCard
                                        key={sub.value}
                                        icon={<Sparkles size={18} />}
                                        label={sub.label}
                                        desc={sub.desc}
                                        onClick={() => { setPreferences({ ...preferences, subMood: sub.value }); handleNext('time'); }}
                                        color={isAiActive ? 'blue' : 'purple'}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'time' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <StepHeader step={3} title="Quanto tempo você tem?" color={isAiActive ? 'blue' : 'purple'} />
                        <div className="grid grid-cols-1 gap-3 mt-6">
                            <OptionCard
                                icon={<Clock size={20} />}
                                label="Rapidinho (< 1h 40min)"
                                desc="Ideal para dias corridos"
                                onClick={() => { setPreferences({ ...preferences, duration: 'short' }); handleNext('status'); }}
                                color={isAiActive ? 'blue' : 'purple'}
                            />
                            <OptionCard
                                icon={<Clock size={20} />}
                                label="Sessão Pipoca (~ 2h)"
                                desc="Duração padrão de filme"
                                onClick={() => { setPreferences({ ...preferences, duration: 'medium' }); handleNext('status'); }}
                                color={isAiActive ? 'blue' : 'purple'}
                            />
                            <OptionCard
                                icon={<Clock size={20} />}
                                label="Épico (> 2h 20min)"
                                desc="Tenho a noite toda"
                                onClick={() => { setPreferences({ ...preferences, duration: 'long' }); handleNext('status'); }}
                                color={isAiActive ? 'blue' : 'purple'}
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
                        <StepHeader step={4} title="O que vamos ver?" color={isAiActive ? 'blue' : 'purple'} />
                        <div className="grid grid-cols-1 gap-3 mt-6">
                            <OptionCard
                                icon={<Sparkles size={20} />}
                                label="Algo NOVO"
                                desc="Que eu nunca assisti"
                                onClick={() => { setPreferences({ ...preferences, status: 'new' }); runAnalysis(); }}
                                color={isAiActive ? 'blue' : 'purple'}
                            />
                            <OptionCard
                                icon={<RefreshCw size={20} />}
                                label="Rever um Favorito"
                                desc="Algo que já vi"
                                onClick={() => { setPreferences({ ...preferences, status: 'rewatch' }); runAnalysis(); }}
                                color={isAiActive ? 'blue' : 'purple'}
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
                            <div className={`absolute inset-0 border-4 ${isAiActive ? 'border-blue-500/30' : 'border-purple-500/30'} rounded-full animate-ping`} />
                            <div className={`absolute inset-0 border-4 ${isAiActive ? 'border-t-blue-500' : 'border-t-purple-500'} rounded-full animate-spin`} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BrainCircuit className={isAiActive ? "text-blue-400" : "text-purple-400"} size={32} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {isAiActive ? 'Consultando IA...' : 'Processando...'}
                        </h3>
                        <p className={`${isAiActive ? 'text-blue-300/80' : 'text-purple-300/80'} animate-pulse`}>{analysisText}</p>
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

                            {/* AI Justification */}
                            {reasoning && (
                                <div className="mx-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2">
                                    <p className="text-sm text-blue-200 italic">" {reasoning} "</p>
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        <Sparkles size={10} className="text-blue-400" />
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Gemini AI</span>
                                    </div>
                                </div>
                            )}

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
const StepHeader = ({ step, title, color = 'purple' }: { step: number, title: string, color?: string }) => {
    const colorClass = color === 'blue' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return (
        <div className="text-center">
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-3 border ${colorClass}`}>
                Passo {step} de 3
            </span>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
    );
};

const OptionCard = ({ icon, label, desc, onClick, color = 'purple' }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void, color?: string }) => {
    const hoverClass = color === 'blue' ? 'hover:bg-blue-600/20 hover:border-blue-500/50 group-hover:text-blue-400' : 'hover:bg-purple-600/20 hover:border-purple-500/50 group-hover:text-purple-400';
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-start p-4 bg-neutral-800/50 border border-white/5 rounded-xl transition-all text-left w-full group active:scale-[0.98] ${hoverClass}`}
        >
            <div className={`mb-2 text-neutral-400 transition-colors ${color === 'blue' ? 'group-hover:text-blue-400' : 'group-hover:text-purple-400'}`}>{icon}</div>
            <span className="text-white font-bold text-sm block">{label}</span>
            <span className="text-neutral-500 text-xs">{desc}</span>
        </button>
    );
};
