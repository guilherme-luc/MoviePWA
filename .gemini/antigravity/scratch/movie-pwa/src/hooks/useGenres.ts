import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { useCollection } from '../providers/CollectionProvider';

export interface GenreCount {
    genre: string;
    count: number;
}

export function useGenres() {
    const { format } = useCollection();

    return useQuery({
        queryKey: ['genres', format],
        queryFn: async () => {
            if (!format) return [];
            return await GoogleSheetsService.getInstance().getAllGenreCounts(format);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Avoid hitting rate limits
        enabled: !!format
    });
}
