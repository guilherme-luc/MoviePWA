import { useQuery } from '@tanstack/react-query';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { useCollection } from '../providers/CollectionProvider';

export function useAllMovies() {
    const { format } = useCollection();
    // Default to DVD to prevent crash if format is null (though LandingPage should handle this)
    const effectiveFormat = format || 'DVD';

    return useQuery({
        queryKey: ['all_movies', effectiveFormat],
        queryFn: async () => {
            return await GoogleSheetsService.getInstance().getAllMovies(effectiveFormat);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        enabled: !!format // Only run if format is explicitly selected? Or just run for default?
        // Better to run only if format is selected, to avoid fetching DVD when on Landing.
        // But user might want pre-fetch. 
        // Let's keep it simple: run for effectiveFormat, but if format is null, maybe we shouldn't fetch?
    });
}
