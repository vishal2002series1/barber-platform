import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ REPLACE THESE WITH YOUR ACTUAL KEYS FROM SUPABASE DASHBOARD
const SUPABASE_URL = 'https://nplvmdwccdteicvuaram.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PuwzMkYg6y1T9PD2XSY9FA_FQKRSI7p';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});