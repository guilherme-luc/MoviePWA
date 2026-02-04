export interface Movie {
    barcode: string;
    title: string;
    year: string;
    genre: string;
    imageType?: 'tmdb' | 'base64';
    imageValue?: string;
    posterBase64?: string; // Standardized UI property for image data

    // NEW Phase 3 Extended Data
    synopsis?: string;
    rating?: string; // Global Rating (TMDB)
    duration?: string; // e.g. "1h 50m"
    director?: string;
    cast?: string; // [NEW] Top cast members
    tmdbId?: string;
    userRating?: string; // [NEW] User's personal rating
    watched?: boolean; // [NEW] Watched status

    // Phase 7
    backdropType?: 'tmdb' | 'base64';
    backdropValue?: string;
    tags?: string[]; // [NEW] Custom tags/lists
    franchise?: string; // [NEW] Phase 7: Franchise/Collection
    soundtrackUrl?: string; // [NEW] Phase 7: Spotify Link
    rottenTomatoesRating?: string; // [NEW] Phase 7: RT Score
    metacriticRating?: string; // [NEW] Phase 7: Metascore
    format?: 'DVD' | 'VHS'; // [NEW] Phase 8: Media Format Support

    // Metadata for internal use
    _rowIndex?: number;
    _sheetTitle?: string;
}

export interface SheetMetadata {
    title: string;
    sheetId: number;
}
