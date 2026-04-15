# YouTube Content Analyzer

An AI-powered YouTube channel analyzer that uses the YouTube Data API, YouTube Analytics API, and Anthropic Claude to provide actionable growth recommendations.

## Features

- OAuth2 authentication with Google/YouTube
- Fetch and display your recent videos with stats (views, likes, comments)
- Channel analytics overview (last 90 days)
- AI-powered analysis via Claude that identifies:
  - Top insights from your data
  - Quick wins to implement immediately
  - Content gaps and opportunities
  - Best-performing patterns
  - Detailed recommendations by category (titles, length, timing, tags, thumbnails)

## Tech Stack

- **Backend**: Python, FastAPI, SQLite (SQLAlchemy)
- **Frontend**: React 18, Tailwind CSS, Vite
- **APIs**: YouTube Data API v3, YouTube Analytics API, Anthropic Claude API

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd youtube-analyzer-test
```

### 2. Get API credentials

#### Google OAuth (YouTube APIs)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable these APIs:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URI: `http://localhost:8000/auth/callback`
7. Copy your **Client ID** and **Client Secret**

#### Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
ANTHROPIC_API_KEY=your_anthropic_key_here
REDIRECT_URI=http://localhost:8000/auth/callback
FRONTEND_URL=http://localhost:5173
```

### 4. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

### 5. Start the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Usage

1. Open `http://localhost:5173` in your browser
2. Click **Connect YouTube Account**
3. Authorize access to your YouTube channel
4. View your recent videos and analytics on the dashboard
5. Click **Analyze My Channel** to get AI-powered recommendations
6. Browse insights, quick wins, and detailed recommendations

## Project Structure

```
youtube-analyzer-test/
├── backend/
│   ├── main.py          # FastAPI app + endpoints
│   ├── auth.py          # Google OAuth2 flow
│   ├── youtube.py       # YouTube Data & Analytics API
│   ├── analyzer.py      # Claude AI analysis
│   ├── database.py      # SQLAlchemy models
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── VideoCard.jsx
    │       └── Recommendations.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/auth/login` | Redirect to Google OAuth |
| GET | `/auth/callback` | OAuth callback handler |
| GET | `/videos/{user_id}` | Get recent videos with stats |
| GET | `/analytics/{user_id}` | Get 90-day channel analytics |
| POST | `/analyze/{user_id}` | Run AI analysis, get recommendations |
