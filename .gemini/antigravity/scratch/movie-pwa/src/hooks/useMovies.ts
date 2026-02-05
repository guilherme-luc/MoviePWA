import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { useCollection } from '../providers/CollectionProvider';

export function useMovies(genre: string) {
    const { format } = useCollection();
    const effectiveFormat = format || 'DVD';

    return useQuery({
        queryKey: ['movies', genre, effectiveFormat],
        queryFn: async () => {
            // Service doesn't have getMoviesByGenre anymore, fetch all and filter
            const all = await GoogleSheetsService.getInstance().getAllMovies(effectiveFormat);
            const decodedGenre = decodeURIComponent(genre);
            // Filter by genre
            return all.filter(m => m.genre === decodedGenre);
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!genre && !!format
    });
}
