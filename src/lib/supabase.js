import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://ripugedrbnmvbbdntxgt.supabase.co'
const fallbackSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcHVnZWRyYm5tdmJiZG50eGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzc3MjMsImV4cCI6MjA4ODU1MzcyM30.k4UMaseYnKGaw9pt5BrfXQvTMPq0hNRdU7yzuYVG0Zs'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Using fallback Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to override.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
