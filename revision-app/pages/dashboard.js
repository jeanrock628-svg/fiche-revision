import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [cours, setCours] = useState(null);
  const [notions, setNotions] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setSession(data.session);
      await chargerCours(data.session.user.id);
      setChargement(false);
    });
  }, []);

  async function chargerCours(userId) {
    const { data: coursData } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setCours(coursData || null);
    if (!coursData) return;

    const { data: notionsData } = await supabase
      .from('notions')
      .select('id, titre, notion_progress(niveau, prochaine_revision)')
      .eq('course_id', coursData.id);

    setNotions(notionsData || []);
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (chargement) return <div className="page">Chargement...</div>;

  const joursRestants = cours
    ? Math.ceil((new Date(cours.date_examen) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const notionsDues = notions.filter((n) => {
    const p = n.notion_progress?.[0];
    return !p || new Date(p.prochaine_revision) <= new Date();
  }).length;

  return (
    <div className="page">
      <div className="top-nav">
        <strong>Fiche de révision</strong>
        <a href="#" onClick={(e) => { e.preventDefault(); deconnexion(); }}>Se déconnecter</a>
      </div>

      {!cours ? (
        <div className="card">
          <p>Tu n'as pas encore de cours à réviser.</p>
          <button className="btn btn-primary" onClick={() => router.push('/nouveau-cours')}>
            Ajouter un cours
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <h1 style={{ fontSize: 20 }}>{cours.matiere || cours.classe}</h1>
            <p className="intro">
              Examen le {cours.date_examen} — {joursRestants} jour{joursRestants > 1 ? 's' : ''} restant{joursRestants > 1 ? 's' : ''}.
              Objectif : {cours.note_visee}/20.
            </p>
            {notions.length === 0 ? (
              <p>Le cours est en cours d'analyse. Reviens dans un instant ou relance l'analyse depuis "Ajouter un cours".</p>
            ) : (
              <>
                <p>{notionsDues} notion{notionsDues > 1 ? 's' : ''} à travailler aujourd'hui sur {notions.length}.</p>
                <button className="btn btn-primary" onClick={() => router.push('/session')}>
                  Commencer une session
                </button>
              </>
            )}
          </div>

          {notions.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 16 }}>Détail des notions</h2>
              {notions.map((n) => {
                const p = n.notion_progress?.[0];
                const niveau = p ? p.niveau : 0;
                return (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                    <span>{n.titre}</span>
                    <span style={{ color: '#4A5468' }}>{niveau}/5</span>
                  </div>
                );
              })}
            </div>
          )}

          <button className="btn btn-secondary" onClick={() => router.push('/nouveau-cours')}>
            Remplacer par un nouveau cours
          </button>
        </>
      )}
    </div>
  );
}
