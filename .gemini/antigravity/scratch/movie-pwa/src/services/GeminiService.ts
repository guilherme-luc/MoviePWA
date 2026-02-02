import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Movie } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check if the service is available (Key exists)
export const isGeminiAvailable = () => {
    return !!API_KEY && API_KEY.length > 10;
};

interface UserPreferences {
    mood: string;
    duration: string; // 'short', 'medium', 'long', 'any'
    status: string; // 'new', 'rewatch', 'any'
}

interface GeminiRecommendation {
    movieTitle: string;
    reasoning: string;
}

export class GeminiService {
    private genAI: GoogleGenerativeAI | undefined;
    private model: any;

    constructor() {
        if (API_KEY) {
            this.genAI = new GoogleGenerativeAI(API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        }
    }

    async getRecommendation(candidates: Movie[], preferences: UserPreferences): Promise<GeminiRecommendation | null> {
        if (!this.model || candidates.length === 0) return null;

        // Simplify movie list to save tokens/complexity
        const movieList = candidates.map(m => `- ${m.title} (${m.year}, ${m.genre}, ${m.duration || '?'})`).join('\n');

        const prompt = `
        Atue como um crítico de cinema experiente e personalizado.
        Analise a seguinte lista de filmes disponiveis na minha coleção pessoal:
        ${movieList}

        Minhas preferências para hoje:
        - Vibe/Humor: ${preferences.mood === 'any' ? 'Surpreenda-me' : preferences.mood}
        - Duração desejada: ${preferences.duration}
        - Estado: ${preferences.status === 'new' ? 'Quero algo que nunca vi' : preferences.status === 'rewatch' ? 'Quero rever um favorito' : 'Tanto faz'}

        Tarefa:
        Escolha O MELHOR filme desta lista que se encaixe nessas preferências.
        Se nenhum encaixar perfeitamente, escolha o mais próximo (não deixe sem resposta).
        
        Responda APENAS um JSON válido no seguinte formato, sem markdown:
        {
            "movieTitle": "Titulo exato do filme escolhido da lista",
            "reasoning": "Uma frase curta e persuasiva (máximo 20 palavras) explicando por que escolheu este filme para mim hoje."
        }
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from potential markdown
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;

            const data = JSON.parse(jsonStr) as GeminiRecommendation;
            return data;
        } catch (error: any) {
            console.error("Gemini AI Error:", error);
            // Throw so UI can show the message
            throw new Error(error.message || "Erro desconhecido na API");
        }
    }
}

export const geminiService = new GeminiService();
