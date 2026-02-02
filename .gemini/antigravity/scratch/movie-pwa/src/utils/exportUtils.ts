import { saveAs } from 'file-saver';
import type { Movie } from '../types';

/**
 * Sanitizes a string for CSV format.
 * Escapes quotes and wraps in quotes if it contains commas, newlines, or quotes.
 */
const escapeCSV = (str: string | undefined): string => {
    if (!str) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * Exports the movie collection to a JSON file.
 * This is the preferred format for full backup including all metadata.
 */
export const exportToJSON = (movies: Movie[]) => {
    const data = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        totalMovies: movies.length,
        movies: movies.map(m => {
            // Create a clean copy avoiding internal UI fields if specific ones exist
            // For now, dumping the whole object is safest for a full backup.
            // We might want to exclude strictly internal ephemeral flags if any.
            const { _rowIndex, _sheetTitle, ...cleanMovie } = m;
            return cleanMovie;
        })
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const fileName = `my_movies_backup_${new Date().toISOString().slice(0, 10)}.json`;
    saveAs(blob, fileName);
};

/**
 * Exports the movie collection to a CSV file.
 * Useful for Excel/Analysis.
 */
export const exportToCSV = (movies: Movie[]) => {
    // Define columns
    const headers = [
        "Title",
        "Year",
        "Genre",
        "Director",
        "Rating (TMDB)",
        "User Rating",
        "Duration",
        "Watched",
        "Date Added",
        "Tags",
        "Barcode",
        "Synopsis"
    ];

    const rows = movies.map(m => [
        escapeCSV(m.title),
        escapeCSV(m.year),
        escapeCSV(m.genre),
        escapeCSV(m.director),
        escapeCSV(m.rating),
        escapeCSV(m.userRating),
        escapeCSV(m.duration),
        m.watched ? "Yes" : "No",
        escapeCSV(new Date().toLocaleDateString()), // Placeholder for Date Added if we don't have it explicitly, though we don't track it yet. Actually we don't have date added.
        escapeCSV(m.tags?.join('; ')),
        escapeCSV(m.barcode),
        escapeCSV(m.synopsis)
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const fileName = `my_movies_export_${new Date().toISOString().slice(0, 10)}.csv`;
    saveAs(blob, fileName);
};
