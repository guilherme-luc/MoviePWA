import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';


export function useAllMovies() {
    return useQuery({
        queryKey: ['all_movies'],
        queryFn: async () => {
            const [dvd, vhs] = await Promise.all([
                GoogleSheetsService.getInstance().getAllMovies('DVD'),
                GoogleSheetsService.getInstance().getAllMovies('VHS')
            ]);
            return [...dvd, ...vhs];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
