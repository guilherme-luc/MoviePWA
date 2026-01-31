import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

export interface GenreCount {
    genre: string;
    count: number;
}

export function useGenres() {
    return useQuery({
        queryKey: ['genres'],
        queryFn: async () => {
            return await GoogleSheetsService.getInstance().getAllGenreCounts();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
}
