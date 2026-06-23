import { createClient } from '@supabase/supabase-js';
import { createSsrSafeStorage } from '@/utils/ssrStorage';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://hakcsqntzxjtuzqwsuzr.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhha2NzcW50enhqdHV6cXdzdXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE1MTAsImV4cCI6MjA5Nzc5NzUxMH0.sP5OecO7pkMHXUukhMVeah5cS6sHNi24_FnwZwvsp68';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSsrSafeStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
