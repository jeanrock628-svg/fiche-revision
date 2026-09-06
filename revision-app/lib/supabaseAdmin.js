import { createClient } from '@supabase/supabase-js';

// À utiliser UNIQUEMENT côté serveur (jamais importé dans une page React).
// La clé SUPABASE_SERVICE_ROLE_KEY donne un accès total à la base, en
// contournant les règles de sécurité (RLS) — elle ne doit jamais être
// exposée au navigateur.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
