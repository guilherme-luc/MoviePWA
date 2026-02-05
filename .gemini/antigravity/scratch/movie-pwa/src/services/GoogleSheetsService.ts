import type { Movie } from '../types';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

export class GoogleSheetsService {
    private _dvdSpreadsheetId: string | null = null;
    private _vhsSpreadsheetId: string | null = null;
    private isInitialized = false;

    // GIS Properties
    private tokenClient: any = null;
    private _accessToken: string | null = null;
    private pendingSignInResolve: ((value: void | PromiseLike<void>) => void) | null = null;
    private authListeners: ((isSignedIn: boolean) => void)[] = [];

    private getSpreadsheetId(format: 'DVD' | 'VHS'): string {
        const id = format === 'VHS' ? this._vhsSpreadsheetId : this._dvdSpreadsheetId;
        if (!id) throw new Error(`Spreadsheet ID for ${format} not found. Ensure client is initialized.`);
        return id;
    }

    constructor() {
        this._dvdSpreadsheetId = localStorage.getItem('user_dvd_spreadsheet_id') || localStorage.getItem('user_spreadsheet_id'); // Legacy support
        this._vhsSpreadsheetId = localStorage.getItem('user_vhs_spreadsheet_id');
    }

    public get isSignedIn(): boolean {
        return !!this._accessToken;
    }

    public async initClient(): Promise<void> {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            const initGapiClient = async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                        discoveryDocs: [
                            "https://sheets.googleapis.com/$discovery/rest?version=v4",
                            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
                        ],
                    });

                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly",
                        callback: async (response: any) => {
                            if (response.error !== undefined) {
                                throw response;
                            }
                            this._accessToken = response.access_token;
                            if (window.gapi.client) window.gapi.client.setToken(response);
                            localStorage.setItem('gst_logged_in', 'true');

                            await this.provisionUserSheets();
                            this.notifyAuthChange();

                            if (this.pendingSignInResolve) {
                                this.pendingSignInResolve();
                                this.pendingSignInResolve = null;
                            }
                        },
                    });

                    this.isInitialized = true;
                    resolve();

                } catch (error) {
                    console.error("Error initializing Google Sheets API", error);
                    reject(error);
                }
            };

            const checkGapi = () => {
                if (window.gapi && window.gapi.load && window.google && window.google.accounts) {
                    window.gapi.load('client', initGapiClient);
                } else {
                    setTimeout(checkGapi, 100);
                }
            };

            checkGapi();
        });
    }

    public onAuthStateChanged(callback: (isSignedIn: boolean) => void): void {
        this.authListeners.push(callback);
        callback(this.isSignedIn);
    }

    private notifyAuthChange() {
        this.authListeners.forEach(cb => cb(this.isSignedIn));
    }

    public async signIn(): Promise<void> {
        return new Promise((resolve) => {
            this.pendingSignInResolve = resolve;
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    public async signOut(): Promise<void> {
        if (this._accessToken) {
            window.google.accounts.oauth2.revoke(this._accessToken, () => { console.log("Token revoked"); });
        }
        this._accessToken = null;
        if (window.gapi.client) window.gapi.client.setToken(null);
        localStorage.removeItem('gst_logged_in');
        localStorage.removeItem('gst_access_token');

        this._dvdSpreadsheetId = null;
        this._vhsSpreadsheetId = null;
        localStorage.removeItem('user_spreadsheet_id'); // Clear legacy
        localStorage.removeItem('user_dvd_spreadsheet_id');
        localStorage.removeItem('user_vhs_spreadsheet_id');
        this.notifyAuthChange();
    }

    public async provisionUserSheets(): Promise<void> {
        if (!this.isSignedIn) return;

        try {
            console.log("Provisioning User Sheets...");

            // 1. Provision DVD Sheet (Legacy or New)
            this._dvdSpreadsheetId = await this.ensureSheetExists("MoviePWA DVD Collection");
            if (this._dvdSpreadsheetId) {
                localStorage.setItem('user_dvd_spreadsheet_id', this._dvdSpreadsheetId);
                // Backwards compatibility for now
                localStorage.setItem('user_spreadsheet_id', this._dvdSpreadsheetId);
            }

            // 2. Provision VHS Sheet
            this._vhsSpreadsheetId = await this.ensureSheetExists("MoviePWA VHS Collection");
            if (this._vhsSpreadsheetId) {
                localStorage.setItem('user_vhs_spreadsheet_id', this._vhsSpreadsheetId);
            }

        } catch (error) {
            console.error("Failed to provision user sheets", error);
            throw error;
        }
    }

    private async ensureSheetExists(fileName: string): Promise<string> {
        // 1. Search
        // @ts-ignore
        const searchResponse = await gapi.client.drive.files.list({
            q: `name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const files = searchResponse.result.files;

        if (files && files.length > 0) {
            console.log(`Found existing spreadsheet for ${fileName}:`, files[0].id);
            return files[0].id!;
        } else {
            // 2. Create
            console.log(`Creating new spreadsheet: ${fileName}...`);
            const createResponse = await gapi.client.sheets.spreadsheets.create({
                resource: {
                    properties: { title: fileName },
                    sheets: [{ properties: { title: "Welcome" } }] // Default placeholder
                }
            });

            const newId = createResponse.result.spreadsheetId;
            if (!newId) throw new Error("Failed to create spreadsheet");

            console.log(`Created new spreadsheet ${fileName}:`, newId);
            return newId;
        }
    }

    // --- CRUD ---

    public async addMovie(movie: Movie, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();

        return this.requestWithRetry(async () => {
            const spreadsheetId = this.getSpreadsheetId(format);

            // 1. Check if genre sheet exists in the target file
            const sheets = await this.getSheetsMetadata(format);
            const genreSheet = sheets.find(s => s.title === movie.genre);

            if (!genreSheet) {
                await this.createGenre(movie.genre, format);
            }

            // 2. Append row
            const values = [this.movieToRow(movie)];
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `'${movie.genre}'!A:A`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values }
            });

            await this.sortSheet(movie.genre, format);
        });
    }

    public async getAllMovies(format: 'DVD' | 'VHS'): Promise<Movie[]> {
        console.log(`getAllMovies called for ${format}`);
        if (!this.isInitialized) await this.initClient();

        return this.requestWithRetry(async () => {
            const spreadsheetId = this.getSpreadsheetId(format);
            const sheets = await this.getSheetsMetadata(format);
            console.log(`Sheets found for ${format}:`, sheets.map(s => s.title));

            // Filter out "Welcome" placeholder
            const genreSheets = sheets.filter(s => s.title !== 'Welcome');
            if (genreSheets.length === 0) {
                console.log(`No genre sheets found for ${format} (only Welcome or none). Returning empty.`);
                return [];
            }

            const ranges = genreSheets.map(s => `'${s.title}'!A2:V`);
            console.log(`Fetching ranges for ${format}:`, ranges);

            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId,
                ranges
            });

            const valueRanges = response.result.valueRanges;
            let allMovies: Movie[] = [];

            if (valueRanges) {
                valueRanges.forEach((range: any, index: number) => {
                    const rows = range.values;
                    if (rows && rows.length > 0) {
                        const sheetTitle = genreSheets[index].title;
                        const movies = rows.map((row: any[], i: number) => this.rowToMovie(row, i + 2, sheetTitle)); // i + 2 because row 1 is header
                        allMovies = [...allMovies, ...movies];
                    }
                });
            }

            console.log(`getAllMovies for ${format} returning ${allMovies.length} movies.`);
            return allMovies;
        });
    }

    // --- Helper Methods updated for 'format' ---

    public async createGenre(genreName: string, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);

        const sheets = await this.getSheetsMetadata(format);
        const exists = sheets.some(s => s.title.toLowerCase() === genreName.toLowerCase());

        if (exists) {
            console.log(`Genre "${genreName}" already exists in ${format}. Skipping.`);
            return;
        }

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests: [{ addSheet: { properties: { title: genreName } } }] }
        });

        const values = [this.EXPECTED_HEADERS];
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${genreName}'!A1:V1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        // Optimization: If "Welcome" sheet exists and is empty/unused, from now on we delete it.
        const welcomeSheet = sheets.find(s => s.title === 'Welcome');
        if (welcomeSheet && sheets.length === 1) {
            // We just added one, so old length was 1. Now it is effectively 2.
            // Delete 'Welcome' now.
            await this.deleteSheet(welcomeSheet.sheetId, spreadsheetId);
        }
    }

    public async deleteGenre(genreName: string, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);
        const sheets = await this.getSheetsMetadata(format);
        const sheet = sheets.find(s => s.title === genreName);

        if (!sheet) throw new Error(`Genre ${genreName} not found in ${format}`);

        await this.deleteSheet(sheet.sheetId, spreadsheetId);
    }

    public async renameGenre(oldName: string, newName: string, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);
        const sheets = await this.getSheetsMetadata(format);
        const sheet = sheets.find(s => s.title === oldName);

        if (!sheet) throw new Error(`Genre ${oldName} not found in ${format}`);

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheet.sheetId,
                            title: newName
                        },
                        fields: "title"
                    }
                }]
            }
        });
    }

    private async deleteSheet(sheetId: number, spreadsheetId: string): Promise<void> {
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{ deleteSheet: { sheetId } }]
            }
        });
    }

    private async getSheetsMetadata(format: 'DVD' | 'VHS'): Promise<{ title: string, sheetId: number }[]> {
        const spreadsheetId = this.getSpreadsheetId(format);
        const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        return response.result.sheets?.map((s: any) => ({
            title: s.properties?.title || '',
            sheetId: s.properties?.sheetId || 0
        })) || [];
    }

    public async getGenres(format: 'DVD' | 'VHS'): Promise<string[]> {
        console.log(`Getting genres for ${format}...`);
        if (!this.isInitialized) await this.initClient();
        try {
            const meta = await this.getSheetsMetadata(format);
            return meta.filter(s => s.title !== 'Welcome').map(s => s.title);
        } catch (error) {
            console.error(`Error getting genres for ${format}`, error);
            return [];
        }
    }

    // --- Update Methods (Batch & Single) ---

    public async updateMovie(movie: Movie, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);

        return this.requestWithRetry(async () => {
            if (!movie._rowIndex || !movie._sheetTitle) throw new Error("Metadata missing for update");

            // Re-calculate row content
            const values = [this.movieToRow(movie)];
            const range = `'${movie._sheetTitle}'!A${movie._rowIndex}:V${movie._rowIndex}`;

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            // We might want to sort if title changed, but doing it every update is heavy.
        });
    }

    public async deleteMovie(movie: Movie, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);

        return this.requestWithRetry(async () => {
            const sheet = (await this.getSheetsMetadata(format)).find(s => s.title === movie._sheetTitle);
            if (!sheet) throw new Error(`Sheet ${movie._sheetTitle} not found`);

            const startIndex = movie._rowIndex! - 1;
            const endIndex = startIndex + 1;

            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
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
        });
    }

    public async moveMovie(movie: Movie, newGenre: string, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();

        // 1. Add to new genre
        const newMovie = { ...movie, genre: newGenre };
        await this.addMovie(newMovie, format);

        // 2. Delete from old genre
        await this.deleteMovie(movie, format);
    }

    // --- Batch Updates (Images/Metadata) ---
    // These need to handle movies potentially from different formats if we ever mix them in UI,
    // but typically UI shows one format at a time. 
    // For safety, we should pass format or derive it. 
    // Assuming UI passes homogeneous lists for now.

    public async batchUpdateImages(updates: { movie: Movie, imageType: 'tmdb' | 'base64', imageValue: string, backdropType?: 'tmdb' | 'base64', backdropValue?: string }[], format: 'DVD' | 'VHS'): Promise<void> {
        if (updates.length === 0) return;
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);

        return this.requestWithRetry(async () => {
            const data: any[] = [];
            updates.forEach(update => {
                const { movie, imageType, imageValue, backdropType, backdropValue } = update;
                if (!movie._rowIndex || !movie._sheetTitle) return;

                const rangePoster = `'${movie._sheetTitle}'!E${movie._rowIndex}:F${movie._rowIndex}`;
                data.push({ range: rangePoster, values: [[imageType, imageValue]] });

                if (backdropValue) {
                    const rangeBackdrop = `'${movie._sheetTitle}'!O${movie._rowIndex}:P${movie._rowIndex}`;
                    data.push({ range: rangeBackdrop, values: [[backdropType || 'tmdb', backdropValue]] });
                }
            });

            if (data.length === 0) return;

            await gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                resource: { valueInputOption: 'USER_ENTERED', data }
            });
        });
    }

    public async batchUpdateMetadata(updates: { movie: Movie, data: Partial<Movie> }[], format: 'DVD' | 'VHS'): Promise<void> {
        if (updates.length === 0) return;
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);

        return this.requestWithRetry(async () => {
            const data: any[] = [];
            updates.forEach(u => {
                const { movie, data: updates } = u;
                if (!movie._rowIndex || !movie._sheetTitle) return;

                const range1 = `'${movie._sheetTitle}'!G${movie._rowIndex!}:L${movie._rowIndex!}`;
                const values1 = [[
                    updates.synopsis || movie.synopsis || '',
                    updates.rating || movie.rating || '',
                    updates.duration || movie.duration || '',
                    updates.director || movie.director || '',
                    updates.tmdbId || movie.tmdbId || '',
                    updates.cast || movie.cast || ''
                ]];
                data.push({ range: range1, values: values1 });

                const range2 = `'${movie._sheetTitle}'!R${movie._rowIndex!}:U${movie._rowIndex!}`;
                const values2 = [[
                    updates.franchise || movie.franchise || '',
                    updates.soundtrackUrl || movie.soundtrackUrl || '',
                    updates.rottenTomatoesRating || movie.rottenTomatoesRating || '',
                    updates.metacriticRating || movie.metacriticRating || ''
                ]];
                data.push({ range: range2, values: values2 });
            });

            if (data.length === 0) return;

            await gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                resource: { valueInputOption: 'USER_ENTERED', data }
            });
        });
    }

    private async sortSheet(sheetTitle: string, format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);
        const sheets = await this.getSheetsMetadata(format);
        const sheet = sheets.find(s => s.title === sheetTitle);
        if (!sheet) return;

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
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

    public async getAllGenreCounts(format: 'DVD' | 'VHS'): Promise<{ genre: string; count: number }[]> {
        if (!this.isInitialized) await this.initClient();
        try {
            const sheets = await this.getSheetsMetadata(format);

            // Filter Welcome
            const activeSheets = sheets.filter(s => s.title !== 'Welcome');
            if (activeSheets.length === 0) return [];

            const ranges = activeSheets.map(s => `'${s.title}'!A2:A`);
            const spreadsheetId = this.getSpreadsheetId(format);

            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId,
                ranges: ranges
            });
            const valueRanges = response.result.valueRanges;
            if (!valueRanges) return [];

            return activeSheets.map((sheet, index) => {
                const rangeData = valueRanges[index];
                return { genre: sheet.title, count: rangeData.values ? rangeData.values.length : 0 };
            });
        } catch (error) {
            console.error("Failed to fetch genre counts", error);
            throw error;
        }
    }

    // --- Migration Logic ---

    public async findLegacyVHSMovies(): Promise<Movie[]> {
        // Look in DVD spreadsheet (Legacy) for items with Format == 'VHS'
        // For safety, we fetch all from DVD. 
        const allDvdMovies = await this.getAllMovies('DVD');
        // Column V is mapped to 'format'
        return allDvdMovies.filter(m => m.format === 'VHS');
    }

    public async migrateMoviesToVHSFile(movies: Movie[]): Promise<void> {
        console.log(`Migrating ${movies.length} movies to VHS file...`);

        // 1. Add to VHS File
        for (const movie of movies) {
            // Add to new file (will auto-create genres)
            await this.addMovie(movie, 'VHS');
        }

        // 2. Remove from DVD File (Legacy)
        // Reverse order to avoid index shifting issues ideally, OR use batch delete.
        // Simple approach: delete one by one. Slow but safe.
        for (const movie of movies) {
            await this.deleteMovie(movie, 'DVD');
        }
    }


    // H: Rating, I: Duration, J: Director, K: TMDB_ID, L: Cast, M: UserRating, N: Watched, O: BackdropType, P: BackdropVal, Q: Tags, R: Franchise, S: Soundtrack, T: RottenTomatoes, U: Metacritic
    // V: Format (DVD|VHS)
    private readonly EXPECTED_HEADERS = ['Barcode', 'Title', 'Year', 'Genre', 'ImageType', 'ImageValue', 'Synopsis', 'Rating', 'Duration', 'Director', 'TMDB_ID', 'Cast', 'UserRating', 'Watched', 'BackdropType', 'BackdropValue', 'Tags', 'Franchise', 'Soundtrack', 'RottenTomatoes', 'Metacritic', 'Format'];

    public async validateSheetStructure(format: 'DVD' | 'VHS'): Promise<boolean> {
        if (!this.isInitialized) await this.initClient();
        try {
            const sheets = await this.getSheetsMetadata(format);
            if (sheets.length === 0) return false;

            // Skip Welcome sheet
            const activeSheets = sheets.filter(s => s.title !== 'Welcome');
            if (activeSheets.length === 0) return true;

            const ranges = activeSheets.map(s => `'${s.title}'!A1:V1`); // Check up to V
            const spreadsheetId = this.getSpreadsheetId(format);

            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId,
                ranges: ranges
            });
            const valueRanges = response.result.valueRanges;
            if (!valueRanges) return false;
            for (let i = 0; i < activeSheets.length; i++) {
                const sheetTitle = activeSheets[i].title;
                const headers = valueRanges[i].values?.[0];

                // Auto-Repair: If headers are missing, write them!
                if (!headers || headers.length === 0) {
                    console.warn(`Sheet '${sheetTitle}' is missing headers. Auto-repairing...`);
                    const values = [this.EXPECTED_HEADERS];
                    await gapi.client.sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `'${sheetTitle}'!A1:V1`,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values }
                    });
                    continue; // Repaired
                }

                // Basic validation (check first few columns)
                const required = ['Barcode', 'Title', 'Year', 'Genre'];
                const missing = required.filter(h => !headers.includes(h));

                if (missing.length > 0) {
                    console.error(`Sheet '${sheetTitle}' missing columns:`, missing);
                    return false;
                }
                // Check if 'Format' (Column V) is present. If only up to U, it's missing.
                if (!headers || headers.length < 22 || headers[21] !== 'Format') { // 22 columns (A-V)
                    console.warn(`Sheet ${activeSheets[i].title} is missing Format column. Attempting to fix...`);
                    await this.migrateSheetFormatColumn(activeSheets[i].title, format);
                }
            }
            return true;
        } catch (error) {
            console.error("Sheet validation/migration failed", error);
            return false;
        }
    }

    private async migrateSheetFormatColumn(sheetTitle: string, format: 'DVD' | 'VHS'): Promise<void> {
        const spreadsheetId = this.getSpreadsheetId(format);
        // 1. Add Header "Format" to V1
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${sheetTitle}'!V1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['Format']] }
        });

        // 2. Fill 'DVD' for all existing rows (from Row 2 to Last Row)
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetTitle}'!A2:A`
        });
        const rowCount = response.result.values?.length || 0;

        if (rowCount > 0) {
            // If we are migrating the legacy sheet (likely DVD), we default to that format
            const defaultFormat = format;
            const formats = Array(rowCount).fill([defaultFormat]);
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetTitle}'!V2:V${rowCount + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: formats }
            });
        }
        console.log(`Migrated sheet ${sheetTitle}: Added Format column.`);
    }


    // Unlikely to be used now that we have split files, but kept for legacy upgrade if needed
    public async upgradeSheetStructure(format: 'DVD' | 'VHS'): Promise<void> {
        if (!this.isInitialized) await this.initClient();
        const spreadsheetId = this.getSpreadsheetId(format);
        const sheets = await this.getSheetsMetadata(format);
        if (sheets.length === 0) return;

        const values = [this.EXPECTED_HEADERS];
        const data = sheets.map(s => ({
            range: `'${s.title}'!A1:V1`,
            values: values
        }));

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'USER_ENTERED', data }
        });
    }

    // --- Helper for Retries ---
    private async requestWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            if (retries > 0 && (error.status === 401 || error.status === 429)) {
                console.warn(`Request failed with status ${error.status}. Retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Force token refresh on 401
                if (error.status === 401) {
                    // Try to silently refresh or prompt used
                    // We can reuse signIn which now properly waits for the token
                    console.log("401 detected, attempting to refresh token...");
                    await this.signIn();
                }

                return this.requestWithRetry(operation, retries - 1);
            }
            throw error;
        }
    }

    private movieToRow(movie: Movie): any[] {
        return [
            movie.barcode || '',
            movie.title,
            movie.year,
            movie.genre,
            movie.imageType,
            movie.imageValue,
            movie.synopsis || '',
            movie.rating || '',
            movie.duration || '',
            movie.director || '',
            movie.tmdbId || '',
            movie.cast || '',
            movie.userRating || '',
            movie.watched ? 'TRUE' : 'FALSE',
            movie.backdropType || 'tmdb',
            movie.backdropValue || '',
            movie.tags?.join(',') || '', // Q: Tags
            movie.franchise || '',       // R: Franchise
            movie.soundtrackUrl || '',   // S: Soundtrack
            movie.rottenTomatoesRating || '', // T: RottenTomatoes
            movie.metacriticRating || '',     // U: Metacritic
            movie.format || 'DVD'            // V: Format
        ];
    }

    public static getInstance(): GoogleSheetsService {
        return googleSheetsService;
    }

    private rowToMovie(row: any[], rowIndex: number, sheetTitle: string): Movie {
        return {
            barcode: row[0],
            title: row[1],
            year: row[2],
            genre: row[3],
            imageType: row[4] as 'tmdb' | 'base64',
            imageValue: row[5],
            synopsis: row[6],
            rating: row[7],
            duration: row[8],
            director: row[9],
            tmdbId: row[10],
            cast: row[11],
            userRating: row[12] ? String(row[12]) : undefined, // Fix: Convert to string as per Movie type
            watched: row[13] === 'TRUE',
            backdropType: row[14] as 'tmdb' | 'base64' || 'tmdb',
            backdropValue: row[15],
            tags: row[16] ? row[16].split(',') : [],
            franchise: row[17],
            soundtrackUrl: row[18],
            rottenTomatoesRating: row[19],
            metacriticRating: row[20],
            format: (row[21] as 'DVD' | 'VHS') || 'DVD',
            _rowIndex: rowIndex,
            _sheetTitle: sheetTitle
        };
    }
}

const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
