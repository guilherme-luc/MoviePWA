export interface Movie {
    barcode: string;
    title: string;
    year: string;
    genre: string;
    imageType?: 'tmdb' | 'base64';
    imageValue?: string;
    posterBase64?: string; // Standardized UI property for image data
    // Metadata for internal use
    _rowIndex?: number;
    _sheetTitle?: string;
}

export interface SheetMetadata {
    title: string;
    sheetId: number;
}
