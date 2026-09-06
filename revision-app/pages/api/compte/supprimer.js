import { supabaseForRequest } from '../../../lib/supabaseServer';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = supabaseForRequest(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return res.status(401).send('Non authentifié');

  try {
    // Supprime le compte auth ; les cours, notions, progression et journal
    // partent en cascade grâce aux clés étrangères "on delete cascade".
    const admin = supabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || 'Erreur serveur');
  }
}
