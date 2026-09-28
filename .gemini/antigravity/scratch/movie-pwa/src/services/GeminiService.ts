import { parseRecommendation, type Preferences, type RecommendationCandidate, type Recommendation } from '../utils/recommendations';

export class GeminiService {
    async isAvailable(signal?: AbortSignal): Promise<boolean> {
        const response = await fetch('/api/recommend', { signal, cache: 'no-store' });
        if (!response.ok) return false;
        const data: unknown = await response.json();
        return !!data && typeof data === 'object' && 'available' in data && data.available === true;
    }

    async getRecommendation(candidates: RecommendationCandidate[], preferences: Preferences, signal?: AbortSignal): Promise<Recommendation> {
        const token = window.gapi?.client?.getToken()?.access_token;
        if (!token) throw new Error('Entre novamente com sua conta Google para consultar a IA.');
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ candidates, preferences }),
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível consultar a IA.');
        }
        return parseRecommendation(data, candidates);
    }
}
export const geminiService = new GeminiService();
