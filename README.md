# SnapLink URL Shortener (SSR)

Modern URL shortener built with:

- Node.js + Express.js (server-side rendering)
- EJS + Bootstrap (UI/UX)
- MongoDB + Mongoose (database)

## Features

- Shorten long URLs into compact unique links
- Reuse existing short URL when the same original URL is submitted
- Redirect users from short link to original URL
- Track URL activity:
  - URL creation actions
  - Visit/click actions
  - IP, user agent, referrer, timestamps
- Modern analytics dashboard:
  - Total links, total clicks, total activities
  - Average clicks per URL
  - Last 7-day activity trend
  - Top performing URLs
  - Recent URL records and timeline
- SSR views with smooth transitions and premium Bootstrap-based design

## 📁 Project Structure (Simplified)

- **controllers/** → Request handling logic  
- **services/** → Business logic  
- **models/** → Database schemas  
- **routes/** → API routes  
- **views/** → EJS templates  
- **middlewares/** → Error & async handling  
- **public/** → Static assets  
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

If you are on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` values:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/url_shortener
```

4. Start development server:

```bash
npm run dev
```

5. Open:

- Home: `http://localhost:3000/`
- Dashboard: `http://localhost:3000/dashboard`

## Main Routes

- `GET /` -> URL shortener page
- `POST /shorten` -> creates/reuses short URL
- `POST /urls/:urlId/delete` -> deletes an existing short URL
- `GET /dashboard` -> analytics dashboard
- `GET /:shortCode` -> redirect to original URL
