import { supabaseForRequest } from '../../../lib/supabaseServer';
import { appellerClaude, extraireJSON } from '../../../lib/anthropic';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { courseId } = req.body;
  if (!courseId) return res.status(400).send('courseId manquant');

  const supabase = supabaseForRequest(req);

  const { data: cours, error: coursErr } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (coursErr || !cours) return res.status(404).send('Cours introuvable');

  const userId = cours.user_id;

  // Anti-abus : au moins 60 secondes entre deux analyses de cours par élève.
  const { data: usage } = await supabase.from('api_usage').select('derniere_generation_cours').eq('user_id', userId).maybeSingle();
  if (usage?.derniere_generation_cours && Date.now() - new Date(usage.derniere_generation_cours).getTime() < 60_000) {
    return res.status(429).send('Merci de patienter une minute avant une nouvelle analyse de cours.');
  }

  try {
    const texte = await appellerClaude({
      system: "Tu es un professeur qui découpe un cours en petites notions indépendantes, testables une par une. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans balises markdown.",
      messages: [{
        role: 'user',
        content: `Classe : ${cours.classe}. Matière : ${cours.matiere || 'non précisée'}.
Voici le cours :
"""${cours.texte_cours}"""

Découpe ce cours en 5 à 8 notions distinctes et testables séparément.
Réponds avec ce format exact : {"notions":[{"titre":"titre court","description":"1 phrase expliquant ce qu'il faut savoir faire sur cette notion"}]}`,
      }],
      maxTokens: 1000,
    });

    const { notions } = extraireJSON(texte);
    if (!Array.isArray(notions) || notions.length === 0) throw new Error('Aucune notion générée');

    const lignes = notions.map((n, i) => ({
      course_id: courseId,
      titre: n.titre,
      description: n.description,
      ordre: i,
    }));

    const { error: insertErr } = await supabase.from('notions').insert(lignes);
    if (insertErr) throw insertErr;

    await supabase.from('api_usage').upsert({ user_id: userId, derniere_generation_cours: new Date().toISOString() });

    res.status(200).json({ ok: true, count: lignes.length });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || 'Erreur serveur');
  }
}
