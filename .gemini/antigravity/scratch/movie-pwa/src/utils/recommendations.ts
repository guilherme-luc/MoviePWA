import type { Movie } from '../types';

export type Mood = 'laugh' | 'tension' | 'adrenaline' | 'emotion' | 'any';
export interface Preferences {
    mood: Mood;
    subMood: string;
    duration: 'short' | 'medium' | 'long' | 'any';
    status: 'new' | 'rewatch' | 'any';
}

export const defaultPreferences: Preferences = { mood: 'any', subMood: 'any', duration: 'any', status: 'any' };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function durationMinutes(value?: string): number | null {
    if (!value?.trim()) return null;
    const text = value.trim().toLowerCase();
    const hours = text.match(/^(\d+)\s*h(?:\s*(\d+)\s*(?:m|min)?)?$/);
    const minutes = text.match(/^(\d+)\s*(?:m|min|minutos)?$/);
    const clock = text.match(/^(\d+):(\d{2})$/);
    let result: number | null = null;
    if (hours) result = Number(hours[1]) * 60 + Number(hours[2] || 0);
    else if (minutes) result = Number(minutes[1]);
    else if (clock && Number(clock[2]) < 60) result = Number(clock[1]) * 60 + Number(clock[2]);
    return result !== null && result > 0 ? result : null;
}

const moodWords: Record<Mood, string[]> = {
    any: [],
    laugh: ['comedia', 'animacao', 'familia', 'comedy', 'animation', 'family'],
    tension: ['suspense', 'terror', 'misterio', 'crime', 'thriller', 'horror', 'mystery'],
    adrenaline: ['acao', 'aventura', 'ficcao', 'guerra', 'action', 'adventure', 'sci-fi', 'war'],
    emotion: ['drama', 'romance', 'musica', 'music'],
};

export function filterMovies(movies: Movie[], preferences: Preferences): Movie[] {
    return movies.filter(movie => {
        if (preferences.status === 'new' && movie.watched) return false;
        if (preferences.status === 'rewatch' && !movie.watched) return false;
        if (preferences.duration !== 'any') {
            const minutes = durationMinutes(movie.duration);
            if (minutes === null) return false;
            if (preferences.duration === 'short' && minutes >= 100) return false;
            if (preferences.duration === 'medium' && (minutes < 100 || minutes > 140)) return false;
            if (preferences.duration === 'long' && minutes <= 140) return false;
        }
        const genres = normalize([movie.genre, ...(movie.tags || [])].join(' '));
        return preferences.mood === 'any' || moodWords[preferences.mood].some(word => genres.includes(word));
    });
}

export interface RecommendationEvent {
    id: string;
    movieKey: string;
    at: number;
    source: 'ai' | 'local';
    feedback?: 'like' | 'dislike';
}

export function movieKey(movie: Movie): string {
    return JSON.stringify([movie.format || 'DVD', movie.barcode || '', movie.title, movie.year]);
}

const styleWords: Record<string, string[]> = {
    slapstick: ['pastelao', 'slapstick', 'parodia', 'trapalh'],
    satire: ['satira', 'satire', 'critica social', 'humor acido'],
    romcom: ['romance', 'romant', 'romcom'], family: ['familia', 'animacao', 'infantil'],
    jump_scare: ['sobrenatural', 'fantasma', 'assombr', 'susto'],
    psychological: ['psicologic', 'psychological', 'paranoia'],
    mystery: ['misterio', 'investig', 'detetive', 'crime'], slasher: ['slasher', 'serial killer', 'assassino'],
    police: ['policial', 'policia', 'crime'], scifi_action: ['super-heroi', 'super heroi', 'superpoder', 'marvel', 'dc comics'],
    war: ['guerra', 'batalha', 'militar'], spy: ['espion', 'agente secreto', 'spy'],
    romance_cliche: ['romance', 'romant', 'amor'], heavy_drama: ['drama', 'luto', 'tragedia'],
    inspiring: ['superacao', 'inspir', 'perseveranca'], indie: ['indie', 'independente', 'intim'],
};

// Ranking and feedback run locally, without additional API requests.
export function rankMovies(movies: Movie[], preferences: Preferences, history: RecommendationEvent[] = [], now = Date.now()): Movie[] {
    const scored = filterMovies(movies, preferences).map((movie, index) => {
        const text = normalize([movie.genre, movie.synopsis || '', ...(movie.tags || [])].join(' '));
        let score = (styleWords[preferences.subMood] || []).filter(word => text.includes(word)).length * 8;
        const rating = Number((movie.userRating || '').replace(',', '.'));
        if (Number.isFinite(rating)) score += Math.max(0, Math.min(10, rating));
        const events = history.filter(event => event.movieKey === movieKey(movie)).sort((a, b) => b.at - a.at);
        const feedback = events.find(event => event.feedback)?.feedback;
        if (feedback === 'like') score += 4;
        if (feedback === 'dislike') score -= 20;
        score -= Math.min(events.filter(event => now - event.at >= 0 && now - event.at < 30 * 86400000).length, 5) * 12;
        return { movie, score, index };
    });
    return scored.sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.movie);
}

export const MAX_CANDIDATES = 20;
export interface RecommendationCandidate {
    id: string;
    title: string;
    year: string;
    genre: string;
    duration: string;
    synopsis: string;
    tags: string[];
    userRating: string;
    director: string;
}

export function buildCandidates(movies: Movie[]): RecommendationCandidate[] {
    const clip = (value: string | undefined, length: number) => String(value || '').slice(0, length);
    return movies.slice(0, MAX_CANDIDATES).map((movie, index) => ({
        // IDs scoped to one request disambiguate missing or repeated barcodes.
        id: `candidate-${index + 1}`, title: clip(movie.title, 200), year: clip(movie.year, 10),
        genre: clip(movie.genre, 120), duration: clip(movie.duration, 30),
        synopsis: clip(movie.synopsis, 700), tags: (movie.tags || []).slice(0, 8).map(tag => clip(tag, 50)),
        userRating: clip(movie.userRating, 10), director: clip(movie.director, 120),
    }));
}

export interface Recommendation { movieId: string; reasoning: string }
export function parseRecommendation(value: unknown, candidates: RecommendationCandidate[]): Recommendation {
    if (!value || typeof value !== 'object') throw new Error('Resposta inválida da IA.');
    const data = value as Record<string, unknown>;
    if (typeof data.movieId !== 'string' || !candidates.some(candidate => candidate.id === data.movieId)) {
        throw new Error('A IA selecionou um filme fora dos candidatos.');
    }
    if (typeof data.reasoning !== 'string' || !data.reasoning.trim() || data.reasoning.length > 600) {
        throw new Error('A IA retornou uma justificativa inválida.');
    }
    return { movieId: data.movieId, reasoning: data.reasoning.trim() };
}

export function readHistory(storage: Pick<Storage, 'getItem'>, scope: string): RecommendationEvent[] {
    try {
        const data: unknown = JSON.parse(storage.getItem(`movie_recommendations_v1:${scope}`) || '[]');
        if (!Array.isArray(data)) return [];
        return data.filter((event): event is RecommendationEvent => !!event && typeof event === 'object'
            && typeof event.id === 'string' && typeof event.movieKey === 'string' && Number.isFinite(event.at)
            && (event.source === 'ai' || event.source === 'local')
            && (event.feedback === undefined || event.feedback === 'like' || event.feedback === 'dislike')).slice(-100);
    } catch { return []; }
}

export function saveHistory(storage: Pick<Storage, 'setItem'>, scope: string, history: RecommendationEvent[]): boolean {
    try {
        storage.setItem(`movie_recommendations_v1:${scope}`, JSON.stringify(history.slice(-100)));
        return true;
    } catch { return false; }
}
