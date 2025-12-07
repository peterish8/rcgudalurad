# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Environment Variables

Your `.env.local` file should already be set up with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://itpfmhdijkroccvcguro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 First Login

1. Make sure you have an admin user created in Supabase:
   - Go to Supabase Dashboard → Authentication → Users
   - Create a new user with email and password

2. Login to the admin website with those credentials

3. You'll be redirected to the dashboard

## 📋 Available Pages

- **Login** (`/login`) - Admin authentication
- **Dashboard** (`/dashboard`) - Overview and navigation
- **Events** (`/events`) - Manage events
- **Gallery** (`/gallery`) - Manage gallery images
- **Board Members** (`/board-members`) - Manage board members

## ✨ Features

- ✅ Full CRUD operations for all content types
- ✅ Light/Dark mode toggle (persists preference)
- ✅ Responsive design
- ✅ Search functionality
- ✅ Form validation
- ✅ Confirmation dialogs for deletions
- ✅ Real-time updates (changes reflect on main website)

## 🛠️ Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Failed to login"
- Verify admin user exists in Supabase Authentication
- Check email and password are correct
- Ensure RLS policies are applied in Supabase

### "Operation denied" when creating/editing
- Make sure you're logged in
- Verify RLS policies allow authenticated users to INSERT/UPDATE/DELETE

## 📝 Notes

- All changes made in the admin website will immediately appear on the main public website
- The admin website uses the same Supabase database as the main website
- RLS policies are enforced at the database level

