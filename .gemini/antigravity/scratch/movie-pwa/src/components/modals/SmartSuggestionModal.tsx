import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Smile, Film, BrainCircuit, RefreshCw, Play } from 'lucide-react';
import { geminiService, isGeminiAvailable } from '../../services/GeminiService';

// ... (previous imports)

export const SmartSuggestionModal: React.FC<SmartSuggestionModalProps> = ({ isOpen, onClose, movies }) => {
    // ... (previous state)
    const [reasoning, setReasoning] = useState<string | null>(null);
    const [isAiActive, setIsAiActive] = useState(false);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('intro');
            setResult(null);
            setReasoning(null);
            setPreferences({ mood: 'any', duration: 'any', status: 'any' });
            setIsAiActive(isGeminiAvailable());
        }
    }, [isOpen]);

    // ... (handleNext)

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
        // If AI is active, we can be looser with local filtering and let AI pick better, 
        // OR we filter strictly first to save tokens. Let's filter strictly to ensure accuracy.
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
                        aiReasoning = "O Gemini escolheu este, mas se perdeu no título. Aproveite!";
                    }
                } else {
                    winner = pool[Math.floor(Math.random() * pool.length)];
                    aiReasoning = "O Gemini estava dormindo, mas o algoritmo local escolheu este!";
                }
            } catch (e) {
                winner = pool[Math.floor(Math.random() * pool.length)];
            }
        } else {
            // LOCAL MODE
            winner = pool[Math.floor(Math.random() * pool.length)];
        }

        setResult(winner);
        setReasoning(aiReasoning);
        setStep('result');
    };

    // ... (getImageUrl)

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* ... (Backdrop/Modal wrapper) */}
            <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col min-h-[400px] animate-in zoom-in-95 duration-300">

                {/* Header Gradient */}
                <div className={`absolute top-0 w-full h-32 pointer-events-none bg-gradient-to-b ${isAiActive ? 'from-blue-600/30' : 'from-purple-600/20'} to-transparent`} />

                {/* ... (Close Button) */}

                {/* ... (Steps Intro/Mood/Time/Status - keeping mostly same) */}
                {/* NOTE: You might need to verify if lines match exactly or use larger chunk replacement if structure changes significantly */}

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
