import { supabaseForRequest } from '../../../lib/supabaseServer';

// Intervalles de révision en jours selon le niveau de maîtrise (0 à 5).
const INTERVALLES = [0, 1, 2, 4, 7, 14];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const supabase = supabaseForRequest(req);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return res.status(401).send('Non authentifié');

  const { notionId, correct } = req.body;
  if (!notionId) return res.status(400).send('notionId manquant');

  const { data: existant } = await supabase
    .from('notion_progress')
    .select('*')
    .eq('notion_id', notionId)
    .eq('user_id', userId)
    .maybeSingle();

  const niveauActuel = existant ? existant.niveau : 0;
  const nouveauNiveau = correct
    ? Math.min(5, niveauActuel + 1)
    : Math.max(0, niveauActuel - 1);

  const jours = INTERVALLES[nouveauNiveau];
  const prochaineDate = new Date();
  prochaineDate.setDate(prochaineDate.getDate() + jours);

  const { error } = await supabase.from('notion_progress').upsert({
    notion_id: notionId,
    user_id: userId,
    niveau: nouveauNiveau,
    prochaine_revision: prochaineDate.toISOString().split('T')[0],
    nb_revisions: (existant?.nb_revisions || 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'notion_id,user_id' });

  if (error) return res.status(500).send(error.message);

  await supabase.from('journal_revisions').insert({
    notion_id: notionId,
    user_id: userId,
    niveau: nouveauNiveau,
    correct: !!correct,
  });

  res.status(200).json({ ok: true, niveau: nouveauNiveau });
}
