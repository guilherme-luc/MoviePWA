export interface Movie {
    barcode: string;
    title: string;
    year: string;
    genre: string;
    imageType?: 'tmdb' | 'base64'; // New field
    imageValue?: string;           // New field (poster_path or base64 data)
    // Metadata for internal use
    _rowIndex?: number;    // 1-based index in the sheet
    _sheetTitle?: string; // The sheet this movie belongs to
}

export interface SheetMetadata {
    title: string;
    sheetId: number;
}
