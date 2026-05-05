# SnapLink URL Shortener (SSR)

Modern URL shortener built with:

- Node.js + Express.js (server-side rendering)
- EJS + Bootstrap (UI/UX)
- MongoDB + Mongoose (database)

## 🌐 Live Demo
https://snaplink-uf6o.onrender.com/
## Features

- Session-based authentication with signup, login, and logout
- Account-scoped short links and private analytics dashboard
- CSRF protection for form submissions
- Route-level rate limiting for signup, login, and link creation
- Optional custom aliases like `/summer-sale` for branded short links
- QR code preview and download for every owned short link
- Shorten long URLs into compact unique links
- Reuse an existing default short URL when the same account submits the same original URL again
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

3. Start development server:

```bash
npm run dev
```

4. Open:

- Home: `http://localhost:3000/`
- Dashboard: `http://localhost:3000/dashboard`

## Main Routes

- `GET /` -> public landing page and authenticated creation workspace
- `GET /login` -> sign-in page
- `GET /signup` -> account creation page
- `POST /shorten` -> creates or reuses a short URL for the logged-in user
- `POST /urls/:urlId/delete` -> deletes one of the logged-in user's short URLs
- `GET /urls/:urlId/qr` -> previews or downloads a QR code for one of the logged-in user's short URLs
- `GET /dashboard` -> private analytics dashboard for the logged-in user
- `GET /:shortCode` -> public redirect to the original URL
