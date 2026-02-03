/**
 * Generate a unique color for a genre based on its name
 * Uses HSL color space for vibrant, consistent colors
 */
export const getGenreColor = (genreName: string): string => {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < genreName.length; i++) {
        hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to hue (0-360)
    const hue = Math.abs(hash % 360);

    // Return HSL color with good saturation and lightness for dark mode
    return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Get a slightly darker shade for gradient effect
 */
export const getGenreGradient = (genreName: string): string => {
    let hash = 0;
    for (let i = 0; i < genreName.length; i++) {
        hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);

    return `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue}, 70%, 40%))`;
};

/**
 * Get emoji icon for common genres
 */
export const getGenreIcon = (genreName: string): string => {
    const genre = genreName.toLowerCase();

    const iconMap: Record<string, string> = {
        'ação': '💥',
        'acao': '💥',
        'action': '💥',
        'aventura': '🗺️',
        'adventure': '🗺️',
        'comédia': '😂',
        'comedia': '😂',
        'comedy': '😂',
        'drama': '🎭',
        'terror': '👻',
        'horror': '👻',
        'ficção': '🚀',
        'ficcao': '🚀',
        'sci-fi': '🚀',
        'romance': '💕',
        'animação': '🎨',
        'animacao': '🎨',
        'animation': '🎨',
        'documentário': '📽️',
        'documentario': '📽️',
        'documentary': '📽️',
        'suspense': '🔍',
        'thriller': '🔍',
        'fantasia': '🧙',
        'fantasy': '🧙',
        'musical': '🎵',
        'crime': '🕵️',
        'guerra': '⚔️',
        'war': '⚔️',
        'western': '🤠',
        'família': '👨‍👩‍👧‍👦',
        'familia': '👨‍👩‍👧‍👦',
        'family': '👨‍👩‍👧‍👦',
    };

    // Check for exact match or partial match
    for (const [key, icon] of Object.entries(iconMap)) {
        if (genre.includes(key)) {
            return icon;
        }
    }

    // Default icon
    return '🎬';
};
