import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { couleurMatiere } from '../lib/couleurs';

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setUserId(data.session.user.id);
      await chargerCours(data.session.user.id);
      setChargement(false);
    });
  }, []);

  async function chargerCours(uid) {
    const { data: coursData } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    const listeAvecNotions = await Promise.all(
      (coursData || []).map(async (c) => {
        const { data: notions } = await supabase
          .from('notions')
          .select('id, notion_progress(niveau, prochaine_revision)')
          .eq('course_id', c.id);
        const aujourdHui = new Date().toISOString().split('T')[0];
        const dues = (notions || []).filter((n) => {
          const p = n.notion_progress?.[0];
          return !p || (p.prochaine_revision <= aujourdHui && p.niveau < 5);
        }).length;
        return { ...c, nbNotions: notions?.length || 0, nbDues: dues };
      })
    );

    setCours(listeAvecNotions);
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (chargement) return <div className="page">Chargement...</div>;

  return (
    <div className="page">
      <div className="top-nav">
        <strong>Mes fiches de révision</strong>
        <a href="#" onClick={(e) => { e.preventDefault(); deconnexion(); }}>Se déconnecter</a>
      </div>

      {cours.length === 0 && (
        <div className="card">
          <p>Tu n'as pas encore de cours à réviser.</p>
        </div>
      )}

      {cours.map((c) => {
        const couleur = couleurMatiere(c.matiere || c.classe);
        const joursRestants = Math.ceil((new Date(c.date_examen) - new Date()) / (1000 * 60 * 60 * 24));
        return (
          <div className="card" key={c.id} style={{ borderLeft: `4px solid ${couleur}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0, color: couleur }}>{c.matiere || c.classe}</h2>
                <p className="intro" style={{ margin: '4px 0 0' }}>
                  {c.classe} — Examen le {c.date_examen} ({joursRestants > 0 ? `${joursRestants} j.` : 'passé'}) — Objectif {c.note_visee}/20
                </p>
              </div>
            </div>

            {c.nbNotions === 0 ? (
              <p style={{ fontSize: 14, marginTop: 10 }}>Analyse en cours ou en attente...</p>
            ) : (
              <>
                <p style={{ fontSize: 14, marginTop: 10 }}>
                  {c.nbDues} notion{c.nbDues > 1 ? 's' : ''} à travailler aujourd'hui sur {c.nbNotions}.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto' }}
                  onClick={() => router.push(`/session?courseId=${c.id}`)}
                >
                  Réviser cette fiche
                </button>
              </>
            )}
          </div>
        );
      })}

      <button className="btn btn-secondary" style={{ marginTop: 6 }} onClick={() => router.push('/nouveau-cours')}>
        + Ajouter une nouvelle fiche
      </button>

      {cours.length > 1 && (
        <p style={{ fontSize: 13, color: '#4A5468', marginTop: 20 }}>
          Astuce : mieux vaut terminer une session sur une fiche avant de passer à une autre — changer de matière en plein milieu d'une révision fait perdre en concentration.
        </p>
      )}
    </div>
  );
}
