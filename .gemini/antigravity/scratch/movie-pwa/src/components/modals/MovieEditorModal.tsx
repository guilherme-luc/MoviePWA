import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Search, Wand2, Star, Lock, Unlock, Upload, ImageIcon, Loader2, Trash2, Play, Music, Share2, Link2, Download } from 'lucide-react';
import type { Movie } from '../../types';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';

import { ShareModal } from './ShareModal';

import { TrailerModal } from './TrailerModal';
import { TagInput } from '../ui/TagInput';
import { StreamingProviders } from '../ui/StreamingProviders';
import { useQueryClient } from '@tanstack/react-query';
import { triggerConfetti, triggerSmallConfetti } from '../../utils/confetti';
import { useShowcase } from '../../providers/ShowcaseProvider';

interface MovieEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    movieToEdit?: Movie;
    initialGenre?: string;
    initialFormat?: 'DVD' | 'VHS';
    onSearch?: (term: string) => void;
}

// Compressor function for Base64 fallback
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Aggressive compression for Google Sheets (Target < 50k chars)
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const MovieEditorModal: React.FC<MovieEditorModalProps> = ({ isOpen, onClose, movieToEdit, initialGenre, initialFormat, onSearch }) => {
    const { isShowcaseMode } = useShowcase();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [genres, setGenres] = useState<string[]>([]);
    // Trailer State
    const [trailerId, setTrailerId] = useState<string | null>(null);
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);
    const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

    // Link Import State
    const [isLinkMode, setIsLinkMode] = useState(false);
    const [linkInput, setLinkInput] = useState('');

    // Share Modal
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Form State
    const [barcode, setBarcode] = useState('');
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [genre, setGenre] = useState(initialGenre || '');
    const [format, setFormat] = useState<'DVD' | 'VHS'>(initialFormat || 'DVD');

    // Metadata (Read-Onlyish)
    const [synopsis, setSynopsis] = useState('');
    const [rating, setRating] = useState('');
    const [duration, setDuration] = useState('');
    const [director, setDirector] = useState('');
    const [cast, setCast] = useState('');
    const [tmdbId, setTmdbId] = useState('');

    // User Data (Editable)
    const [userRating, setUserRating] = useState('');
    const [watched, setWatched] = useState(false);

    // Images
    const [imageType, setImageType] = useState<'tmdb' | 'base64'>('tmdb');
    const [imageValue, setImageValue] = useState('');

    // Backdrops (Phase 7)
    const [backdropType, setBackdropType] = useState<'tmdb' | 'base64'>('tmdb');
    const [backdropValue, setBackdropValue] = useState('');

    const [tags, setTags] = useState<string[]>([]);
    const [franchise, setFranchise] = useState(''); // [NEW] Phase 7
    const [soundtrackUrl, setSoundtrackUrl] = useState(''); // [NEW] Phase 7
    const [rottenTomatoesRating, setRottenTomatoesRating] = useState(''); // [NEW] Phase 7
    const [metacriticRating, setMetacriticRating] = useState(''); // [NEW] Phase 7



    const [isSearching, setIsSearching] = useState(false);

    // Manual Override for Metadata
    const [isMetadataLocked, setIsMetadataLocked] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadGenres();
            if (movieToEdit) {
                setBarcode(movieToEdit.barcode);
                setTitle(movieToEdit.title);
                setYear(movieToEdit.year);
                setGenre(movieToEdit.genre);
                setFormat(movieToEdit.format || 'DVD'); // Load format
                setSynopsis(movieToEdit.synopsis || '');
                setRating(movieToEdit.rating || '');
                setDuration(movieToEdit.duration || '');
                setDirector(movieToEdit.director || '');
                setTmdbId(movieToEdit.tmdbId || '');
                setCast(movieToEdit.cast || '');
                setUserRating(String(movieToEdit.userRating || '')); // NUMBER -> STRING
                setWatched(movieToEdit.watched || false);
                setImageType(movieToEdit.imageType || 'tmdb');
                setImageValue(movieToEdit.imageValue || '');
                setBackdropType(movieToEdit.backdropType || 'tmdb');
                setBackdropValue(movieToEdit.backdropValue || '');
                setTags(movieToEdit.tags || []);
                // New Fields Phase 7
                setFranchise(movieToEdit.franchise || '');
                setSoundtrackUrl(movieToEdit.soundtrackUrl || '');
                setRottenTomatoesRating(movieToEdit.rottenTomatoesRating || '');
                setMetacriticRating(movieToEdit.metacriticRating || '');

                // Lock metadata if it looks like it came from TMDB
                setIsMetadataLocked(!!movieToEdit.tmdbId || !!movieToEdit.synopsis);
            } else {
                resetForm();
            }
        }
    }, [isOpen, movieToEdit, initialGenre, initialFormat]);

    useEffect(() => {
        loadGenres();
    }, [format]); // Reload genres if format changes

    useEffect(() => {
        if (isOpen && !movieToEdit && initialGenre) {
            setGenre(initialGenre);
        }
    }, [isOpen, movieToEdit, initialGenre]);

    const loadGenres = async () => {
        const g = await GoogleSheetsService.getInstance().getGenres(format);
        setGenres(g);
    };

    const resetForm = () => {
        setBarcode('');
        setTitle('');
        setYear('');
        setGenre(initialGenre || '');
        setFormat(initialFormat || 'DVD'); // Ensure this uses the prop
        setSynopsis('');
        setRating('');
        setDuration('');
        setDirector('');
        setCast('');
        setTmdbId('');
        setUserRating('');
        setWatched(false);
        setImageType('tmdb');
        setImageValue('');
        setBackdropType('tmdb');
        setBackdropValue('');
        setTags([]);
        setFranchise('');
        setSoundtrackUrl('');
        setRottenTomatoesRating('');
        setMetacriticRating('');
        setIsMetadataLocked(false);
        setTrailerId(null);
    };
    const handleRatingChange = (val: string) => {
        setUserRating(val);
        const num = parseFloat(val);
        if (num >= 9) {
            triggerConfetti();
        }
    };

    // TMDB Search Results
    const [tmdbResults, setTmdbResults] = useState<any[]>([]);

    // const handlePlayTrailer = () => { ... } // Removed duplicate

    // Ref to prevent re-search loops when selecting a movie
    const isSelectionRef = useRef(false);

    // Real-time Search Effect
    useEffect(() => {
        // Don't search if link mode, showcase mode, title is empty/short
        if (isLinkMode || isShowcaseMode || !title || title.length < 3) {
            if (!title) setTmdbResults([]);
            return;
        }

        // Feedback #5: Don't auto-search if we are editing and the title hasn't changed (Robust check)
        if (movieToEdit) {
            const currentTitle = title.trim().toLowerCase();
            const originalTitle = (movieToEdit.title || '').trim().toLowerCase();
            if (currentTitle === originalTitle) return;
        }

        // If this change was caused by a user selection, ignore it
        if (isSelectionRef.current) {
            isSelectionRef.current = false;
            return;
        }

        // 200ms debounce for "instant" feel but avoiding complete API spam
        const timer = setTimeout(() => {
            fetchTmdbData(title);
        }, 200);

        return () => clearTimeout(timer);
    }, [title, isLinkMode, isShowcaseMode, movieToEdit]);

    const importFromLink = async () => {
        if (!linkInput) return;

        const cleanInput = linkInput.trim();
        // Regex to find ID:
        // 1. Matches "movie/12345" (URL path)
        // 2. Matches digits at start/end (Raw ID)
        const idMatch = cleanInput.match(/(?:movie\/|^)(\d+)/) || cleanInput.match(/\/(\d+)(?:-|$)/);
        const id = idMatch ? idMatch[1] : (cleanInput.match(/^\d+$/) ? cleanInput : null);

        if (!id || isNaN(Number(id))) {
            alert(`Não consegui identificar o ID do filme no link: "${cleanInput}". \nTente colar apenas o número ID (ex: 550).`);
            return;
        }

        setIsSearching(true);
        try {
            const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
            if (apiKey) {
                // Enrich will fetch most data
                await enrichMovieData(id, apiKey);

                // Manually fetch details to ensure Title/Year are set if enrich didn't cover it
                const detailsUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=pt-BR`;
                const detailsRes = await fetch(detailsUrl);
                const details = await detailsRes.json();

                if (details.title) setTitle(details.title);
                if (details.release_date) setYear(details.release_date.substring(0, 4));
                setTmdbId(details.id.toString());

                // Try to set genre if not set
                if (details.genres && details.genres.length > 0) {
                    const firstGenre = details.genres[0].name;
                    // Direct set if match
                    setGenre(firstGenre);
                }

                setIsLinkMode(false);
                setLinkInput('');
            }
        } catch (e) {
            console.error("Import Error", e);
            alert("Erro ao importar do TMDB");
        } finally {
            setIsSearching(false);
        }
    };

    const fetchTmdbData = async (queryTitle: string) => {
        if (!queryTitle) return;
        setIsSearching(true);
        try {
            const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
            if (!apiKey) return;

            // 1. Smart Parse: Check for Year in query (e.g., "Matrix 1999")
            const yearMatch = queryTitle.match(/\b(19|20)\d{2}\b/);
            const extractedYear = yearMatch ? yearMatch[0] : null;
            const cleanTitle = extractedYear ? queryTitle.replace(extractedYear, '').trim() : queryTitle;

            let results: any[] = [];

            if (extractedYear) {
                // Strategy A: Specific Year Search (Movie + TV)
                // We run parallel searches for better accuracy when year is provided
                const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&year=${extractedYear}&language=pt-BR&include_adult=false`;
                const tvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&first_air_date_year=${extractedYear}&language=pt-BR&include_adult=false`;

                const [resMovie, resTv] = await Promise.all([fetch(movieUrl), fetch(tvUrl)]);
                const [dataMovie, dataTv] = await Promise.all([resMovie.json(), resTv.json()]);

                const movies = dataMovie.results || [];
                const tvs = dataTv.results || [];

                // Combine and tag
                results = [
                    ...movies.map((m: any) => ({ ...m, media_type: 'movie' })),
                    ...tvs.map((t: any) => ({ ...t, media_type: 'tv' }))
                ];

            } else {
                // Strategy B: General Multi Search (Default)
                const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(queryTitle)}&language=pt-BR&include_adult=false`;
                const res = await fetch(searchUrl);
                const data = await res.json();

                if (data.results) {
                    // Logic: If result is a PERSON, extract their "known_for" movies
                    const people = data.results.filter((r: any) => r.media_type === 'person');
                    const media = data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');

                    let knownForResults: any[] = [];
                    if (people.length > 0) {
                        people.forEach((p: any) => {
                            if (p.known_for) {
                                // Add person's name to the movie to show context
                                const credits = p.known_for.map((k: any) => ({
                                    ...k,
                                    smart_context: `Via ${p.name}` // Custom tag for UI
                                }));
                                knownForResults = [...knownForResults, ...credits];
                            }
                        });
                    }

                    results = [...media, ...knownForResults];
                }
            }

            // Deduplicate by ID
            const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

            // Filter out garbage (no title/poster sometimes)
            const validResults = uniqueResults.filter(r => (r.title || r.name));

            setTmdbResults(validResults.slice(0, 7)); // Increased limit slightly
        } catch (error) {
            console.error("TMDB Fetch Error", error);
        } finally {
            setIsSearching(false);
        }
    };

    const enrichMovieData = async (id: string, apiKey: string, type: 'movie' | 'tv' = 'movie') => {
        try {
            console.log("🚀 Enriching Data for ID:", id);

            const endpoint = type === 'movie' ? 'movie' : 'tv';
            const detailsUrl = `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits,release_dates`;

            const detailsRes = await fetch(detailsUrl);
            const details = await detailsRes.json();

            // Update Metadata from Details
            setSynopsis(details.overview || '');
            setRating(details.vote_average ? details.vote_average.toFixed(1) : '');

            if (details.poster_path) {
                setImageType('tmdb');
                setImageValue(details.poster_path);
            }
            if (details.backdrop_path) {
                setBackdropType('tmdb');
                setBackdropValue(details.backdrop_path);
            }

            // Credits
            if (details.credits?.cast) {
                const topCast = details.credits.cast.slice(0, 5).map((c: any) => c.name).join(', ');
                setCast(topCast);
            }

            // Runtime
            const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0]);
            if (runtime) {
                const hours = Math.floor(runtime / 60);
                const minutes = runtime % 60;
                setDuration(`${hours}h ${minutes}m`);
            } else {
                setDuration('');
            }

            // Director
            if (type === 'movie' && details.credits?.crew) {
                const director = details.credits.crew.find((c: any) => c.job === 'Director');
                if (director) setDirector(director.name);
            } else if (type === 'tv' && details.created_by && details.created_by.length > 0) {
                setDirector(details.created_by.map((c: any) => c.name).join(', '));
            } else {
                setDirector('');
            }

        } catch (error) {
            console.error("Enrichment Failed", error);
        }
    };


    const selectTmdbMovie = async (movie: any) => {
        // Signal validation to ignore the next title change (prevent re-search)
        isSelectionRef.current = true;
        setTmdbResults([]);

        try {
            const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');

            // Normalize fields
            const titleVal = movie.title || movie.name;
            const dateVal = movie.release_date || movie.first_air_date;

            setTitle(titleVal);
            setYear(dateVal ? dateVal.substring(0, 4) : '');
            setTmdbId(movie.id.toString());
            setSynopsis(movie.overview);

            // Trigger full enrichment with correct type
            const type = movie.media_type || 'movie';
            await enrichMovieData(movie.id.toString(), apiKey!, type);

        } catch (error) {
            console.error("Selection Error", error);
        }
    };

    const handleRefreshData = async () => {
        if (!tmdbId) return;
        setIsLoading(true);
        const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
        if (apiKey) {
            await enrichMovieData(tmdbId, apiKey);
            alert("Dados atualizados! (Sinopse, Elenco, Notas...)");
        }
        setIsLoading(false);
    };

    const handlePlayTrailer = async () => {
        if (!tmdbId) {
            alert("Este filme não tem vínculo com o TMDB para buscar o trailer. Tente buscar a capa novamente.");
            return;
        }

        setIsLoadingTrailer(true);
        try {
            const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
            const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${apiKey}&language=pt-BR`);
            const data = await res.json();

            // Try Portuguese first, then English
            let trailer = data.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');

            if (!trailer) {
                const resEn = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${apiKey}&language=en-US`);
                const dataEn = await resEn.json();
                trailer = dataEn.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
            }

            if (trailer) {
                setTrailerId(trailer.key);
                setIsTrailerOpen(true);
            } else {
                alert("Nenhum trailer encontrado para este filme.");
            }

        } catch (error) {
            console.error("Error fetching trailer", error);
            alert("Erro ao buscar trailer.");
        } finally {
            setIsLoadingTrailer(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("A imagem é muito grande (máx 5MB). Tente uma menor.");
                return;
            }
            try {
                const compressedBase64 = await compressImage(file);
                setImageType('base64');
                setImageValue(compressedBase64);
            } catch (error) {
                console.error("Error processing image", error);
                alert("Erro ao processar imagem.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !genre) {
            alert("Título e Gênero são obrigatórios");
            return;
        }
        setIsLoading(true);

        const movieData: Movie = {
            barcode,
            title,
            year,
            genre,
            format, // Save Format
            imageType,
            imageValue,
            backdropType,
            backdropValue,
            synopsis,
            rating,
            duration,
            director,
            cast,
            // Fix #3: If title OR year changed manually but ID wasn't updated,
            // clear the ID to ensure it ungroups (treat as new movie).
            tmdbId: (movieToEdit && (title !== movieToEdit.title || year !== movieToEdit.year) && tmdbId === movieToEdit.tmdbId) ? '' : tmdbId,
            userRating,


            watched,
            tags,
            franchise,
            soundtrackUrl,
            rottenTomatoesRating,
            metacriticRating,


            // Pass through internal props if editing
            _rowIndex: movieToEdit?._rowIndex,
            _sheetTitle: movieToEdit?._sheetTitle
        };

        try {
            if (movieToEdit) {
                // If genre changed, use moveMovie logic
                if (movieToEdit.genre !== genre) {
                    await GoogleSheetsService.getInstance().moveMovie(movieData, movieToEdit.genre, format);
                } else {
                    await GoogleSheetsService.getInstance().updateMovie(movieData, format);
                }
            } else {
                await GoogleSheetsService.getInstance().addMovie(movieData, format);
            }
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            await queryClient.invalidateQueries({ queryKey: ['all_movies'] });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar filme.");
        } finally {
            setIsLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Backdrop Header */}
                <div className="relative">
                    {backdropValue && (
                        <div className="absolute inset-0 h-48 sm:h-64 z-0">
                            <div className="w-full h-full relative">
                                <img
                                    src={backdropType === 'tmdb' ? `https://image.tmdb.org/t/p/w1280${backdropValue}` : backdropValue}
                                    alt=""
                                    className="w-full h-full object-cover opacity-50 mask-image-gradient"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-transparent" />
                            </div>
                        </div>
                    )}

                    {/* Header Content */}
                    <div className="relative z-10 p-6 flex justify-between items-center transition-colors rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white drop-shadow-md">
                            {movieToEdit ? 'Editar Filme' : 'Adicionar Filme'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsShareOpen(true)}
                                className="p-2 text-primary-400 hover:bg-primary-500/10 rounded-full transition-colors bg-black/20 backdrop-blur-md"
                                title="Compartilhar Card"
                            >
                                <Share2 size={20} />
                            </button>

                            {/* Refresh Data Button */}
                            {!isShowcaseMode && tmdbId && (
                                <button
                                    type="button"
                                    onClick={handleRefreshData}
                                    className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-full transition-colors bg-black/20 backdrop-blur-md"
                                    title="Atualizar Dados (TMDB/OMDB)"
                                >
                                    <Wand2 size={20} />
                                </button>
                            )}


                            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors bg-black/20 backdrop-blur-md">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10">
                    <form id="movie-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Top Section: Poster + Main Info */}
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Poster Preview */}
                            <div className="w-32 sm:w-40 flex-shrink-0 mx-auto sm:mx-0">
                                <div className="aspect-[2/3] bg-neutral-800 rounded-lg overflow-hidden border border-white/5 relative group cursor-pointer shadow-lg shadow-black/50">
                                    {imageValue ? (
                                        <img
                                            src={imageType === 'tmdb' ? `https://image.tmdb.org/t/p/w342${imageValue}` : imageValue}
                                            alt="Capa"
                                            className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
                                            onClick={() => {
                                                const url = prompt("Cole a URL da imagem:", imageValue);
                                                if (url) { setImageValue(url); setImageType(url.includes('tmdb') ? 'tmdb' : 'base64'); }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                                            <ImageIcon size={24} />
                                            <span className="text-xs text-center px-2">Sem Capa</span>
                                        </div>
                                    )}

                                    {/* Upload Overlay */}
                                    {!isShowcaseMode && (
                                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                                            <Upload size={24} className="mb-2" />
                                            <span className="text-xs font-medium">Alterar Foto</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    )}

                                    {!isShowcaseMode && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {/* Remove Photo */}
                                            {imageValue && (
                                                <div className="p-1 bg-black/50 rounded-full cursor-pointer hover:bg-red-500/80 transition-colors"
                                                    title="Remover Capa"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Remover a capa atual?")) {
                                                            setImageValue('');
                                                            setImageType('tmdb');
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={12} className="text-white" />
                                                </div>
                                            )}
                                            {/* Magic Wand */}
                                            <div className="p-1 bg-black/50 rounded-full cursor-pointer hover:bg-primary-500/80 transition-colors"
                                                title="Buscar imagem via URL ou TMDB"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const url = prompt("Cole a URL da imagem TMDB:");
                                                    if (url) {
                                                        setImageValue(url);
                                                        setImageType('tmdb');
                                                    }
                                                }}
                                            >
                                                <Wand2 size={12} className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Main Inputs */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 sm:col-span-2 relative">
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="text-xs font-medium text-neutral-400">Título</label>
                                        {/* Trailer Button */}
                                        {tmdbId && (
                                            <button
                                                type="button"
                                                onClick={handlePlayTrailer}
                                                disabled={isLoadingTrailer}
                                                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                                            >
                                                {isLoadingTrailer ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                                Ver Trailer
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {isLinkMode ? (
                                            /* LINK IMPORT MODE */
                                            <>
                                                <input
                                                    type="text"
                                                    value={linkInput}
                                                    onChange={(e) => setLinkInput(e.target.value)}
                                                    className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 placeholder:text-neutral-500"
                                                    placeholder="Cole o link TMDB ou ID..."
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && importFromLink()}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={importFromLink}
                                                    className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
                                                    title="Confirmar Importação"
                                                >
                                                    <Download size={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLinkMode(false)}
                                                    className="p-2 bg-neutral-700/50 text-neutral-400 rounded-lg hover:bg-neutral-700 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </>
                                        ) : (
                                            /* STANDARD SEARCH MODE */
                                            <>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    onBlur={() => {
                                                        // Don't auto-fetch on blur anymore to avoid annoying behavior
                                                        // let user click search manually
                                                    }}
                                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isShowcaseMode ? 'cursor-default' : ''}`}
                                                    placeholder="Nome do Filme"
                                                    required
                                                    readOnly={isShowcaseMode}
                                                />
                                                {!isShowcaseMode && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => fetchTmdbData(title)}
                                                            disabled={isSearching}
                                                            className="p-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors"
                                                            title="Buscar por Título"
                                                        >
                                                            {isSearching ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Search size={20} />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsLinkMode(true);
                                                                setLinkInput('');
                                                            }}
                                                            className="p-2 bg-neutral-700/50 text-neutral-400 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors"
                                                            title="Importar por Link TMDB"
                                                        >
                                                            <Link2 size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Result Picker */}
                                    {tmdbResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <div className="p-2 text-xs font-bold text-neutral-400 border-b border-white/5 bg-black/20">Selecione o filme correto:</div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {tmdbResults.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => selectTmdbMovie(m)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                                                    >
                                                        <div className="w-8 h-12 bg-black/40 rounded flex-shrink-0">
                                                            {m.poster_path && (
                                                                <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="w-full h-full object-cover rounded" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm flex items-center gap-2">
                                                                {m.title || m.name}
                                                                {m.media_type === 'tv' && <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] uppercase">TV</span>}
                                                            </div>
                                                            <div className="text-xs text-neutral-400 flex flex-wrap gap-2 items-center">
                                                                <span>{(m.release_date || m.first_air_date)?.substring(0, 4)}</span>
                                                                <span>•</span>
                                                                <span>⭐ {m.vote_average?.toFixed(1)}</span>
                                                                {m.smart_context && (
                                                                    <span className="text-primary-400 bg-primary-500/10 px-1 rounded border border-primary-500/20 text-[10px]">
                                                                        {m.smart_context}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setTmdbResults([])}
                                                className="w-full p-2 text-xs text-center text-neutral-400 hover:text-neutral-300 hover:bg-white/5 transition-colors"
                                            >
                                                Fechar / Nenhum destes
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-400">Ano</label>
                                    <input
                                        type="text"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isShowcaseMode ? 'cursor-default' : ''}`}
                                        placeholder="Ex: 2024"
                                        maxLength={4}
                                        readOnly={isShowcaseMode}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-400">Gênero</label>
                                    <select
                                        value={genre}
                                        onChange={(e) => setGenre(e.target.value)}
                                        className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isShowcaseMode ? 'cursor-default appearance-none pointer-events-none' : ''}`}
                                        required
                                        disabled={isShowcaseMode}
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {initialGenre && !genres.includes(initialGenre) && (
                                            <option value={initialGenre}>{initialGenre}</option>
                                        )}
                                        {genres.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-medium text-neutral-400">Código de Barras</label>
                                    <input
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-neutral-300 font-mono text-sm focus:ring-2 focus:ring-primary-500"
                                        placeholder="Escanear ou digitar..."
                                        readOnly={isShowcaseMode}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 my-6" />

                        {/* User Data Section */}
                        <div className="bg-primary-500/5 p-4 rounded-xl border border-primary-500/10 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-primary-400 font-bold text-sm uppercase tracking-wider">Meus Dados</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* User Rating */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-400">Minha Nota (0-10)</label>
                                    <div className="relative">
                                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" size={16} fill="currentColor" />
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.5"
                                            value={userRating}
                                            onChange={(e) => handleRatingChange(e.target.value)}
                                            className="w-full bg-neutral-800 border-none rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary-500 font-bold"
                                            placeholder="-"
                                            readOnly={isShowcaseMode}
                                        />
                                    </div>
                                </div>

                                {/* Watched Toggle */}
                                <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-white/5">
                                    <span className="text-sm font-medium text-white">Já assisti?</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isShowcaseMode) return;
                                            const newVal = !watched;
                                            setWatched(newVal);
                                            if (newVal) triggerSmallConfetti();
                                        }}
                                        className={`
                                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900
                                                ${watched ? 'bg-primary-600' : 'bg-neutral-600'}
                                                ${isShowcaseMode ? 'cursor-default opacity-80' : ''}
                                            `}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${watched ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    {isShowcaseMode && <div className="absolute inset-0 z-10 cursor-default" />}
                                </div>
                            </div>

                            {/* Tags Input */}
                            <div className="mt-4 space-y-1">
                                <label className="text-xs font-medium text-neutral-400">Listas & Tags</label>
                                <TagInput
                                    tags={tags}
                                    onChange={setTags}
                                />
                            </div>
                        </div>

                        {/* Metadata Section (Read Only-ish) */}
                        <div className="space-y-4 opacity-100">
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                    Dados do TMDB
                                    {isMetadataLocked && <Lock size={12} />}
                                </span>
                            </div>
                            {!isShowcaseMode && (
                                <button
                                    type="button"
                                    onClick={() => setIsMetadataLocked(!isMetadataLocked)}
                                    className="text-xs text-neutral-600 hover:text-neutral-400 flex items-center gap-1"
                                >
                                    {isMetadataLocked ? 'Desbloquear edição' : 'Bloquear edição'}
                                    {isMetadataLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-400">Nota Global (TMDB)</label>
                                <input
                                    type="text"
                                    value={rating}
                                    onChange={(e) => setRating(e.target.value)} // Safe fallback if unlocked
                                    readOnly={isMetadataLocked || isShowcaseMode}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-400">Duração</label>
                                <input
                                    type="text"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    readOnly={isMetadataLocked || isShowcaseMode}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs font-medium text-neutral-400">Diretor</label>
                                <input
                                    type="text"
                                    value={director}
                                    onChange={(e) => setDirector(e.target.value)}
                                    readOnly={isMetadataLocked || isShowcaseMode}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                                />
                                {director && onSearch && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => onSearch(director)}
                                            className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] rounded-full hover:bg-neutral-700 hover:text-white transition-colors"
                                        >
                                            🔍 {director}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Critics Ratings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                                    <span>🍅</span> Rotten Tomatoes
                                </label>
                                <input
                                    type="text"
                                    value={rottenTomatoesRating}
                                    onChange={(e) => setRottenTomatoesRating(e.target.value)}
                                    readOnly={isMetadataLocked || isShowcaseMode}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                                    placeholder="Ex: 95%"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                                    <span className="grayscale brightness-150">Ⓜ️</span> Metacritic
                                </label>
                                <input
                                    type="text"
                                    value={metacriticRating}
                                    onChange={(e) => setMetacriticRating(e.target.value)}
                                    readOnly={isMetadataLocked || isShowcaseMode}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                                    placeholder="Ex: 88"
                                />
                            </div>
                        </div>


                        <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-400">Elenco Principal</label>
                            <input
                                type="text"
                                value={cast}
                                onChange={(e) => setCast(e.target.value)}
                                readOnly={isMetadataLocked || isShowcaseMode}
                                className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                            />
                            {cast && onSearch && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {cast.split(',').map((c, i) => {
                                        const name = c.trim();
                                        if (!name) return null;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => onSearch(name)}
                                                className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] rounded-full hover:bg-neutral-700 hover:text-white transition-colors"
                                            >
                                                🔍 {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-400">Sinopse</label>
                            <textarea
                                rows={4}
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                readOnly={isMetadataLocked || isShowcaseMode}
                                className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 resize-none ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                            />
                        </div>

                        {franchise && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-400">Franquia / Coleção</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={franchise}
                                        onChange={(e) => setFranchise(e.target.value)}
                                        readOnly={isMetadataLocked || isShowcaseMode}
                                        className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 ${isMetadataLocked || isShowcaseMode ? 'text-neutral-400 cursor-not-allowed' : ''}`}
                                    />
                                    {onSearch && (
                                        <button
                                            type="button"
                                            onClick={() => onSearch(franchise)}
                                            className="p-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors whitespace-nowrap text-xs font-bold"
                                        >
                                            Ver Coleção
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}




                        {/* Soundtrack (Spotify) */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                                <Music size={12} />
                                Trilha Sonora (Spotify)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={soundtrackUrl}
                                    onChange={(e) => setSoundtrackUrl(e.target.value)}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 placeholder-neutral-600 ${isShowcaseMode ? 'cursor-default opacity-50' : ''}`}
                                    placeholder="Link do Álbum/Playlist..."
                                    readOnly={isShowcaseMode}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.open(`https://open.spotify.com/search/${encodeURIComponent(title + " Soundtrack")}`, '_blank');
                                    }}
                                    className="p-2 bg-[#1DB954]/20 text-[#1DB954] rounded-lg hover:bg-[#1DB954]/30 transition-colors whitespace-nowrap"
                                    title="Buscar no Spotify"
                                >
                                    <Search size={20} />
                                </button>
                            </div>
                            {soundtrackUrl && (
                                <a
                                    href={soundtrackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs text-[#1DB954] hover:underline mt-1"
                                >
                                    <Music size={12} />
                                    Abrir no Spotify
                                </a>
                            )}
                        </div>

                        {/* Streaming Providers */}
                        {tmdbId && (
                            <div className="pt-2 border-t border-white/5">
                                <StreamingProviders tmdbId={tmdbId} />
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-neutral-900 rounded-b-2xl flex items-center justify-between gap-3">
                    {movieToEdit && !isShowcaseMode ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este filme permanentemente?")) {
                                    setIsLoading(true);
                                    GoogleSheetsService.getInstance().deleteMovie(movieToEdit, format)
                                        .then(() => {
                                            queryClient.invalidateQueries({ queryKey: ['movies'] });
                                            queryClient.invalidateQueries({ queryKey: ['all_movies'] });
                                            onClose();
                                        })
                                        .catch((err) => {
                                            console.error(err);
                                            alert("Erro ao excluir.");
                                            setIsLoading(false);
                                        });
                                }
                            }}
                            className="px-3 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-medium flex items-center gap-2"
                        >
                            <Trash2 size={20} />
                            <span className="hidden sm:inline whitespace-nowrap">Excluir</span>
                        </button>
                    ) : <div />} {/* Spacer if no delete button */}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm whitespace-nowrap"
                        >
                            {isShowcaseMode ? 'Fechar' : 'Cancelar'}
                        </button>
                        {!isShowcaseMode && (
                            <button
                                form="movie-form"
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Salvar
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>



            {isTrailerOpen && trailerId && (
                <TrailerModal
                    isOpen={isTrailerOpen}
                    onClose={() => setIsTrailerOpen(false)}
                    videoId={trailerId}
                />
            )}

            {isShareOpen && (
                <ShareModal
                    isOpen={isShareOpen}
                    onClose={() => setIsShareOpen(false)}
                    movie={{
                        barcode, title, year, genre, imageType, imageValue, backdropType, backdropValue, synopsis, rating, duration, director, cast, tmdbId, userRating, watched, tags, franchise, soundtrackUrl, rottenTomatoesRating, metacriticRating
                    } as Movie}
                />
            )}
        </div>
    );
};
