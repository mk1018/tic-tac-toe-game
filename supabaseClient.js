import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithGoogle() {
  const { user, session, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) {
    console.error('Error signing in with Google:', error.message);
  }
  return { user, session, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({
    scope: 'local'
  });
  if (error) {
    console.error('Error signing out:', error.message);
  }
  return { error };
}
