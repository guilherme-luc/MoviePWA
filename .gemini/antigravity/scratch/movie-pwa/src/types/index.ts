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
    rating?: string;   // e.g. "8.5"
    duration?: string; // e.g. "1h 50m"
    director?: string;
    tmdbId?: string;

    // Metadata for internal use
    _rowIndex?: number;
    _sheetTitle?: string;
}

export interface SheetMetadata {
    title: string;
    sheetId: number;
}
