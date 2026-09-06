import { createClient } from '@supabase/supabase-js';

// Crée un client Supabase "au nom de" l'élève connecté, à partir du token
// envoyé par le navigateur. Grâce à ça, les règles de sécurité (RLS) de la
// base de données s'appliquent normalement : un élève ne peut lire/écrire
// que ses propres données, même si quelqu'un essaie de bidouiller les appels.
export function supabaseForRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}
