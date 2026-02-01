import { gapi } from 'gapi-script';
import type { Movie } from '../types';

export class GoogleSheetsService {
    private static instance: GoogleSheetsService;
    private isInitialized = false;

    // These should be configured via environment variables
    private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    private readonly API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
    private readonly SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '';

    private readonly SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
    private readonly DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];

    // GIS Token Client
    private tokenClient: any;
    private accessToken: string | null = null;
    private authStateListeners: ((isSignedIn: boolean) => void)[] = [];

    private constructor() { }

    public static getInstance(): GoogleSheetsService {
        if (!GoogleSheetsService.instance) {
            GoogleSheetsService.instance = new GoogleSheetsService();
        }
        return GoogleSheetsService.instance;
    }

    /**
     * Initialize the Google API Client & GIS Token Client.
     */
    public async initClient(): Promise<void> {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            // 1. Load GAPI (for Sheets API)
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: this.API_KEY,
                        discoveryDocs: this.DISCOVERY_DOCS,
                    });

                    // 2. Initialize GIS Token Client (for Auth)
                    // @ts-ignore
                    if (typeof google !== 'undefined' && google.accounts) {
                        // @ts-ignore
                        this.tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: this.CLIENT_ID,
                            scope: this.SCOPES + ' email profile',
                            callback: (response: any) => this.handleAuthCallback(response),
                        });
                    } else {
                        console.error("Google Identity Services script not loaded");
                    }

                    // 3. Attempt to restore token from localStorage
                    const stored = localStorage.getItem('google_access_token');
                    if (stored) {
                        try {
                            const { token, expiresAt } = JSON.parse(stored);
                            if (Date.now() < expiresAt) {
                                // Restore session
                                this.accessToken = token;
                                gapi.client.setToken({ access_token: token });
                                console.log("Session restored from storage");
                            } else {
                                localStorage.removeItem('google_access_token'); // Expired
                            }
                        } catch (e) {
                            localStorage.removeItem('google_access_token'); // Invalid
                        }
                    }

                    this.isInitialized = true;
                    resolve();
                } catch (error) {
                    console.error("Error initializing Google Sheets API", error);
                    reject(error);
                }
            });
        });
    }

    private handleAuthCallback(response: any) {
        if (response.error !== undefined) {
            throw (response);
        }
        this.accessToken = response.access_token;

        // Persist token
        const expiresIn = response.expires_in || 3599; // Default 1 hour
        const expiresAt = Date.now() + (expiresIn * 1000);
        localStorage.setItem('google_access_token', JSON.stringify({
            token: response.access_token,
            expiresAt
        }));

        // Bind the token to gapi
        // @ts-ignore
        gapi.client.setToken(response);
        this.notifyListeners(true);
    }

    public get isSignedIn(): boolean {
        return !!this.accessToken;
    }

    public async signIn(): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (this.tokenClient) {
            // Request a new token
            // prompt: 'consent' forces a refresh token or account selection if needed
            this.tokenClient.requestAccessToken({ prompt: '' });
        } else {
            console.error("Token Client not initialized");
        }
    }

    public async signOut(): Promise<void> {
        if (!this.isInitialized) return;
        const token = gapi.client.getToken();
        if (token !== null) {
            // @ts-ignore
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken(null);
                this.accessToken = null;
                localStorage.removeItem('google_access_token');
                this.notifyListeners(false);
            });
        }
    }

    public onAuthStateChanged(callback: (isSignedIn: boolean) => void): void {
        this.authStateListeners.push(callback);
        // Immediate callback with current state
        if (this.isInitialized) {
            callback(this.isSignedIn);
        }
    }

    private notifyListeners(isSignedIn: boolean) {
        this.authStateListeners.forEach(l => l(isSignedIn));
    }

    public async refreshSession(): Promise<void> {
        // In GIS, we just request a new token quietly if possible, or trigger sign in
        // For simplicity in this PWA, we'll let operations fail and user re-login, 
        // or we could proactively ask for token
        if (!this.isSignedIn) return;
        // Optionally verify validity
    }


    // --- CRUD Methods ---

    // --- CRUD Methods ---

    public async getMoviesByGenre(genre: string): Promise<Movie[]> {
        if (!this.isInitialized) await this.initClient();
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `'${genre}'!A2:N`, // Extended range
            });
            if (response.result.values) {
                const rows = response.result.values;
                const movies = rows.map((row, index) => ({
                    barcode: row[0] || '',
                    title: row[1] || '',
                    year: row[2] || '',
                    genre: row[3] || genre,
                    imageType: (row[4] as 'tmdb' | 'base64' | undefined) || undefined,
                    imageValue: row[5] || undefined,
                    synopsis: row[6] || undefined,
                    rating: row[7] || undefined,
                    duration: row[8] || undefined,
                    director: row[9] || undefined,
                    tmdbId: row[10] || undefined,
                    cast: row[11] || undefined,
                    userRating: row[12] || undefined,
                    watched: row[13] === 'TRUE', // Parse boolean
                    _rowIndex: index + 2,
                    _sheetTitle: genre
                }));

                // Robust Sort: Ignore accents, case, and leading spaces
                return movies.sort((a, b) => {
                    const normA = a.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    const normB = b.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    return normA.localeCompare(normB);
                });
            }
            return [];
        } catch (error) {
            console.error(`Failed to fetch movies for genre ${genre}`, error);
            return [];
        }
    }

    public async getAllMovies(): Promise<Movie[]> {
        if (!this.isInitialized) await this.initClient();
        const genres = await this.getGenres();
        if (genres.length === 0) return [];

        const promises = genres.map(async (genre) => {
            try {
                return await this.getMoviesByGenre(genre);
            } catch (e) {
                return [];
            }
        });

        const results = await Promise.all(promises);
        return results.flat().sort((a, b) => {
            const normA = a.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const normB = b.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            return normA.localeCompare(normB);
        });
    }

    public async addMovie(movie: Movie): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const values = [[
            movie.barcode,
            movie.title,
            movie.year,
            movie.genre,
            movie.imageType || '',
            movie.imageValue || '',
            movie.synopsis || '',
            movie.rating || '',
            movie.duration || '',
            movie.director || '',
            movie.tmdbId || '',
            movie.cast || '',
            movie.userRating || '',
            movie.watched ? 'TRUE' : 'FALSE'
        ]];
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `'${movie.genre}'!A:N`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        await this.sortSheet(movie.genre);
    }

    public async batchUpdateImages(updates: { movie: Movie, imageType: 'tmdb' | 'base64', imageValue: string }[]): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (updates.length === 0) return;

        const data: any[] = [];
        updates.forEach(update => {
            const { movie, imageType, imageValue } = update;
            if (!movie._rowIndex || !movie._sheetTitle) return;

            const range = `'${movie._sheetTitle}'!E${movie._rowIndex}:F${movie._rowIndex}`;
            data.push({ range, values: [[imageType, imageValue]] });
        });

        if (data.length === 0) return;

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: { valueInputOption: 'USER_ENTERED', data }
        });
    }

    public async batchUpdateMetadata(updates: { movie: Movie, data: Partial<Movie> }[]): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (updates.length === 0) return;

        // Use batchUpdate to update specific disjoint cells for metadata (G-L)
        // Metadata Columns: G(6) -> L(11) [Synopsis, Rating, Duration, Director, TMDB_ID, Cast]
        // User Data Columns: M(12) -> N(13) [UserRating, Watched]

        const data: any[] = [];
        updates.forEach(u => {
            const { movie, data: updates } = u;
            if (!movie._rowIndex || !movie._sheetTitle) return;

            // We update G:L for metadata
            /* 
                G: Synopsis
                H: Rating
                I: Duration
                J: Director
                K: TMDB_ID
                L: Cast
            */

            // Construct row values, fallback to existing or empty
            // Be careful not to overwrite user data if we blindly write the whole row.
            // Targeting specific range G:L
            const range = `'${movie._sheetTitle}'!G${movie._rowIndex}:L${movie._rowIndex}`;
            const values = [[
                updates.synopsis || movie.synopsis || '',
                updates.rating || movie.rating || '',
                updates.duration || movie.duration || '',
                updates.director || movie.director || '',
                updates.tmdbId || movie.tmdbId || '',
                updates.cast || movie.cast || ''
            ]];
            data.push({ range, values });
        });

        if (data.length === 0) return;

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: { valueInputOption: 'USER_ENTERED', data }
        });
    }

    public async updateMovie(movie: Movie): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (!movie._rowIndex || !movie._sheetTitle) throw new Error("Metadata missing for update");

        const range = `'${movie._sheetTitle}'!A${movie._rowIndex}:N${movie._rowIndex}`;
        const values = [[
            movie.barcode,
            movie.title,
            movie.year,
            movie.genre,
            movie.imageType || '',
            movie.imageValue || '',
            movie.synopsis || '',
            movie.rating || '',
            movie.duration || '',
            movie.director || '',
            movie.tmdbId || '',
            movie.cast || '',
            movie.userRating || '',
            movie.watched ? 'TRUE' : 'FALSE'
        ]];

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
    }

    public async deleteMovie(movie: Movie): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (!movie._rowIndex || !movie._sheetTitle) throw new Error("Metadata missing for delete");

        const sheet = (await this.getSheetsMetadata()).find(s => s.title === movie._sheetTitle);
        if (!sheet) throw new Error(`Sheet ${movie._sheetTitle} not found`);

        const startIndex = movie._rowIndex - 1;
        const endIndex = startIndex + 1;

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheet.sheetId,
                            dimension: 'ROWS',
                            startIndex,
                            endIndex
                        }
                    }
                }]
            }
        });
    }

    public async moveMovie(movie: Movie, oldGenre: string): Promise<void> {
        await this.addMovie(movie);
        try {
            if (!movie._rowIndex) throw new Error("Cannot move movie without original rowIndex");
            const oldMovieMock: Movie = {
                ...movie,
                genre: oldGenre,
                _sheetTitle: oldGenre,
                _rowIndex: movie._rowIndex
            };
            await this.deleteMovie(oldMovieMock);
        } catch (error) {
            console.error("Failed to delete old movie after move", error);
            throw error;
        }
    }

    public async createGenre(genreName: string): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: { requests: [{ addSheet: { properties: { title: genreName } } }] }
        });
        const values = [this.EXPECTED_HEADERS];
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `'${genreName}'!A1:N1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
    }

    public async getAllGenreCounts(): Promise<{ genre: string; count: number }[]> {
        if (!this.isInitialized) await this.initClient();
        try {
            const sheets = await this.getSheetsMetadata();
            if (sheets.length === 0) return [];
            const ranges = sheets.map(s => `'${s.title}'!A2:A`);
            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: this.SPREADSHEET_ID,
                ranges: ranges
            });
            const valueRanges = response.result.valueRanges;
            if (!valueRanges) return [];
            return sheets.map((sheet, index) => {
                const rangeData = valueRanges[index];
                return { genre: sheet.title, count: rangeData.values ? rangeData.values.length : 0 };
            });
        } catch (error) {
            console.error("Failed to fetch genre counts", error);
            return [];
        }
    }

    private async getSheetsMetadata(): Promise<{ title: string, sheetId: number }[]> {
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: this.SPREADSHEET_ID,
        });
        return response.result.sheets?.map(s => ({
            title: s.properties?.title || '',
            sheetId: s.properties?.sheetId || 0
        })) || [];
    }

    private readonly EXPECTED_HEADERS = ["Barcode", "Title", "Year", "Genres", "ImageType", "ImageValue", "Synopsis", "Rating", "Duration", "Director", "TMDB_ID", "Cast", "UserRating", "Watched"];

    public async validateSheetStructure(): Promise<boolean> {
        if (!this.isInitialized) await this.initClient();
        try {
            const sheets = await this.getSheetsMetadata();
            if (sheets.length === 0) return false;
            const ranges = sheets.map(s => `'${s.title}'!A1:N1`); // Check up to N
            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: this.SPREADSHEET_ID,
                ranges: ranges
            });
            const valueRanges = response.result.valueRanges;
            if (!valueRanges) return false;
            for (let i = 0; i < sheets.length; i++) {
                const headers = valueRanges[i].values?.[0];
                if (!headers || !this.areHeadersValid(headers)) {
                    console.error(`Invalid headers in sheet: ${sheets[i].title}`, headers);
                    return false;
                }
            }
            return true;
        } catch (e) {
            console.error("Validation failed", e);
            return false;
        }
    }

    private areHeadersValid(headers: string[]): boolean {
        if (headers.length < 6) return false;
        // Lenient check for migration: if it has at least 6 and first 6 match, valid enough 
        // to load, but we might want to prompt upgrade if missing N.
        return (
            headers[0] === this.EXPECTED_HEADERS[0] &&
            headers[1] === this.EXPECTED_HEADERS[1]
        );
    }

    public async upgradeSheetStructure(): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const sheets = await this.getSheetsMetadata();
        if (sheets.length === 0) return;

        const values = [this.EXPECTED_HEADERS];
        const data = sheets.map(s => ({
            range: `'${s.title}'!A1:N1`,
            values: values
        }));

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: { valueInputOption: 'USER_ENTERED', data }
        });
    }

    public async getGenres(): Promise<string[]> {
        if (!this.isInitialized) await this.initClient();
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: this.SPREADSHEET_ID,
        });
        return response.result.sheets?.map(s => s.properties?.title || '').filter(Boolean) || [];
    }

    private async sortSheet(sheetTitle: string): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const sheets = await this.getSheetsMetadata();
        const sheet = sheets.find(s => s.title === sheetTitle);
        if (!sheet) return;

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: {
                requests: [{
                    sortRange: {
                        range: {
                            sheetId: sheet.sheetId,
                            startRowIndex: 1,
                        },
                        sortSpecs: [{ dimensionIndex: 1, sortOrder: "ASCENDING" }]
                    }
                }]
            }
        });
    }
}
