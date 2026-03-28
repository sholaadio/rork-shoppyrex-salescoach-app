import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dxlvsnlsvmowzozprlhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bHZzbmxzdm1vd3pvenBybGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE4NzEsImV4cCI6MjA4ODM4Nzg3MX0.2MBhu7F0px0DDO6XF783sJ6zf2MkR6KqS2paOftMV_c';

console.log('[Supabase] Initializing client with URL:', SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
