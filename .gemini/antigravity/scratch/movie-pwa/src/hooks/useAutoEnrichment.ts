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
    const PROCESS_DELAY_MS = 1500; // Rate limit protection (TMDB is generous but let's be safe)

    useEffect(() => {
        if (!allMovies || allMovies.length === 0 || isProcessingRef.current) return;

        // Load processed cache
        const processedIds = new Set(JSON.parse(localStorage.getItem('auto_enrich_processed_v3') || '[]'));

        // Identify candidates
        // Candidate = Missing Backdrop OR Missing TMDB Metadata (Synopsis, etc)
        // AND not processed recently
        const candidates = allMovies.filter(m => {
            if (!m.title) return false;

            // Unique ID for cache (Barcode or Title+Year)
            const uid = m.barcode ? m.barcode.trim() : `${m.title.trim()}-${m.year}`;
            if (processedIds.has(uid)) return false;

            // V3: Force re-check for everyone to ensure OMDB ratings are fetched
            return true;
        });

        if (candidates.length === 0) return;

        startProcessing(candidates);

    }, [allMovies?.length]); // Only re-evaluate when count changes significantly

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

            // Mark as processed immediately to avoid restart loops if user refreshes during fetch
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
                    const best = searchData.results[0]; // Best match logic

                    // 1. Prepare Metadata Update (if missing or forcing update)
                    // We check specific fields, but for v2 we basically trust the fetch if we are here

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
                            imageValue: movie.imageValue || best.poster_path || '', // Keep existing if good
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
                if (pendingUpdates.length > 0) {
                    await GoogleSheetsService.getInstance().batchUpdateMetadata(pendingUpdates);
                    pendingUpdates = [];
                }
                if (imageUpdates.length > 0) {
                    await GoogleSheetsService.getInstance().batchUpdateImages(imageUpdates);
                    imageUpdates = [];
                }
                // Invalidate cache to reflect changes in UI incrementally
                await queryClient.invalidateQueries({ queryKey: ['movies'] });
                await queryClient.invalidateQueries({ queryKey: ['all_movies'] });
            }

            setState(prev => ({ ...prev, processedCount: i + 1 }));
            await new Promise(r => setTimeout(r, PROCESS_DELAY_MS));
        }

        setState(prev => ({ ...prev, isSyncing: false, currentMovie: undefined }));
        isProcessingRef.current = false;
    };

    return state;
}
