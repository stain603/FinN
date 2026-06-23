import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://hakcsqntzxjtuzqwsuzr.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhha2NzcW50enhqdHV6cXdzdXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE1MTAsImV4cCI6MjA5Nzc5NzUxMH0.sP5OecO7pkMHXUukhMVeah5cS6sHNi24_FnwZwvsp68';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
