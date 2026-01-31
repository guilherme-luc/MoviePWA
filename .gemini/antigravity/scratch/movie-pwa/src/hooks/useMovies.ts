import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';


export function useMovies(genre: string) {
    return useQuery({
        queryKey: ['movies', genre],
        queryFn: async () => {
            if (!genre) return [];
            return await GoogleSheetsService.getInstance().getMoviesByGenre(genre);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!genre,
    });
}
