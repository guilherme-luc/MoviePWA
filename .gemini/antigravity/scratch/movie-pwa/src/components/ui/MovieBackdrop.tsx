import React from 'react';

interface MovieBackdropProps {
    type?: 'tmdb' | 'base64';
    value?: string;
    title?: string;
}

export const MovieBackdrop: React.FC<MovieBackdropProps> = ({ type, value, title }) => {
    if (!value) return null;

    const url = type === 'tmdb'
        ? `https://image.tmdb.org/t/p/w1280${value}`
        : value;

    return (
        <div className="relative w-full h-48 sm:h-64 overflow-hidden rounded-t-2xl group">
            <div className="absolute inset-0 bg-neutral-900 animate-pulse" /> {/* Placeholder */}

            <img
                src={url}
                alt={`Backdrop for ${title}`}
                className="w-full h-full object-cover transition-opacity opacity-0 animate-in fade-in duration-700"
                onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
            />

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
        </div>
    );
};
