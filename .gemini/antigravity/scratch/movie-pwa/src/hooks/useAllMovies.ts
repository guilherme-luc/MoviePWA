import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

export function useAllMovies() {
    return useQuery({
        queryKey: ['all_movies'],
        queryFn: async () => {
            return await GoogleSheetsService.getInstance().getAllMovies();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
