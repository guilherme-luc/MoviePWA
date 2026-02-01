import React, { useState, useEffect } from 'react';
import { X, Save, Search, ScanLine, Wand2, Star, Lock, Unlock, Upload, ImageIcon, Loader2, Trash2 } from 'lucide-react';
import type { Movie } from '../../types';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { BarcodeScanner } from './BarcodeScanner';
import { useQueryClient } from '@tanstack/react-query';

interface MovieEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    movieToEdit?: Movie;
    initialGenre?: string;
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

export const MovieEditorModal: React.FC<MovieEditorModalProps> = ({ isOpen, onClose, movieToEdit, initialGenre }) => {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [genres, setGenres] = useState<string[]>([]);

    // Form State
    const [barcode, setBarcode] = useState('');
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [genre, setGenre] = useState(initialGenre || '');

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

    const [isScannerOpen, setIsScannerOpen] = useState(false);
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
                setImageType(movieToEdit.imageType || 'tmdb');
                setImageValue(movieToEdit.imageValue || '');

                // Metadata
                setSynopsis(movieToEdit.synopsis || '');
                setRating(movieToEdit.rating || '');
                setDuration(movieToEdit.duration || '');
                setDirector(movieToEdit.director || '');
                setCast(movieToEdit.cast || '');
                setTmdbId(movieToEdit.tmdbId || '');

                // User Data
                setUserRating(movieToEdit.userRating || '');
                setWatched(movieToEdit.watched || false);

                // Lock metadata if it looks like it came from TMDB
                setIsMetadataLocked(!!movieToEdit.tmdbId || !!movieToEdit.synopsis);
            } else {
                resetForm();
                if (initialGenre) setGenre(initialGenre);
                setIsMetadataLocked(false); // New movie starts unlocked
            }
        }
    }, [isOpen, movieToEdit, initialGenre]);

    const loadGenres = async () => {
        const g = await GoogleSheetsService.getInstance().getGenres();
        setGenres(g);
    };

    const resetForm = () => {
        setBarcode('');
        setTitle('');
        setYear('');
        setGenre(initialGenre || '');
        setImageType('tmdb');
        setImageValue('');
        setSynopsis('');
        setRating('');
        setDuration('');
        setDirector('');
        setCast('');
        setTmdbId('');
        setUserRating('');
        setWatched(false);
        setIsMetadataLocked(false);
    };

    // TMDB Search Results
    const [tmdbResults, setTmdbResults] = useState<any[]>([]);

    const fetchTmdbData = async (queryTitle: string, queryYear?: string) => {
        if (!queryTitle) return;
        setIsSearching(true);
        setTmdbResults([]); // Clear previous
        try {
            const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
            if (!apiKey) {
                console.warn("API Key do TMDB não configurada.");
                return;
            }

            const query = encodeURIComponent(queryTitle);
            const yearParam = queryYear ? `&year=${queryYear}` : '';
            const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}${yearParam}&language=pt-BR&include_adult=false`;

            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                // Store results for user selection instead of auto-picking
                setTmdbResults(data.results.slice(0, 5)); // Show top 5
            } else {
                alert("Nenhum filme encontrado no TMDB.");
            }
        } catch (error) {
            console.error("TMDB Fetch Error", error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectTmdbMovie = async (movie: any) => {
        setTmdbResults([]); // Clear list
        try {
            const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');

            // Update Basic Info
            setTitle(movie.title);
            setYear(movie.release_date ? movie.release_date.substring(0, 4) : '');

            // Update Metadata
            setTmdbId(movie.id.toString());
            setSynopsis(movie.overview);
            setRating(movie.vote_average ? movie.vote_average.toFixed(1) : '');

            if (movie.poster_path) {
                setImageType('tmdb');
                setImageValue(movie.poster_path);
            }

            // Fetch Details
            const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`;
            const detailsRes = await fetch(detailsUrl);
            const details = await detailsRes.json();

            if (details.runtime) {
                const h = Math.floor(details.runtime / 60);
                const m = details.runtime % 60;
                setDuration(`${h}h ${m}m`);
            }

            if (details.credits) {
                const director = details.credits.crew?.find((c: any) => c.job === 'Director')?.name;
                if (director) setDirector(director);

                const topCast = details.credits.cast?.slice(0, 4).map((c: any) => c.name).join(', ');
                if (topCast) setCast(topCast);
            }

            setIsMetadataLocked(true);
        } catch (error) {
            console.error("Error fetching details", error);
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
            imageType,
            imageValue,
            synopsis,
            rating,
            duration,
            director,
            cast,
            tmdbId,
            userRating,
            watched,

            // Pass through internal props if editing
            _rowIndex: movieToEdit?._rowIndex,
            _sheetTitle: movieToEdit?._sheetTitle
        };

        try {
            if (movieToEdit) {
                // If genre changed, use moveMovie logic
                if (movieToEdit.genre !== genre) {
                    await GoogleSheetsService.getInstance().moveMovie(movieData, movieToEdit.genre);
                } else {
                    await GoogleSheetsService.getInstance().updateMovie(movieData);
                }
            } else {
                await GoogleSheetsService.getInstance().addMovie(movieData);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-white">
                        {movieToEdit ? 'Editar Filme' : 'Adicionar Filme'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors"
                            title="Escanear Código de Barras"
                        >
                            <ScanLine size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="movie-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Top Section: Poster + Main Info */}
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Poster Preview */}
                            <div className="w-32 sm:w-40 flex-shrink-0 mx-auto sm:mx-0">
                                <div className="aspect-[2/3] bg-neutral-800 rounded-lg overflow-hidden border border-white/5 relative group cursor-pointer shadow-lg">
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

                                    <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-full cursor-pointer hover:bg-black/70"
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
                            </div>

                            {/* Main Inputs */}
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1 sm:col-span-2 relative">
                                        <label className="text-xs font-medium text-neutral-400">Título</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                onBlur={() => {
                                                    // Don't auto-fetch on blur anymore to avoid annoying behavior
                                                    // let user click search manually
                                                }}
                                                className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Nome do Filme"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fetchTmdbData(title, year)}
                                                disabled={isSearching}
                                                className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors"
                                            >
                                                {isSearching ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Search size={20} />}
                                            </button>
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
                                                                <div className="font-bold text-white text-sm">{m.title}</div>
                                                                <div className="text-xs text-neutral-400">{m.release_date?.substring(0, 4)} • ⭐ {m.vote_average?.toFixed(1)}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setTmdbResults([])}
                                                    className="w-full p-2 text-xs text-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors"
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
                                            className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ex: 2024"
                                            maxLength={4}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-neutral-400">Gênero</label>
                                        <select
                                            value={genre}
                                            onChange={(e) => setGenre(e.target.value)}
                                            className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                                            required
                                        >
                                            <option value="" disabled>Selecione...</option>
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
                                            className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-neutral-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Escanear ou digitar..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 my-6" />

                        {/* User Data Section */}
                        <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-indigo-400 font-bold text-sm uppercase tracking-wider">Meus Dados</span>
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
                                            onChange={(e) => setUserRating(e.target.value)}
                                            className="w-full bg-neutral-800 border-none rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 font-bold"
                                            placeholder="-"
                                        />
                                    </div>
                                </div>

                                {/* Watched Toggle */}
                                <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-white/5">
                                    <span className="text-sm font-medium text-white">Já assisti?</span>
                                    <button
                                        type="button"
                                        onClick={() => setWatched(!watched)}
                                        className={`
                                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900
                                            ${watched ? 'bg-indigo-600' : 'bg-neutral-600'}
                                        `}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${watched ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Metadata Section (Read Only-ish) */}
                        <div className="space-y-4 opacity-100">
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-500 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                    Dados do TMDB
                                    {isMetadataLocked && <Lock size={12} />}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsMetadataLocked(!isMetadataLocked)}
                                    className="text-xs text-neutral-600 hover:text-neutral-400 flex items-center gap-1"
                                >
                                    {isMetadataLocked ? 'Desbloquear edição' : 'Bloquear edição'}
                                    {isMetadataLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-500">Nota Global (TMDB)</label>
                                    <input
                                        type="text"
                                        value={rating}
                                        onChange={(e) => setRating(e.target.value)} // Safe fallback if unlocked
                                        readOnly={isMetadataLocked}
                                        className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 ${isMetadataLocked ? 'text-neutral-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-500">Duração</label>
                                    <input
                                        type="text"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        readOnly={isMetadataLocked}
                                        className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 ${isMetadataLocked ? 'text-neutral-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-medium text-neutral-500">Diretor</label>
                                    <input
                                        type="text"
                                        value={director}
                                        onChange={(e) => setDirector(e.target.value)}
                                        readOnly={isMetadataLocked}
                                        className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 ${isMetadataLocked ? 'text-neutral-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-500">Elenco Principal</label>
                                <input
                                    type="text"
                                    value={cast}
                                    onChange={(e) => setCast(e.target.value)}
                                    readOnly={isMetadataLocked}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 ${isMetadataLocked ? 'text-neutral-500 cursor-not-allowed' : ''}`}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-500">Sinopse</label>
                                <textarea
                                    rows={4}
                                    value={synopsis}
                                    onChange={(e) => setSynopsis(e.target.value)}
                                    readOnly={isMetadataLocked}
                                    className={`w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 resize-none ${isMetadataLocked ? 'text-neutral-500 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-neutral-900 rounded-b-2xl flex justify-between gap-3">
                    {movieToEdit ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este filme permanentemente?")) {
                                    setIsLoading(true);
                                    GoogleSheetsService.getInstance().deleteMovie(movieToEdit)
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
                            className="px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-medium flex items-center gap-2"
                        >
                            <Trash2 size={20} />
                            <span className="hidden sm:inline">Excluir</span>
                        </button>
                    ) : <div />} {/* Spacer if no delete button */}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            form="movie-form"
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Salvar Filme
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>

            {/* Barcode Scanner Overlay */}
            <BarcodeScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onDetected={(code) => {
                    setBarcode(code);
                    setIsScannerOpen(false);
                }}
            />
        </div>
    );
};
