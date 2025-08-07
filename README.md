# Application Portal

A web application portal built with Astro and Cloudflare that handles Google OAuth authentication, application forms with essays, and admin dashboard functionality.

## Features

- **Google OAuth Authentication**: Secure sign-in with Google accounts
- **Application Form**: 
  - 2 essay questions (500-750 words each)
  - Multiple choice and checkbox questions for experience/preferences
  - Form validation and character counting
- **Admin Dashboard**: 
  - View all submitted applications
  - Export applications to CSV format
  - Admin access control
- **Database Integration**: Cloudflare D1 database for storing applications and user data

## Setup Instructions

### 1. Prerequisites
- Node.js (v18 or higher)
- Cloudflare account
- Google Cloud Console project for OAuth

### 2. Environment Setup

1. **Google OAuth Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-domain.com/api/auth/callback`

2. **Cloudflare Setup**:
   - Install Wrangler CLI: `npm install -g wrangler`
   - Login to Cloudflare: `wrangler login`
   - Create D1 database: `npm run db:create`
   - Note the database ID and update `wrangler.toml`

### 3. Configuration

Update `wrangler.toml` with your actual values:
```toml
[[d1_databases]]
binding = "DB"
database_name = "application-portal-db"
database_id = "your-actual-database-id"

[vars]
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"
AUTH_SECRET = "your-random-auth-secret"
```

### 4. Database Initialization

Initialize the database schema:
```bash
npm run db:init
```

### 5. Admin Setup

Add admin users to the database:
```bash
wrangler d1 execute application-portal-db --command "INSERT INTO admins (email) VALUES ('your-admin-email@example.com')"
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

## Project Structure

```
src/
├── lib/
│   └── auth.ts           # Authentication utilities
├── pages/
│   ├── index.astro       # Landing page
│   ├── dashboard.astro   # User dashboard
│   ├── application.astro # Application form
│   ├── admin.astro       # Admin dashboard
│   └── api/
│       ├── auth/
│       │   ├── google.ts    # Google OAuth initiation
│       │   ├── callback.ts  # OAuth callback handler
│       │   └── logout.ts    # Logout handler
│       ├── submit-application.ts # Form submission handler
│       └── export-csv.ts       # CSV export for admin
└── ...
```

## Database Schema

- **users**: Stores user information from Google OAuth
- **applications**: Stores submitted application forms
- **admins**: Stores admin user emails for access control

## Usage

1. **For Applicants**:
   - Sign in with Google account
   - Complete the application form with essays and questions
   - Submit application (one per user)

2. **For Admins**:
   - Sign in with Google account (must be in admins table)
   - View all submitted applications at `/admin`
   - Export applications to CSV format

## Security Features

- Google OAuth for authentication
- Admin access control via database
- HTTPS cookies for session management
- Input validation and sanitization
- CSRF protection through form handling
