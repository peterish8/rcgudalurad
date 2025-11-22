'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error('Missing Supabase environment variables. Please check your .env.local file.')
  }
}

// Create Supabase client - only used on client side
// We don't use Storage, so this avoids buffer polyfill issues
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Disable storage to avoid buffer dependency
    global: {
      headers: {},
    },
  }
)

