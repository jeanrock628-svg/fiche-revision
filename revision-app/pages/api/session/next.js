import { supabaseForRequest } from '../../../lib/supabaseServer';
import { appellerClaude, extraireJSON } from '../../../lib/anthropic';

const NB_NOTIONS_PAR_SESSION = 4;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const supabase = supabaseForRequest(req);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return res.status(401).send('Non authentifié');

  const { data: cours } = await supabase
    .from('courses')
    .select('id, classe, matiere')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cours) return res.status(404).send('Aucun cours actif');

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
      system: "Tu es un professeur qui génère des exercices courts et ciblés. Adapte la difficulté au niveau indiqué (0 = découverte, 5 = maîtrisé, pose alors une question plus exigeante). Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans balises markdown.",
      messages: [{
        role: 'user',
        content: `Classe : ${cours.classe}. Matière : ${cours.matiere || 'non précisée'}.
Génère exactement un exercice pour chacune des notions suivantes (respecte le champ "index" pour le lier) :
${JSON.stringify(listeNotions)}

Format de réponse exact : {"exercices":[{"index":0,"question":"...","type":"qcm","choix":["...","...","...","..."],"reponse":"...","explication":"phrase courte"}]}
Mélange les types "qcm" (avec 4 choix) et "ouverte" (pas de champ choix, reponse = réponse modèle attendue).`,
      }],
      maxTokens: 1000,
    });

    const { exercices } = extraireJSON(texte);

    const resultat = exercices.map((ex) => {
      const notion = selection[ex.index];
      return {
        notionId: notion.id,
        notionTitre: notion.titre,
        question: ex.question,
        type: ex.type,
        choix: ex.choix || null,
        reponse: ex.reponse,
        explication: ex.explication,
      };
    });

    res.status(200).json({ exercices: resultat });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || 'Erreur serveur');
  }
}
