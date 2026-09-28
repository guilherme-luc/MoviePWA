import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Clock, Smile, Film, BrainCircuit, RefreshCw, Play } from 'lucide-react';
import { geminiService } from '../../services/GeminiService';
import type { Movie } from '../../types';
import { rankMovies, buildCandidates, movieKey, readHistory, saveHistory, defaultPreferences, type Preferences, type RecommendationEvent } from '../../utils/recommendations';
import { useCollection } from '../../providers/CollectionProvider';

interface SmartSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    movies: Movie[]; // All movies to filter from
}

type Step = 'intro' | 'mood' | 'submood' | 'time' | 'status' | 'analysis' | 'result' | 'empty' | 'error';
type Mood = 'laugh' | 'tension' | 'adrenaline' | 'emotion' | 'any';

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
        { label: 'Romance Clichê', desc: 'Romance leve e familiar', value: 'romance_cliche' },
        { label: 'Drama Pesado', desc: 'Para chorar no banho', value: 'heavy_drama' },
        { label: 'Inspirador', desc: 'Histórias de superação', value: 'inspiring' },
        { label: 'Íntimo / Indie', desc: 'Diálogos profundos', value: 'indie' }
    ],
    'any': []
};

const SmartSuggestionSession: React.FC<SmartSuggestionModalProps> = ({ isOpen, onClose, movies }) => {
    const [step, setStep] = useState<Step>('intro');
    const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
    const [result, setResult] = useState<Movie | null>(null);
    const [analysisText, setAnalysisText] = useState('');
    const [reasoning, setReasoning] = useState<string | null>(null);
    const [source, setSource] = useState<'ai' | 'local'>('local');
    const [availability, setAvailability] = useState<'checking' | 'available' | 'unavailable'>('checking');
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
    const [historyNotice, setHistoryNotice] = useState('');
    const requestRef = useRef<AbortController | null>(null);
    const eventRef = useRef<string | null>(null);
    const historyRef = useRef<RecommendationEvent[]>([]);
    const { format } = useCollection();
    const isAiActive = availability === 'available';
    // A different Google account provisions different spreadsheet IDs.
    const scope = `${format || 'DVD'}:${localStorage.getItem(format === 'VHS' ? 'user_vhs_spreadsheet_id' : 'user_dvd_spreadsheet_id') || 'guest'}`;

    useEffect(() => {
        if (!isOpen) return;
        const controller = new AbortController();
        historyRef.current = readHistory(localStorage, scope);
        void geminiService.isAvailable(AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]))
            .then(available => { if (!controller.signal.aborted) setAvailability(available ? 'available' : 'unavailable'); })
            .catch(() => { if (!controller.signal.aborted) setAvailability('unavailable'); });
        return () => {
            controller.abort();
            requestRef.current?.abort();
        };
    }, [isOpen, scope]);

    const handleNext = (nextStep: Step) => setStep(nextStep);
    const showResult = (movie: Movie, explanation: string, resultSource: 'ai' | 'local') => {
        setResult(movie);
        setReasoning(explanation);
        setSource(resultSource);
        setFeedback(null);
        const event: RecommendationEvent = { id: crypto.randomUUID(), movieKey: movieKey(movie), at: Date.now(), source: resultSource };
        eventRef.current = event.id;
        historyRef.current = [...historyRef.current, event].slice(-100);
        setHistoryNotice(saveHistory(localStorage, scope, historyRef.current) ? '' : 'O navegador não permitiu salvar o histórico.');
        setStep('result');
    };

    const runAnalysis = async (selected: Preferences = preferences, localOnly = false) => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setPreferences(selected);
        setStep('analysis');
        setError('');
        setAnalysisText('Filtrando e classificando os filmes da coleção...');
        const ranked = rankMovies(movies, selected, historyRef.current);
        if (ranked.length === 0) {
            setStep('empty');
            return;
        }
        if (localOnly || !isAiActive) {
            showResult(ranked[0], 'Sugestão local baseada nos filtros, estilo, notas e histórico deste navegador. Nenhuma IA foi consultada.', 'local');
            return;
        }
        const candidates = buildCandidates(ranked);
        setAnalysisText(`Consultando o Gemini com ${candidates.length} candidatos selecionados por afinidade...`);
        try {
            const recommendation = await geminiService.getRecommendation(candidates, selected, controller.signal);
            if (controller.signal.aborted) return;
            const index = candidates.findIndex(candidate => candidate.id === recommendation.movieId);
            if (index < 0 || !ranked[index]) throw new Error('A IA não retornou um candidato válido.');
            showResult(ranked[index], recommendation.reasoning, 'ai');
        } catch (cause) {
            if (controller.signal.aborted) return;
            setError(cause instanceof Error && cause.name === 'TimeoutError'
                ? 'A consulta demorou demais. Tente novamente ou use a sugestão local.'
                : cause instanceof Error ? cause.message : 'Não foi possível consultar a IA.');
            setStep('error');
        }
    };

    const recordFeedback = (value: 'like' | 'dislike') => {
        if (!eventRef.current) return;
        setFeedback(value);
        historyRef.current = historyRef.current.map(event => event.id === eventRef.current ? { ...event, feedback: value } : event);
        setHistoryNotice(saveHistory(localStorage, scope, historyRef.current) ? 'Preferência salva neste navegador.' : 'Não foi possível salvar a preferência neste navegador.');
    };

    const clearHistory = () => {
        historyRef.current = [];
        eventRef.current = null;
        setFeedback(null);
        setHistoryNotice(saveHistory(localStorage, scope, []) ? 'Histórico e feedback apagados desta coleção.' : 'Não foi possível apagar o histórico salvo.');
    };

    const getImageUrl = (movie: Movie) => {
        if (!movie?.imageValue) return null;
        return movie.imageType === 'tmdb'
            ? `https://image.tmdb.org/t/p/w342${movie.imageValue}` // Medium quality is enough
            : movie.imageValue;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-md max-h-[90dvh] overflow-y-auto bg-neutral-900 border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col min-h-[400px] animate-in zoom-in-95 duration-300">

                {/* Header Gradient */}
                <div className={`absolute top-0 w-full h-32 pointer-events-none bg-gradient-to-b ${isAiActive ? 'from-blue-600/30' : 'from-purple-600/20'} to-transparent`} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Fechar sugestões"
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
                            {availability === 'checking' ? 'Verificando disponibilidade...' : isAiActive ? 'Consultor Gemini AI' : 'Sugestão local'}
                        </h2>
                        <p className="text-neutral-400 mb-8 max-w-xs">
                            {availability === 'checking' ? 'Verificando se a integração está configurada...' : isAiActive
                                ? 'O Gemini compara até 20 candidatos selecionados por afinidade, usando sinopses, tags, diretor e suas notas. Esses dados são enviados ao Google ao pedir uma recomendação.'
                                : 'A IA está indisponível. Você pode receber uma sugestão local com base nos filtros, estilo, notas e histórico deste navegador.'}
                        </p>
                        <button
                            onClick={() => handleNext('mood')}
                            disabled={availability === 'checking' || movies.length === 0}
                            className={`w-full ${isAiActive ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/25'} text-white py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg`}
                        >
                            {movies.length === 0 ? 'Adicione filmes à coleção' : availability === 'checking' ? 'Verificando...' : 'Começar'}
                        </button>
                    </div>
                )}

                {step === 'mood' && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in slide-in-from-right-8">
                        <div className="flex-1">
                            <StepHeader total={preferences.mood === 'any' ? 3 : 4} step={1} title="Qual a vibe de hoje?" color={isAiActive ? 'blue' : 'purple'} />

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
                            <StepHeader total={4} step={2} title="Especifique o estilo..." color={isAiActive ? 'blue' : 'purple'} />

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
                        <StepHeader total={preferences.mood === 'any' ? 3 : 4} step={preferences.mood === 'any' ? 2 : 3} title="Quanto tempo você tem?" color={isAiActive ? 'blue' : 'purple'} />
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
                                desc="Entre 1h 40min e 2h 20min"
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
                        <StepHeader total={preferences.mood === 'any' ? 3 : 4} step={preferences.mood === 'any' ? 3 : 4} title="O que vamos ver?" color={isAiActive ? 'blue' : 'purple'} />
                        <div className="grid grid-cols-1 gap-3 mt-6">
                            <OptionCard
                                icon={<Sparkles size={20} />}
                                label="Algo NOVO"
                                desc="Que eu nunca assisti"
                                onClick={() => { void runAnalysis({ ...preferences, status: 'new' }); }}
                                color={isAiActive ? 'blue' : 'purple'}
                            />
                            <OptionCard
                                icon={<RefreshCw size={20} />}
                                label="Rever um Favorito"
                                desc="Algo que já vi"
                                onClick={() => { void runAnalysis({ ...preferences, status: 'rewatch' }); }}
                                color={isAiActive ? 'blue' : 'purple'}
                            />
                            <button
                                onClick={() => { void runAnalysis({ ...preferences, status: 'any' }); }}
                                className="w-full mt-2 py-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors border border-white/5"
                            >
                                Tanto faz
                            </button>
                        </div>
                    </div>
                )}

                {step === 'empty' && (
                    <div className="p-8 text-center flex flex-col gap-4">
                        <h2 className="text-xl font-bold">Nenhum filme atende aos filtros</h2>
                        <p className="text-neutral-400">{movies.length === 0 ? 'Adicione filmes à coleção para receber sugestões.' : 'Seus critérios foram preservados. Filmes sem duração cadastrada não entram quando há um limite de tempo.'}</p>
                        <button className="bg-blue-600 rounded-xl p-3" onClick={() => setStep('mood')}>Revisar minhas escolhas</button>
                        {movies.length > 0 && preferences.duration !== 'any' && <button className="text-neutral-300 p-2" onClick={() => void runAnalysis({ ...preferences, duration: 'any' })}>Aceitar qualquer duração</button>}
                        {movies.length > 0 && preferences.mood !== 'any' && <button className="text-neutral-300 p-2" onClick={() => void runAnalysis({ ...preferences, mood: 'any', subMood: 'any' })}>Aceitar qualquer gênero</button>}
                        {movies.length > 0 && preferences.status !== 'any' && <button className="text-neutral-300 p-2" onClick={() => void runAnalysis({ ...preferences, status: 'any' })}>Aceitar assistidos e não assistidos</button>}
                    </div>
                )}

                {step === 'error' && (
                    <div className="p-8 text-center flex flex-col gap-4" role="alert">
                        <h2 className="text-xl font-bold">A IA não conseguiu recomendar</h2>
                        <p className="text-neutral-400">{error}</p>
                        <button className="bg-blue-600 rounded-xl p-3" onClick={() => void runAnalysis()}>Tentar novamente</button>
                        <button className="text-neutral-300 p-2" onClick={() => void runAnalysis(preferences, true)}>Usar sugestão local sem IA</button>
                        <button className="text-neutral-300 p-2" onClick={() => setStep('mood')}>Revisar escolhas</button>
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
                            <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">{source === 'ai' ? 'Recomendação do Gemini' : 'Sugestão local — sem IA'}</span>
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
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{source === 'ai' ? 'Gemini AI' : 'Classificação local'}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 text-sm text-neutral-400 mb-6">
                                <span>{result.year}</span>
                                <span>•</span>
                                <span>{result.genre}</span>
                            </div>

                            <div className="w-full mb-4 text-center space-y-2">
                                <p className="text-sm text-neutral-400">Esta sugestão combinou com você?</p>
                                <div className="flex justify-center gap-3">
                                    <button aria-pressed={feedback === 'like'} onClick={() => recordFeedback('like')} className={`px-3 py-2 rounded-lg ${feedback === 'like' ? 'bg-blue-600' : 'bg-neutral-800'}`}>Gostei</button>
                                    <button aria-pressed={feedback === 'dislike'} onClick={() => recordFeedback('dislike')} className={`px-3 py-2 rounded-lg ${feedback === 'dislike' ? 'bg-blue-600' : 'bg-neutral-800'}`}>Não combinou</button>
                                </div>
                                <p className="text-xs text-neutral-400" role="status">{historyNotice || 'O feedback fica neste navegador e ajusta a ordem das próximas sugestões.'}</p>
                                <button onClick={clearHistory} className="text-xs underline text-neutral-400">Apagar histórico e feedback desta coleção</button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-white text-black hover:bg-neutral-200 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mb-3"
                            >
                                <Play size={20} fill="currentColor" />
                                Concluir
                            </button>

                            <button
                                onClick={() => setStep('intro')}
                                className="text-neutral-400 hover:text-white text-sm py-2"
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
const StepHeader = ({ step, total, title, color = 'purple' }: { step: number, total: number, title: string, color?: string }) => {
    const colorClass = color === 'blue' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return (
        <div className="text-center">
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-3 border ${colorClass}`}>
                Passo {step} de {total}
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
            <span className="text-neutral-400 text-xs">{desc}</span>
        </button>
    );
};

export const SmartSuggestionModal: React.FC<SmartSuggestionModalProps> = (props) => {
    const { format } = useCollection();
    return props.isOpen ? <SmartSuggestionSession key={format || 'none'} {...props} /> : null;
};
