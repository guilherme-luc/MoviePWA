import React, { useEffect, useState } from 'react';
import { X, Save, Trash2, Search, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { useQueryClient } from '@tanstack/react-query';
import type { Movie } from '../../types';
import { useGenres } from '../../hooks/useGenres';

interface MovieEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    movieToEdit?: Movie;
    initialGenre?: string;
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
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;

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
                // Aggressive compression
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const MovieEditorModal: React.FC<MovieEditorModalProps> = ({ isOpen, onClose, movieToEdit, initialGenre }) => {
    const queryClient = useQueryClient();
    const { data: genres } = useGenres();

    // Form State
    const [formData, setFormData] = useState<Partial<Movie>>({
        title: '',
        year: new Date().getFullYear().toString(),
        genre: initialGenre || '',
        barcode: '',
        posterBase64: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [tmdbLoading, setTmdbLoading] = useState(false);

    // Populate form on edit
    useEffect(() => {
        if (movieToEdit) {
            setFormData(movieToEdit);
        } else {
            setFormData({
                title: '',
                year: new Date().getFullYear().toString(),
                genre: initialGenre || '',
                barcode: '',
                posterBase64: ''
            });
        }
    }, [movieToEdit, isOpen, initialGenre]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("A imagem é muito grande (máx 5MB). Tente uma menor.");
                return;
            }

            try {
                // Use compressor
                const compressedBase64 = await compressImage(file);
                setFormData(prev => ({ ...prev, posterBase64: compressedBase64 }));
            } catch (error) {
                console.error("Error processing image", error);
                alert("Erro ao processar imagem.");
            }
        }
    };

    const fetchTmdbData = async () => {
        if (!formData.title) return;
        setTmdbLoading(true);
        try {
            const API_KEY = '53aaa3549646452243d6cce41a0295da'; // Public key for demo/personal use
            const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(formData.title)}&language=pt-BR`);
            const searchData = await searchRes.json();

            if (searchData.results && searchData.results.length > 0) {
                const movie = searchData.results[0];

                // Get Year
                const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear();

                // Get Poster
                let posterBase64 = formData.posterBase64;
                if (movie.poster_path) {
                    const posterUrl = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
                    try {
                        const imgRes = await fetch(posterUrl);
                        const blob = await imgRes.blob();
                        posterBase64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.warn("Failed to fetch TMDB poster", e);
                    }
                }

                setFormData(prev => ({
                    ...prev,
                    year: year.toString(),
                    // Optional: Auto-fill genre if we could map TMDB genres to ours
                    posterBase64
                }));
            } else {
                alert("Filme não encontrado no TMDB.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao buscar dados online.");
        } finally {
            setTmdbLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.genre) {
            alert("Título e Gênero são obrigatórios.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (movieToEdit) {
                // Determine if we need to move (genre changed)
                if (movieToEdit.genre !== formData.genre) {
                    const movieToMove = {
                        ...formData,
                        _rowIndex: movieToEdit._rowIndex
                    } as Movie;

                    await GoogleSheetsService.getInstance().moveMovie(
                        movieToMove,
                        movieToEdit.genre // oldGenre
                    );
                } else {
                    // Update in place
                    // The service likely expects (oldMovie, newMovie) or just (newMovie) if ID is present.
                    // Based on error: "Expected 1 arguments, but got 2", updateMovie takes (movie).
                    // But we must ensure the new data is merged.
                    const updatedMovie = { ...movieToEdit, ...formData } as Movie;
                    await GoogleSheetsService.getInstance().updateMovie(updatedMovie);
                }
            } else {
                // Add
                await GoogleSheetsService.getInstance().addMovie(formData as Movie);
            }

            // Invalidate queries to refresh lists
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            await queryClient.invalidateQueries({ queryKey: ['all_movies'] });

            onClose();
        } catch (e: any) {
            console.error(e);
            alert(`Erro ao salvar: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!movieToEdit || !confirm("Tem certeza que deseja excluir este filme?")) return;

        setIsDeleting(true);
        try {
            await GoogleSheetsService.getInstance().deleteMovie(movieToEdit);
            await queryClient.invalidateQueries({ queryKey: ['movies'] });
            await queryClient.invalidateQueries({ queryKey: ['genres'] });
            onClose();
        } catch (e: any) {
            alert(`Erro ao excluir: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

                {/* Modal Content */}
                <div className="relative w-full sm:w-[500px] bg-neutral-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-900/50">
                        <h2 className="text-lg font-semibold text-white">
                            {movieToEdit ? 'Editar Filme' : 'Adicionar Filme'}
                        </h2>
                        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <form id="movie-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Title + Search Button */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Título do Filme</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="flex-1 bg-neutral-800 border-none rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-500 hover:bg-neutral-800/80 transition-colors"
                                        placeholder="Ex: Matrix"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={fetchTmdbData}
                                        disabled={tmdbLoading || !formData.title}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                        title="Buscar dados automáticos"
                                    >
                                        {tmdbLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Genre + Year Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-400">Gênero</label>
                                    <div className="relative">
                                        <select
                                            name="genre"
                                            value={formData.genre}
                                            onChange={handleChange}
                                            className="w-full bg-neutral-800 border-none rounded-lg px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            required
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {genres?.filter(g => g.genre !== 'Todos').map(g => (
                                                <option key={g.genre} value={g.genre}>{g.genre}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                                            ▼
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-400">Ano</label>
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        className="w-full bg-neutral-800 border-none rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Barcode (Manual Only) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Código de Barras</label>
                                <input
                                    type="text"
                                    name="barcode"
                                    value={formData.barcode}
                                    onChange={handleChange}
                                    className="w-full bg-neutral-800 border-none rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Digite o código..."
                                />
                            </div>

                            {/* Poster Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Cartaz / Capa</label>
                                <div className="flex gap-4 items-start">
                                    {/* Preview */}
                                    <div className="w-24 h-36 bg-neutral-800 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center shrink-0">
                                        {formData.posterBase64 ? (
                                            <img src={formData.posterBase64} alt="Capa" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="text-neutral-600" size={32} />
                                        )}
                                    </div>

                                    {/* Upload Button */}
                                    <div className="flex-1">
                                        <label className="flex items-center gap-3 w-full bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-lg cursor-pointer transition-colors border border-white/5 group">
                                            <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                                <Upload size={18} />
                                            </div>
                                            <span className="text-sm font-medium">Upload Foto</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                        <p className="text-xs text-neutral-500 mt-2 px-1">
                                            Recomendado: Formato vertical. Máx 5MB.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-3 p-6 border-t border-white/5 bg-neutral-900/50 backdrop-blur-sm">

                        {movieToEdit && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            form="movie-form"
                            disabled={isSubmitting}
                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-medium/bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Salvar Filme</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};
