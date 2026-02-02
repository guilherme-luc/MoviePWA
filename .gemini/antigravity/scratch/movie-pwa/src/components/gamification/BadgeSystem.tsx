import React, { useMemo } from 'react';
import { Award, Film, Star, Clapperboard, Video, Trophy, Flame, Eye } from 'lucide-react';
import type { Movie } from '../../types';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    condition: (movies: Movie[]) => boolean;
}

const BADGES: Badge[] = [
    {
        id: 'beginner_collector',
        name: 'Colecionador Iniciante',
        description: 'Adicionou 10 filmes à coleção.',
        icon: Film,
        color: 'text-blue-400',
        condition: (movies) => movies.length >= 10
    },
    {
        id: 'dedicated_collector',
        name: 'Colecionador Dedicado',
        description: 'Adicionou 50 filmes à coleção.',
        icon: Clapperboard,
        color: 'text-primary-400',
        condition: (movies) => movies.length >= 50
    },
    {
        id: 'master_collector',
        name: 'Mestre do Cinema',
        description: 'Adicionou 100 filmes à coleção.',
        icon: Trophy,
        color: 'text-yellow-400',
        condition: (movies) => movies.length >= 100
    },
    {
        id: 'critic',
        name: 'Crítico de Cinema',
        description: 'Avaliou 5 filmes com nota pessoal.',
        icon: Star,
        color: 'text-purple-400',
        condition: (movies) => movies.filter(m => m.userRating).length >= 5
    },
    {
        id: 'expert_critic',
        name: 'Crítico Especialista',
        description: 'Avaliou 20 filmes com nota pessoal.',
        icon: Award,
        color: 'text-pink-400',
        condition: (movies) => movies.filter(m => m.userRating).length >= 20
    },
    {
        id: 'binge_watcher',
        name: 'Maratonista',
        description: 'Marcou 10 filmes como assistidos.',
        icon: Eye,
        color: 'text-green-400',
        condition: (movies) => movies.filter(m => m.watched).length >= 10
    },
    {
        id: 'cinephile',
        name: 'Cinéfilo Supremo',
        description: 'Marcou 50 filmes como assistidos.',
        icon: Flame,
        color: 'text-red-400',
        condition: (movies) => movies.filter(m => m.watched).length >= 50
    },
    {
        id: 'streaming_fan',
        name: 'Gêneros Variados',
        description: 'Tem filmes em pelo menos 5 gêneros diferentes.',
        icon: Video,
        color: 'text-cyan-400',
        condition: (movies) => {
            const genres = new Set(movies.map(m => m.genre));
            return genres.size >= 5;
        }
    }
];

interface BadgeSystemProps {
    movies: Movie[];
}

export const BadgeSystem: React.FC<BadgeSystemProps> = ({ movies }) => {
    const unlockedBadges = useMemo(() => {
        return BADGES.filter(badge => badge.condition(movies));
    }, [movies]);

    const lockedBadges = useMemo(() => {
        return BADGES.filter(badge => !badge.condition(movies));
    }, [movies]);

    // Calculate progress for next badge?? (Maybe later)

    if (unlockedBadges.length === 0 && lockedBadges.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    Conquistas ({unlockedBadges.length}/{BADGES.length})
                </h3>
            </div>

            {/* Unlocked */}
            {unlockedBadges.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {unlockedBadges.map(badge => (
                        <div key={badge.id} className="relative group bg-gradient-to-br from-neutral-800 to-neutral-800/50 border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center text-center gap-2 overflow-hidden">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className={`p-3 rounded-full bg-neutral-900 border border-white/5 ${badge.color}shadow-lg`}>
                                <badge.icon size={24} className={badge.color} />
                            </div>
                            <div>
                                <div className="font-bold text-white text-xs sm:text-sm">{badge.name}</div>
                                <div className="text-[10px] text-neutral-400 leading-tight mt-1">{badge.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Locked Preview (Grayscale) */}
            {lockedBadges.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Ainda Bloqueados</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {lockedBadges.map(badge => (
                            <div key={badge.id} className="bg-neutral-900/50 border border-white/5 rounded-xl p-4 flex flex-col items-center text-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-75 transition-all">
                                <div className="p-3 rounded-full bg-neutral-950">
                                    <badge.icon size={24} className="text-neutral-600" />
                                </div>
                                <div>
                                    <div className="font-bold text-neutral-400 text-xs sm:text-sm">{badge.name}</div>
                                    <div className="text-[10px] text-neutral-600 leading-tight mt-1">{badge.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
