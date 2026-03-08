import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ripugedrbnmvbbdntxgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcHVnZWRyYm5tdmJiZG50eGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzc3MjMsImV4cCI6MjA4ODU1MzcyM30.k4UMaseYnKGaw9pt5BrfXQvTMPq0hNRdU7yzuYVG0Zs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
