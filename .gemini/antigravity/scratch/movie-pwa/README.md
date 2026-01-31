# Movie Collection PWA

A premium, Google Sheets-backed progressive web app for managing your movie collection.

## Features
- **Offline Ready**: Works offline (Read-Only).
- **Google Sheets Database**: Your data stays in your Google Drive.
- **Installable**: PWA support for iOS and Android (add to home screen).
- **Manage Genres**: Create new categories easily.
- **Search & Filter**: Instant search by barcode, title, or year.

## Setup Requirements

### 1. Google Cloud Configuration
You MUST have a Google Cloud Project with the **Google Sheets API** enabled.
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project.
3. Enable "Google Sheets API".
4. Create Credentials -> OAuth Client ID -> Web Application.
   - Authorized JavaScript origins: `http://localhost:5173` (and your production URL).
5. Create Credentials -> API Key.

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- `VITE_GOOGLE_CLIENT_ID`: Your OAuth Client ID.
- `VITE_GOOGLE_API_KEY`: Your API Key.
- `VITE_GOOGLE_SHEET_ID`: The ID of your Google Sheet (from the URL).

### 3. Google Sheet Structure
The app validates your sheet structure.
- **Preferred**: Start with a BLANK spreadsheet. The app can create genres (tabs) for you.
- **Manual**: If you create tabs manually, ensure row 1 has strictly:
  `A1`="Código de barras", `B1`="Título do filme", `C1`="Ano", `D1`="Gênero"

## Commands
- `npm run dev`: Start local server.
- `npm run build`: Build for production.
