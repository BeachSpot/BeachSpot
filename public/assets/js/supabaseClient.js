import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Cole aqui a URL e a Chave Pública (Anon Key) do seu projeto Supabase.
// Você encontra isso em: Configurações do Projeto > API
const supabaseUrl = 'https://ncabatizzzpxctqsbxpd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYWJhdGl6enpweGN0cXNieHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Mjk2MjUsImV4cCI6MjA3MzEwNTYyNX0.U9BjtKL53pgVRqFRM7fJEiFuPsEx-8WlE7dfPgJ_KOQ';

// Exporta o cliente Supabase para ser usado em outros arquivos.
export const supabase = createClient(supabaseUrl, supabaseKey);