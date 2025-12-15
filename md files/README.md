# RCGudalur Admin Website

Admin dashboard for managing content (Events, Gallery, Board Members) for the Rotary Club of Gudalur Garden City website.

## Features

- ✅ Authentication with Supabase Auth
- ✅ Protected routes (requires login)
- ✅ CRUD operations for Events, Gallery, and Board Members
- ✅ Light/Dark mode toggle
- ✅ Responsive design (desktop and tablet)
- ✅ Real-time updates (changes reflect immediately on main website)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account with project set up
- Admin user created in Supabase Authentication

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://itpfmhdijkroccvcguro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Structure

### Tables

1. **events** - Event information
   - `id` (uuid, primary key)
   - `title` (text, required)
   - `description` (text, optional)
   - `event_date` (date, required)
   - `image_url` (text, optional)
   - `created_at` (timestamp)

2. **gallery** - Gallery images
   - `id` (uuid, primary key)
   - `title` (text, required)
   - `description` (text, optional)
   - `image_url` (text, required)
   - `created_at` (timestamp)

3. **board_members** - Board member information
   - `id` (uuid, primary key)
   - `name` (text, required)
   - `designation` (text, required)
   - `created_at` (timestamp)

### Row Level Security (RLS)

All tables have RLS policies applied:
- ✅ Public SELECT (anyone can read)
- ✅ Authenticated INSERT (only logged-in admins can create)
- ✅ Authenticated UPDATE (only logged-in admins can update)
- ✅ Authenticated DELETE (only logged-in admins can delete)

## Pages

- `/login` - Login page
- `/dashboard` - Dashboard with overview and navigation
- `/events` - Manage events (CRUD)
- `/gallery` - Manage gallery images (CRUD)
- `/board-members` - Manage board members (CRUD)

## Authentication

1. Admin logs in with email/password via Supabase Auth
2. JWT token is stored in browser
3. All database requests automatically include the JWT token
4. Supabase RLS policies check authentication status
5. Protected routes redirect to login if not authenticated

## Building for Production

```bash
npm run build
npm start
```

## Notes

- This admin website connects to the same Supabase database as the main public website
- Changes made in the admin website reflect immediately on the main website
- RLS policies are enforced at the database level
- Authentication is token-based and works across different websites using the same Supabase project

