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

    public async getMoviesByGenre(genre: string): Promise<Movie[]> {
        if (!this.isInitialized) await this.initClient();
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `'${genre}'!A2:F`, // Skip header
            });
            const rows = response.result.values || [];
            return rows.map((row, index) => ({
                barcode: row[0] || '',
                title: row[1] || '',
                year: row[2] || '',
                genre: row[3] || genre,
                imageType: (row[4] as 'tmdb' | 'base64' | undefined) || undefined,
                imageValue: row[5] || undefined,
                _rowIndex: index + 2, // 1-based index, +1 for header
                _sheetTitle: genre
            }));
        } catch (error) {
            console.error(`Failed to fetch movies for genre ${genre}`, error);
            // If sheet doesn't exist (e.g. freshly deleted), return empty
            return [];
        }
    }

    public async addMovie(movie: Movie): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const values = [[
            movie.barcode,
            movie.title,
            movie.year,
            movie.genre,
            movie.imageType || '',
            movie.imageValue || ''
        ]];
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `'${movie.genre}'!A:F`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        // Auto-sort strictly alphabetically
        await this.sortSheet(movie.genre);
    }


    public async batchUpdateImages(updates: { movie: Movie, imageType: 'tmdb' | 'base64', imageValue: string }[]): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (updates.length === 0) return;

        // Group by sheet title to optimize
        // Note: Google Sheets API supports batchUpdate with ValueRange, allowing multiple updates in one HTTP call.
        const data: any[] = [];

        updates.forEach(update => {
            const { movie, imageType, imageValue } = update;
            if (!movie._rowIndex || !movie._sheetTitle) return;

            // Target only the ImageType (E) and ImageValue (F) columns
            const range = `'${movie._sheetTitle}'!E${movie._rowIndex}:F${movie._rowIndex}`;
            data.push({
                range,
                values: [[imageType, imageValue]]
            });
        });

        if (data.length === 0) return;

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: data
            }
        });
    }

    public async updateMovie(movie: Movie): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        if (!movie._rowIndex || !movie._sheetTitle) throw new Error("Metadata missing for update");

        // Ensure we are updating the correct row in the correct sheet
        const range = `'${movie._sheetTitle}'!A${movie._rowIndex}:F${movie._rowIndex}`;
        const values = [[
            movie.barcode,
            movie.title,
            movie.year,
            movie.genre,
            movie.imageType || '',
            movie.imageValue || ''
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

        // We need the sheetId to delete rows
        const sheet = (await this.getSheetsMetadata()).find(s => s.title === movie._sheetTitle);
        if (!sheet) throw new Error(`Sheet ${movie._sheetTitle} not found`);

        const startIndex = movie._rowIndex - 1; // 0-based inclusive
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
        // Atomic-ish: Add to new, then delete from old
        await this.addMovie(movie);
        try {
            // Reconstruct old movie object for deletion
            // We need the _rowIndex from the ORIGINAL movie object passed in
            if (!movie._rowIndex) throw new Error("Cannot move movie without original rowIndex");

            const oldMovieMock: Movie = {
                ...movie,
                genre: oldGenre,
                _sheetTitle: oldGenre,
                _rowIndex: movie._rowIndex
            };
            await this.deleteMovie(oldMovieMock);
        } catch (error) {
            console.error("Failed to delete old movie after move. Duplicate may exist.", error);
            throw error; // Propagate error so UI can warn user
        }
    }

    public async createGenre(genreName: string): Promise<void> {
        if (!this.isInitialized) await this.initClient();

        // 1. Add Sheet
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: {
                requests: [{
                    addSheet: {
                        properties: { title: genreName }
                    }
                }]
            }
        });

        // 2. Add Header Row
        const values = [this.EXPECTED_HEADERS];
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `'${genreName}'!A1:F1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
    }


    public async getAllGenreCounts(): Promise<{ genre: string; count: number }[]> {
        if (!this.isInitialized) await this.initClient();

        try {
            // 1. Get all sheet names
            const sheets = await this.getSheetsMetadata();
            if (sheets.length === 0) return [];

            // 2. Batch Get all A columns to count rows
            // Note: Google Sheets API limits ranges per request, typically around 100.
            const ranges = sheets.map(s => `'${s.title}'!A2:A`);

            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: this.SPREADSHEET_ID,
                ranges: ranges
            });

            const valueRanges = response.result.valueRanges;
            if (!valueRanges) return [];

            return sheets.map((sheet, index) => {
                const rangeData = valueRanges[index];
                // Count non-empty rows
                const count = rangeData.values ? rangeData.values.length : 0;
                return {
                    genre: sheet.title,
                    count
                };
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



    private readonly EXPECTED_HEADERS = ["Barcode", "Title", "Year", "Genres", "ImageType", "ImageValue"];

    public async validateSheetStructure(): Promise<boolean> {
        if (!this.isInitialized) await this.initClient();

        try {
            // 1. Get all sheet names
            const sheets = await this.getSheetsMetadata();
            if (sheets.length === 0) return false;

            // 2. Batch Get all headers in one request to avoid 429 errors
            const ranges = sheets.map(s => `'${s.title}'!A1:F1`);

            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: this.SPREADSHEET_ID,
                ranges: ranges
            });

            const valueRanges = response.result.valueRanges;
            if (!valueRanges) return false;

            // 3. Validate each response
            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                const rangeData = valueRanges[i];
                const headers = rangeData.values?.[0]; // First row

                if (!headers || !this.areHeadersValid(headers)) {
                    console.error(`Invalid headers in sheet: ${sheet.title}`, headers);
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
        // Strict order check
        return (
            headers[0] === this.EXPECTED_HEADERS[0] &&
            headers[1] === this.EXPECTED_HEADERS[1] &&
            headers[2] === this.EXPECTED_HEADERS[2] &&
            headers[3] === this.EXPECTED_HEADERS[3] &&
            headers[4] === this.EXPECTED_HEADERS[4] &&
            headers[5] === this.EXPECTED_HEADERS[5]
        );
    }

    public async upgradeSheetStructure(): Promise<void> {
        if (!this.isInitialized) await this.initClient();

        const sheets = await this.getSheetsMetadata();
        if (sheets.length === 0) return;

        // Upgrade all sheets headers
        // We will just overwrite A1:F1 with the new headers.
        // BE CAREFUL: existing data in E1/F1 will be overwritten if any.
        // Assuming E1/F1 are empty or contain previous partial headers.

        const values = [this.EXPECTED_HEADERS];

        // We can do this in parallel or batch
        // Since it's a one time migration triggered by user, simple loop is okay 
        // OR batchUpdate. Let's use batchUpdate for safety/efficiency.

        const data = sheets.map(s => ({
            range: `'${s.title}'!A1:F1`,
            values: values
        }));

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: data
            }
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

        // Find sheetId
        const sheets = await this.getSheetsMetadata();
        const sheet = sheets.find(s => s.title === sheetTitle);
        if (!sheet) return;

        // Sort by Title (Column B, index 1)
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.SPREADSHEET_ID,
            resource: {
                requests: [{
                    sortRange: {
                        range: {
                            sheetId: sheet.sheetId,
                            startRowIndex: 1, // Skip Header
                            // endRowIndex implied to be end of sheet
                        },
                        sortSpecs: [{
                            dimensionIndex: 1, // Column B (Title)
                            sortOrder: "ASCENDING"
                        }]
                    }
                }]
            }
        });
    }
}
