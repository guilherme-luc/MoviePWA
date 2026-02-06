import { useMemo } from 'react';
import type { Movie } from '../types';

export interface GroupedMovie extends Movie {
    groupCount: number;
    instances: Movie[];
}

export const useMovieGrouping = (movies: Movie[] | undefined) => {
    const groupedMovies = useMemo(() => {
        if (!movies) return [];

        const groups = new Map<string, Movie[]>();

        movies.forEach(movie => {
            // Priority 1: TMDB ID
            // Priority 2: Title + Year (normalized)
            let key = '';

            if (movie.tmdbId) {
                key = `tmdb-${movie.tmdbId}`;
            } else {
                const normalizedTitle = movie.title.toLowerCase().trim();
                const year = movie.year || 'unknown';
                key = `legacy-${normalizedTitle}-${year}`;
            }

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(movie);
        });

        // Convert Map to Array of GroupedMovie
        const result: GroupedMovie[] = [];

        groups.forEach((instances) => {
            if (instances.length === 0) return;

            // Use the first instance as the representative for display
            // We could improve this by picking the "best" instance (e.g. one with a poster)
            // But for now, first is fine (usually sorted by date added implicitly)
            const representative = instances[0];

            result.push({
                ...representative,
                groupCount: instances.length,
                instances: instances
            });
        });

        return result;
    }, [movies]);

    return groupedMovies;
};
