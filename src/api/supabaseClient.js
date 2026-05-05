import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Credenciais do Supabase ausentes no .env');
}

// Cria o cliente para interagir com o banco
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
