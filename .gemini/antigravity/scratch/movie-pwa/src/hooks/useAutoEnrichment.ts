import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAllMovies } from './useAllMovies';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import type { Movie } from '../types';

interface AutoEnrichmentState {
    isSyncing: boolean;
    totalToProcess: number;
    processedCount: number;
    errorsCount: number;
    currentMovie?: string;
}

export function useAutoEnrichment() {
    const { data: allMovies } = useAllMovies();
    const queryClient = useQueryClient();
    const [state, setState] = useState<AutoEnrichmentState>({
        isSyncing: false,
        totalToProcess: 0,
        processedCount: 0,
        errorsCount: 0
    });

    const isProcessingRef = useRef(false);
    const BATCH_SIZE = 5;
    const PROCESS_DELAY_MS = 1500; // Rate limit protection

    useEffect(() => {
        if (!allMovies || allMovies.length === 0 || isProcessingRef.current) return;

        // Load processed cache
        const processedIds = new Set(JSON.parse(localStorage.getItem('auto_enrich_processed_v3') || '[]'));

        // Identify candidates
        const candidates = allMovies.filter(m => {
            if (!m.title) return false;
            // Unique ID for cache
            const uid = m.barcode ? m.barcode.trim() : `${m.title.trim()}-${m.year}`;
            if (processedIds.has(uid)) return false;
            return true;
        });

        if (candidates.length === 0) return;

        startProcessing(candidates);

    }, [allMovies?.length]);


    const flushBatches = async (
        metaUpdates: { movie: Movie, data: Partial<Movie> }[],
        imgUpdates: { movie: Movie, imageType: 'tmdb', imageValue: string, backdropType: 'tmdb', backdropValue: string }[]
    ) => {
        // Group by format
        const processMeta = async (updates: typeof metaUpdates) => {
            const dvd = updates.filter(u => u.movie.format === 'DVD' || !u.movie.format);
            const vhs = updates.filter(u => u.movie.format === 'VHS');

            if (dvd.length) await GoogleSheetsService.getInstance().batchUpdateMetadata(dvd, 'DVD');
            if (vhs.length) await GoogleSheetsService.getInstance().batchUpdateMetadata(vhs, 'VHS');
        };

        const processImg = async (updates: typeof imgUpdates) => {
            const dvd = updates.filter(u => u.movie.format === 'DVD' || !u.movie.format);
            const vhs = updates.filter(u => u.movie.format === 'VHS');

            if (dvd.length) await GoogleSheetsService.getInstance().batchUpdateImages(dvd, 'DVD');
            if (vhs.length) await GoogleSheetsService.getInstance().batchUpdateImages(vhs, 'VHS');
        };

        await Promise.all([processMeta(metaUpdates), processImg(imgUpdates)]);

        if (metaUpdates.length > 0 || imgUpdates.length > 0) {
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['all_movies'] });
        }
    };


    const startProcessing = async (queue: Movie[]) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
        if (!apiKey) {
            console.warn("Auto-Enrichment paused: No API Key.");
            isProcessingRef.current = false;
            return;
        }

        setState({
            isSyncing: true,
            totalToProcess: queue.length,
            processedCount: 0,
            errorsCount: 0
        });

        let pendingUpdates: { movie: Movie, data: Partial<Movie> }[] = [];
        let imageUpdates: { movie: Movie, imageType: 'tmdb', imageValue: string, backdropType: 'tmdb', backdropValue: string }[] = [];

        // Load cache to append
        const processedCache = new Set(JSON.parse(localStorage.getItem('auto_enrich_processed_v3') || '[]'));

        for (let i = 0; i < queue.length; i++) {
            const movie = queue[i];
            const uid = movie.barcode || `${movie.title}-${movie.year}`;

            // Mark as processed immediately
            processedCache.add(uid);
            localStorage.setItem('auto_enrich_processed_v3', JSON.stringify(Array.from(processedCache)));

            setState(prev => ({ ...prev, currentMovie: movie.title }));

            try {
                // Fetch TMDB Data
                const query = encodeURIComponent(movie.title);
                const yearParam = movie.year ? `&year=${movie.year}` : '';
                const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}${yearParam}&language=pt-BR`;

                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();

                if (searchData.results && searchData.results.length > 0) {
                    const best = searchData.results[0];

                    const detailsUrl = `https://api.themoviedb.org/3/movie/${best.id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`;
                    const detailsRes = await fetch(detailsUrl);
                    const details = await detailsRes.json();

                    const director = details.credits?.crew?.find((c: any) => c.job === 'Director')?.name;
                    const cast = details.credits?.cast?.slice(0, 4).map((c: any) => c.name).join(', ');

                    let durationFormatted = '';
                    if (details.runtime) {
                        const h = Math.floor(details.runtime / 60);
                        const m = details.runtime % 60;
                        durationFormatted = `${h}h ${m}m`;
                    }

                    let rt = '';
                    let mc = '';

                    // OMDB Fetch
                    if (details.imdb_id) {
                        const omdbKey = import.meta.env.VITE_OMDB_API_KEY || localStorage.getItem('omdb_api_key');
                        if (omdbKey) {
                            try {
                                const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbKey}&i=${details.imdb_id}`;
                                const omdbRes = await fetch(omdbUrl);
                                const omdbData = await omdbRes.json();
                                if (omdbData.Ratings) {
                                    rt = omdbData.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes')?.Value || '';
                                    mc = omdbData.Ratings.find((r: any) => r.Source === 'Metacritic')?.Value || '';
                                }
                            } catch (e) { console.error("OMDB Auto-Enrich Error", e); }
                        }
                    }

                    pendingUpdates.push({
                        movie,
                        data: {
                            tmdbId: String(best.id),
                            synopsis: best.overview || '',
                            rating: best.vote_average ? best.vote_average.toFixed(1) : '',
                            director: director || '',
                            cast: cast || '',
                            duration: durationFormatted || '',
                            rottenTomatoesRating: rt,
                            metacriticRating: mc
                        }
                    });

                    // 2. Prepare Image Update (if missing backdrop or poster)
                    if (!movie.backdropValue || !movie.imageValue) {
                        imageUpdates.push({
                            movie,
                            imageType: 'tmdb',
                            imageValue: movie.imageValue || best.poster_path || '',
                            backdropType: 'tmdb',
                            backdropValue: movie.backdropValue || best.backdrop_path || ''
                        });
                    }
                }

            } catch (error) {
                console.error(`Auto-Enrich failed for ${movie.title}`, error);
                setState(prev => ({ ...prev, errorsCount: prev.errorsCount + 1 }));
            }

            // Sync batches
            if (pendingUpdates.length >= BATCH_SIZE || imageUpdates.length >= BATCH_SIZE || i === queue.length - 1) {
                await flushBatches(pendingUpdates, imageUpdates);
                pendingUpdates = [];
                imageUpdates = [];
            }

            setState(prev => ({ ...prev, processedCount: i + 1 }));
            await new Promise(r => setTimeout(r, PROCESS_DELAY_MS));
        }

        // Final Flush (just in case, mostly covered by loop)
        await flushBatches(pendingUpdates, imageUpdates);

        setState(prev => ({ ...prev, isSyncing: false, currentMovie: undefined }));
        isProcessingRef.current = false;
    };

    return state;
}
