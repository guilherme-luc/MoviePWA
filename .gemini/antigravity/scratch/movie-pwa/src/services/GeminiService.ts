import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Movie } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check if the service is available (Key exists)
export const isGeminiAvailable = () => {
    return !!API_KEY && API_KEY.length > 10;
};

interface UserPreferences {
    mood: string;
    subMood?: string; // e.g., 'slapstick', 'romance_cliche'
    duration: string; // 'short', 'medium', 'long', 'any'
    status: string; // 'new', 'rewatch', 'any'
}

interface GeminiRecommendation {
    movieId: string;
    movieTitle: string;
    reasoning: string;
}

export class GeminiService {
    private genAI: GoogleGenerativeAI | undefined;
    // List of models to try in order of preference (Updated based on API availability)
    private readonly models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];

    constructor() {
        if (API_KEY) {
            this.genAI = new GoogleGenerativeAI(API_KEY);
        }
    }

    async getRecommendation(candidates: Movie[], preferences: UserPreferences): Promise<GeminiRecommendation | null> {
        if (!this.genAI || candidates.length === 0) return null;

        // Simplify movie list to save tokens/complexity, but keep IDs for reliable matching
        const movieList = candidates.map(m => `- [ID: ${m.barcode}] ${m.title} (${m.year}, ${m.genre}, ${m.duration || '?'})`).join('\n');

        const prompt = `
        Atue como um crítico de cinema experiente e personalizado.
        Analise a seguinte lista de filmes disponiveis na minha coleção pessoal:
        ${movieList}

        Minhas preferências para hoje:
        - Vibe Principal: ${preferences.mood === 'any' ? 'Surpreenda-me' : preferences.mood}
        ${preferences.subMood && preferences.subMood !== 'any' ? `- Estilo Específico (Foco total nisso): ${preferences.subMood}` : ''}
        - Duração desejada: ${preferences.duration}
        - Estado: ${preferences.status === 'new' ? 'Quero algo que nunca vi' : preferences.status === 'rewatch' ? 'Quero rever um favorito' : 'Tanto faz'}

        Tarefa:
        Escolha O MELHOR filme desta lista que se encaixe nessas preferências.
        Se nenhum encaixar perfeitamente, escolha o mais próximo (não deixe sem resposta).
        
        Responda APENAS um JSON válido no seguinte formato, sem markdown:
        {
            "movieId": "123456", // O ID (código de barras) EXATO do filme escolhido da lista acima (String)
            "movieTitle": "Titulo do filme",
            "reasoning": "Uma frase curta e persuasiva (máximo 20 palavras) explicando por que escolheu este filme para mim hoje."
        }
        `;

        let lastError: any;

        // Try models sequentially until one works
        for (const modelName of this.models) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Extract JSON from potential markdown
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : text;

                const data = JSON.parse(jsonStr) as GeminiRecommendation;
                return data; // Success!

            } catch (error: any) {
                console.warn(`Gemini Model '${modelName}' failed:`, error.message);
                lastError = error;
                // If 404, valid key but wrong model. If 400, maybe key issue?
            }
        }

        // If all failed, try to list what IS available to help debug
        await this.logAvailableModels();

        // If all failed
        console.error("All Gemini models failed. Last error:", lastError);
        throw new Error(lastError?.message || "Falha em todos os modelos de IA disponíveis.");
    }

    private async logAvailableModels() {
        if (!API_KEY) return;
        try {
            console.log("🔍 Tentando listar modelos disponíveis para esta Chave...");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
            const data = await response.json();
            console.log("📋 MODELOS DISPONÍVEIS NA API:", data);
            if (data.error) {
                console.error("Erro ao listar modelos:", data.error);
            }
        } catch (e) {
            console.error("Falha ao conectar com endpoint de listagem", e);
        }
    }
}

export const geminiService = new GeminiService();
