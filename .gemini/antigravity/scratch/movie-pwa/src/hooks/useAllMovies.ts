import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { useCollection } from '../providers/CollectionProvider';

export function useAllMovies() {
    const { format } = useCollection();

    return useQuery({
        queryKey: ['all_movies', format],
        queryFn: async () => {
            if (!format) return [];
            return await GoogleSheetsService.getInstance().getAllMovies(format);
        },
        enabled: !!format,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
