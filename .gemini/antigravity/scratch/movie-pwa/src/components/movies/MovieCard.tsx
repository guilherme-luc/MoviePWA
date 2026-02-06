import React from 'react';
import type { Movie } from '../../types';
import { Edit2, Star, Eye, CheckSquare } from 'lucide-react';

interface MovieCardProps {
    movie: Movie;
    isSelected: boolean;
    isSelectionMode: boolean;
    isShowcaseMode: boolean;
    onClick: (movie: Movie) => void;
    groupCount?: number; // Added
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, isSelected, isSelectionMode, isShowcaseMode, onClick, groupCount }) => {
    return (
        <div
            className={`
                glass-panel p-3 rounded-xl flex items-center gap-3 justify-between group active:scale-[0.99] transition-all
                ${isSelectionMode ? 'cursor-pointer' : ''}
                ${isSelected ? 'ring-2 ring-primary-500 bg-primary-500/10' : ''}
                h-24 /* Fixed height for consistency */
            `}
            onClick={() => onClick(movie)}
        >
            <div className="flex items-center gap-3 flex-1 h-full">

                {/* Checkbox for Selection - Larger Touch Area */}
                {isSelectionMode && (
                    <div className={`
                        w-8 h-8 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0
                        ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-neutral-600'}
                     `}>
                        {isSelected && <CheckSquare size={16} className="text-white" />}
                    </div>
                )}

                {/* Thumbnail */}
                <div className="w-[3.5rem] h-full bg-neutral-900 flex-shrink-0 border border-white/5 relative aspect-[2/3]">
                    {movie.imageValue ? (
                        <>
                            <img
                                src={movie.imageType === 'tmdb'
                                    ? `https://image.tmdb.org/t/p/w92${movie.imageValue}`
                                    : movie.imageValue}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover rounded-md transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Group Badge - Adjusted Position */}
                            {groupCount && groupCount > 1 && (
                                <div className="absolute -top-2 -right-2 z-10">
                                    <div className="bg-primary-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm border border-white/20 animate-in zoom-in spin-in-12 duration-300">
                                        {groupCount}
                                    </div>
                                    <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-primary-900 rounded-full -z-10 translate-x-0.5 -translate-y-0.5" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-700">
                            <div className="w-4 h-4 bg-white/10 rounded-full" />
                        </div>
                    )}
                </div>

                <div className="overflow-hidden flex flex-col justify-center h-full flex-1">
                    {/* Title - Line clamp 2 and larger line height for readability */}
                    <h3 className={`font-semibold text-sm leading-tight line-clamp-2 transition-colors ${isSelected ? 'text-primary-200' : 'text-neutral-200'}`}>
                        {movie.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded-full">{movie.year}</span>

                        {/* User Rating Badge */}
                        {movie.userRating && (
                            <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Star size={9} fill="currentColor" /> {movie.userRating}
                            </span>
                        )}

                        {/* Watched Badge */}
                        {movie.watched && (
                            <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1" title="Assistido">
                                <Eye size={10} />
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Button - Always visible on mobile, hover on desktop */}
            {!isSelectionMode && !isShowcaseMode && (
                <button
                    className={`
                        p-3 -mr-2 text-neutral-600 transition-colors flex-shrink-0 active:scale-90
                        opacity-100 md:opacity-0 md:group-hover:opacity-100
                        group-hover:text-primary-400
                    `}
                    aria-label="Editar"
                >
                    <Edit2 size={20} />
                </button>
            )}
        </div>
    );
};
