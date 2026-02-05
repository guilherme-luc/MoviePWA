import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { useCollection } from '../providers/CollectionProvider';

export function useMovies(genre: string) {
    const { format } = useCollection();

    return useQuery({
        queryKey: ['movies', genre, format],
        queryFn: async () => {
            if (!genre || !format) return [];
            // Temporary: Fetch all and filter. Optimization: Restore getMoviesByGenre in Service.
            const all = await GoogleSheetsService.getInstance().getAllMovies(format);
            return all.filter(m => m.genre === genre);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!genre && !!format,
    });
}
