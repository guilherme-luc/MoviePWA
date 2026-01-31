import React, { useEffect, useState } from 'react';
import { X, Save, Trash2, Search, Upload, Image as ImageIcon, Loader2, ScanBarcode } from 'lucide-react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useQueryClient } from '@tanstack/react-query';
import type { Movie } from '../../types';
import { useGenres } from '../../hooks/useGenres';
import { BarcodeScanner } from './BarcodeScanner';

interface MovieEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    movieToEdit?: Movie; // If undefined, we are adding a new movie
    initialGenre?: string; // Pre-select genre if adding from a genre page
}

// Compressor function for Base64 fallback (Robust Retry Version)
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context init failed"));
                    return;
                }

                let width = 300;
                let quality = 0.7;
                let attempts = 0;

                const tryCompress = () => {
                    attempts++;
                    const scaleSize = width / img.width;
                    canvas.width = width;
                    canvas.height = img.height * scaleSize;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Try JPEG for consistent compression
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                    if (compressedDataUrl.length < 48000) {
                        resolve(compressedDataUrl);
                    } else if (attempts < 4) {
                        // Reduce and retry
                        width = Math.floor(width * 0.8); // 20% smaller
                        quality = Math.max(0.3, quality - 0.15); // Lower quality
                        tryCompress();
                    } else {
                        reject(new Error("Imagem muito pesada. Tente uma com menos detalhes ou corte antes."));
                    }
                };

                tryCompress();
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

export const MovieEditorModal: React.FC<MovieEditorModalProps> = ({ isOpen, onClose, movieToEdit, initialGenre }) => {
    const [formData, setFormData] = useState<Partial<Movie>>({
        title: '',
        year: '',
        barcode: '',
        genre: initialGenre || '',
        imageType: undefined,
        imageValue: ''
    });

    const [tmdbLoading, setTmdbLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [showScanner, setShowScanner] = useState(false); // Scanner State

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();
    const { data: genres } = useGenres();

    useEffect(() => {
        if (isOpen) {
            if (movieToEdit) {
                setFormData({ ...movieToEdit });
            } else {
                setFormData({
                    title: '',
                    year: '',
                    barcode: '',
                    genre: initialGenre || '',
                    imageType: undefined,
                    imageValue: ''
                });
            }
            setError('');
            setSearchResults([]);
            setShowResults(false);
            setShowScanner(false);
        }
    }, [isOpen, movieToEdit, initialGenre]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.genre) {
            setError("Title and Genre are required");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            if (!navigator.onLine) throw new Error("Offline. Cannot edit movies.");

            const service = GoogleSheetsService.getInstance();
            const movieData = formData as Movie;

            if (movieToEdit) {
                // Edit Mode
                if (movieData.genre !== movieToEdit.genre) {
                    // Genre Changed -> Move
                    await service.moveMovie(movieData, movieToEdit.genre);
                } else {
                    // Normal Update
                    await service.updateMovie(movieData);
                }
            } else {
                // Add Mode
                await service.addMovie(movieData);
            }

            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['genres'] }); // Counts change

            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to save movie.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!movieToEdit || !window.confirm("Are you sure you want to delete this movie?")) return;

        setIsSubmitting(true);
        try {
            if (!navigator.onLine) throw new Error("Offline.");
            await GoogleSheetsService.getInstance().deleteMovie(movieToEdit);
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            onClose();
        } catch (e: any) {
            setError(e.message || "Failed to delete.");
            setIsSubmitting(false);
        }
    };

    const autoFetchCover = async (title: string, year?: string) => {
        // Only run if we don't have an image yet and we have a title
        if ((formData.imageValue && formData.imageValue.length > 0) || !title) return;

        const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
        if (!apiKey) return; // Silent fail if no key

        try {
            const query = encodeURIComponent(title);
            const yearParam = year ? `&year=${year}` : '';
            const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}${yearParam}&language=pt-BR&include_adult=false`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                // Sort by popularity and pick first
                const best = data.results.sort((a: any, b: any) => b.popularity - a.popularity)[0];
                if (best && best.poster_path) {
                    setFormData(prev => ({
                        ...prev,
                        imageType: 'tmdb',
                        imageValue: best.poster_path
                    }));
                }
            }
        } catch (e) {
            console.error("Auto fetch failed (silent)", e);
        }
    };

    const handleTitleBlur = () => {
        if (!formData.title) return; // Can't fetch without title

        if (!movieToEdit) {
            autoFetchCover(formData.title, formData.year);
        } else if (!formData.imageValue) {
            autoFetchCover(formData.title, formData.year);
        }
    };

    const handleSearchCover = async () => {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('tmdb_api_key');
        if (!apiKey) {
            setError("Configure sua API Key nas configurações (engrenagem na home).");
            return;
        }
        if (!formData.title) {
            setError("Digite o título do filme primeiro.");
            return;
        }

        setTmdbLoading(true);
        setError('');
        setShowResults(true);

        try {
            const query = encodeURIComponent(formData.title);
            const yearParam = formData.year ? `&year=${formData.year}` : '';
            const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}${yearParam}&language=pt-BR&include_adult=false`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.results) {
                // Sort by popularity to avoid bad matches
                const sorted = data.results.sort((a: any, b: any) => b.popularity - a.popularity).slice(0, 5);
                setSearchResults(sorted);
            }
        } catch (e) {
            console.error(e);
            setError("Erro ao buscar no TMDB.");
        } finally {
            setTmdbLoading(false);
        }
    };

    const handleSelectPoster = (posterPath: string) => {
        setFormData({ ...formData, imageType: 'tmdb', imageValue: posterPath });
        setShowResults(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressed = await compressImage(file);
            setFormData({ ...formData, imageType: 'base64', imageValue: compressed });
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleScanSuccess = (code: string) => {
        setFormData(prev => ({ ...prev, barcode: code }));
        setShowScanner(false);
    };

    return (
        <>
            {showScanner && (
                <BarcodeScanner
                    onScan={handleScanSuccess}
                    onClose={() => setShowScanner(false)}
                />
            )}

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">

                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-semibold text-white">{movieToEdit ? 'Editar Filme' : 'Adicionar Filme'}</h3>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">

                        {/* Image Section */}
                        <div className="flex gap-4">
                            {/* Preview */}
                            <div className="w-24 h-36 bg-neutral-900 rounded-lg flex-shrink-0 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                {formData.imageValue ? (
                                    <>
                                        <img
                                            src={formData.imageType === 'tmdb'
                                                ? `https://image.tmdb.org/t/p/w154${formData.imageValue}`
                                                : formData.imageValue}
                                            alt="Capa"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, imageType: undefined, imageValue: '' })}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                        >
                                            <X />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="text-neutral-700" size={32} />
                                )}
                            </div>

                            {/* Image Actions */}
                            <div className="flex flex-col gap-2 flex-1 justify-center">
                                <button
                                    type="button"
                                    onClick={handleSearchCover}
                                    className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Search size={16} />
                                    Buscar Capa (TMDB)
                                </button>

                                <label className="bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors text-center justify-center">
                                    <Upload size={16} />
                                    Upload Foto
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>

                        {/* Search Results Dropdown */}
                        {showResults && (
                            <div className="bg-neutral-900 rounded-xl border border-white/10 p-2 max-h-48 overflow-y-auto grid grid-cols-4 gap-2">
                                {tmdbLoading && <div className="col-span-full py-4 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}
                                {!tmdbLoading && searchResults.length === 0 && <p className="col-span-full text-center text-neutral-500 text-xs py-2">Sem resultados</p>}

                                {searchResults.map((movie: any) => (
                                    <button
                                        key={movie.id}
                                        type="button"
                                        onClick={() => handleSelectPoster(movie.poster_path)}
                                        className="aspect-[2/3] relative rounded-lg overflow-hidden hover:ring-2 ring-indigo-500 transition-all"
                                    >
                                        {movie.poster_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                                alt={movie.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                                <span className="text-[10px] text-neutral-500 p-1 text-center">{movie.title}</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 w-full bg-black/80 text-[10px] text-white p-1 truncate">
                                            {movie.release_date?.slice(0, 4)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="h-px bg-white/5 mx-2"></div>

                        {/* Barcode & Year Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">CÓDIGO DE BARRAS</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                        placeholder="Escaneie ou digite..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowScanner(true)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-indigo-400 transition-colors"
                                        title="Escanear Código de Barras"
                                    >
                                        <ScanBarcode size={18} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">ANO</label>
                                <input
                                    type="text"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="ex: 1999"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">TÍTULO</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                onBlur={handleTitleBlur}
                                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-semibold placeholder:font-normal"
                                placeholder="Nome do Filme"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">GÊNERO</label>
                            <select
                                value={formData.genre}
                                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                required
                            >
                                <option value="" disabled>Selecione o Gênero</option>
                                {genres?.map(g => (
                                    <option key={g.genre} value={g.genre}>{g.genre}</option>
                                ))}
                            </select>
                        </div>

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <div className="flex justify-between pt-4 mt-2 border-t border-white/5">
                            {movieToEdit ? (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="text-red-400 hover:text-red-300 font-medium flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-red-400/10 transition-colors"
                                >
                                    <Trash2 size={18} />
                                    <span>Delete</span>
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-neutral-400 font-medium hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                                >
                                    {isSubmitting ? 'Salvando...' : (
                                        <>
                                            <span>Salvar Filme</span>
                                            <Save size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                </div>
            </div>
        </>
    );
};
