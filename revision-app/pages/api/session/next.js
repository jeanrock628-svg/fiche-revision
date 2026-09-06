import { supabaseForRequest } from '../../../lib/supabaseServer';
import { appellerClaude, extraireJSON } from '../../../lib/anthropic';

const NB_NOTIONS_PAR_SESSION = 4;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const supabase = supabaseForRequest(req);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return res.status(401).send('Non authentifié');

  const { courseId } = req.body;
  if (!courseId) return res.status(400).send('courseId manquant');

  const { data: cours } = await supabase
    .from('courses')
    .select('id, classe, matiere')
    .eq('user_id', userId)
    .eq('id', courseId)
    .maybeSingle();
  if (!cours) return res.status(404).send('Cours introuvable');

  const { data: usage } = await supabase.from('api_usage').select('derniere_session').eq('user_id', userId).maybeSingle();
  if (usage?.derniere_session && Date.now() - new Date(usage.derniere_session).getTime() < 5_000) {
    return res.status(429).send('Merci de patienter quelques secondes avant une nouvelle session.');
  }

  const { data: notions } = await supabase
    .from('notions')
    .select('id, titre, description, notion_progress(niveau, prochaine_revision)')
    .eq('course_id', cours.id);

  const aujourdHui = new Date().toISOString().split('T')[0];

  const dues = notions.filter((n) => {
    const p = n.notion_progress?.[0];
    return p && p.prochaine_revision <= aujourdHui && p.niveau < 5;
  }).sort((a, b) => a.notion_progress[0].niveau - b.notion_progress[0].niveau);

  const nonVues = notions.filter((n) => !n.notion_progress || n.notion_progress.length === 0);

  const selection = [...dues, ...nonVues].slice(0, NB_NOTIONS_PAR_SESSION);

  if (selection.length === 0) return res.status(200).json({ exercices: [] });

  try {
    const listeNotions = selection.map((n, i) => ({
      index: i,
      titre: n.titre,
      description: n.description,
      niveau: n.notion_progress?.[0]?.niveau ?? 0,
    }));

    const texte = await appellerClaude({
      system: "Tu es un professeur qui prépare une mini-leçon puis un exercice ciblé pour chaque notion. Adapte le niveau de détail et la difficulté de l'exercice au niveau indiqué (0 = découverte, 5 = maîtrisé, pose alors une question plus exigeante). Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans balises markdown.",
      messages: [{
        role: 'user',
        content: `Classe : ${cours.classe}. Matière : ${cours.matiere || 'non précisée'}.
Pour chacune des notions suivantes (respecte le champ "index" pour lier ta réponse) :
${JSON.stringify(listeNotions)}

Génère, pour chaque notion :
1. Une leçon détaillée et claire (plusieurs phrases, avec un exemple concret) qui explique vraiment la notion, pas juste un rappel d'une ligne.
2. Un moyen mnémotechnique (astuce, image mentale, acronyme...) pour aider à retenir cette notion.
3. Un exercice adapté au niveau indiqué.

Format de réponse exact :
{"exercices":[{"index":0,"lecon":"leçon détaillée sur plusieurs phrases","memo":"astuce mnémotechnique courte","question":"...","type":"qcm","choix":["...","...","...","..."],"reponse":"...","explication":"phrase courte"}]}
Mélange les types "qcm" (avec 4 choix) et "ouverte" (pas de champ choix, reponse = réponse modèle attendue).`,
      }],
      maxTokens: 3500,
    });

    const { exercices } = extraireJSON(texte);

    const resultat = exercices.map((ex) => {
      const notion = selection[ex.index];
      return {
        notionId: notion.id,
        notionTitre: notion.titre,
        lecon: ex.lecon,
        memo: ex.memo,
        question: ex.question,
        type: ex.type,
        choix: ex.choix || null,
        reponse: ex.reponse,
        explication: ex.explication,
      };
    });

    await supabase.from('api_usage').upsert({ user_id: userId, derniere_session: new Date().toISOString() });
    res.status(200).json({ exercices: resultat });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || 'Erreur serveur');
  }
}
