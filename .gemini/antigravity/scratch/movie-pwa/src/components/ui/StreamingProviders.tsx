import React, { useState, useEffect } from 'react';

interface StreamingProvidersProps {
    tmdbId: string;
}

interface Provider {
    provider_id: number;
    provider_name: string;
    logo_path: string;
}

export const StreamingProviders: React.FC<StreamingProvidersProps> = ({ tmdbId }) => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [link, setLink] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!tmdbId) {
            setProviders([]);
            return;
        }

        const fetchProviders = async () => {
            setIsLoading(true);
            try {
                const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
                if (!apiKey) return;

                const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${apiKey}`);
                const data = await res.json();

                if (data.results && data.results.BR) {
                    setLink(data.results.BR.link);
                    // Prioritize "flatrate" (subscription) -> "ads" (free with ads) -> "rent" (optional?)
                    // For now let's show flatrate (subscription) as it's most relevant
                    const flatrate = data.results.BR.flatrate || [];
                    setProviders(flatrate);
                } else {
                    setProviders([]);
                }
            } catch (error) {
                console.error("Error fetching providers", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProviders();
    }, [tmdbId]);

    if (!providers.length && !isLoading) return null;

    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Onde Assistir (Brasil)</label>
                {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary-400 hover:text-primary-300">
                        Ver tudo no TMDB ↗
                    </a>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {isLoading ? (
                    <div className="text-xs text-neutral-500 italic">Buscando...</div>
                ) : (
                    providers.map(p => (
                        <div key={p.provider_id} className="relative group" title={p.provider_name}>
                            <img
                                src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                                alt={p.provider_name}
                                className="w-8 h-8 rounded-lg shadow-sm cursor-help hover:scale-110 transition-transform"
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
