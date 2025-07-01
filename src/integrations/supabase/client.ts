import { createClient } from '@supabase/supabase-js';

// Using same Supabase project as mobile app for real-time sync
// Project: "Dzyre Play app" (hatsyhittlnzingruvwp)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hatsyhittlnzingruvwp.supabase.co';
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdHN5aGl0dGxuemluZ3J1dndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMDExMjAsImV4cCI6MjA2NTY3NzEyMH0.U7I6f8KT9DEjqSHdeHU54IPvzvSVlVZi0hYIpwH3i1E';

if (!import.meta.env.VITE_SUPABASE_SERVICE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Using fallback anon key for unified project. Consider setting VITE_SUPABASE_SERVICE_KEY in .env.local for admin privileges.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // Ensure the key is sent for every request
  global: {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
    },
  },
}); 