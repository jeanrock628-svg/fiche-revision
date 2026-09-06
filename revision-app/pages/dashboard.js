import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { couleurMatiere } from '../lib/couleurs';
import MiniGraphique from '../components/MiniGraphique';

const NB_NOTIONS_PAR_SESSION = 4;

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [suppressionCompteEnCours, setSuppressionCompteEnCours] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setUserId(data.session.user.id);
      setAccessToken(data.session.access_token);
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

    const liste = await Promise.all(
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

        const { data: journal } = await supabase
          .from('journal_revisions')
          .select('niveau, created_at')
          .in('notion_id', (notions || []).map((n) => n.id))
          .order('created_at', { ascending: true });

        return { ...c, nbNotions: notions?.length || 0, nbDues: dues, historique: journal || [] };
      })
    );

    setCours(liste);
  }

  function moyenneParJour(historique) {
    if (!historique.length) return [];
    const parJour = {};
    historique.forEach((h) => {
      const jour = h.created_at.split('T')[0];
      if (!parJour[jour]) parJour[jour] = [];
      parJour[jour].push(h.niveau);
    });
    return Object.keys(parJour).sort().map((jour) => {
      const vals = parJour[jour];
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
  }

  function analyseFaisabilite(c) {
    const joursRestants = Math.ceil((new Date(c.date_examen) - new Date()) / (1000 * 60 * 60 * 24));
    if (joursRestants <= 0) return { texte: "La date d'examen est déjà passée.", niveau: 'alerte' };
    if (c.nbNotions === 0) return null;

    const sessionsNecessaires = Math.ceil(c.nbNotions / NB_NOTIONS_PAR_SESSION);
    const semainesRestantes = Math.max(joursRestants / 7, 1 / 7);
    const rythmeConseille = Math.max(1, Math.ceil(sessionsNecessaires / semainesRestantes));

    if (joursRestants < sessionsNecessaires) {
      return {
        texte: `Serré : il faudrait environ ${rythmeConseille} sessions par semaine pour tout voir au moins une fois avant l'examen.`,
        niveau: 'alerte',
      };
    }
    return {
      texte: `Environ ${rythmeConseille} session${rythmeConseille > 1 ? 's' : ''} par semaine suffi${rythmeConseille > 1 ? 'sent' : 't'} pour rester dans les temps.`,
      niveau: 'ok',
    };
  }

  async function supprimerCours(id, nom) {
    const confirme = window.confirm(`Supprimer la fiche "${nom}" ? Toute la progression associée sera perdue définitivement.`);
    if (!confirme) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) { alert('La suppression a échoué : ' + error.message); return; }
    setCours((c) => c.filter((x) => x.id !== id));
  }

  async function supprimerCompte() {
    const confirme = window.confirm("Supprimer définitivement ton compte ? Toutes tes fiches et ta progression seront effacées, sans possibilité de retour en arrière.");
    if (!confirme) return;
    const reconfirme = window.confirm("Vraiment sûr ? Cette action est irréversible.");
    if (!reconfirme) return;

    setSuppressionCompteEnCours(true);
    try {
      const resp = await fetch('/api/compte/supprimer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      alert('La suppression a échoué : ' + err.message);
      setSuppressionCompteEnCours(false);
    }
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
        <div className="card"><p>Tu n'as pas encore de cours à réviser.</p></div>
      )}

      {cours.map((c) => {
        const couleur = couleurMatiere(c.matiere || c.classe);
        const joursRestants = Math.ceil((new Date(c.date_examen) - new Date()) / (1000 * 60 * 60 * 24));
        const faisabilite = analyseFaisabilite(c);
        const historiqueJournalier = moyenneParJour(c.historique);

        return (
          <div className="card" key={c.id} style={{ borderLeft: `4px solid ${couleur}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0, color: couleur }}>{c.matiere || c.classe}</h2>
                <p className="intro" style={{ margin: '4px 0 0' }}>
                  {c.classe} — Examen le {c.date_examen} ({joursRestants > 0 ? `${joursRestants} j.` : 'passé'}) — Objectif {c.note_visee}/20
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }} onClick={() => router.push(`/modifier-cours?courseId=${c.id}`)}>
                  Modifier
                </button>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 13, color: '#96271C', borderColor: '#96271C' }} onClick={() => supprimerCours(c.id, c.matiere || c.classe)}>
                  Supprimer
                </button>
              </div>
            </div>

            {c.nbNotions === 0 ? (
              <p style={{ fontSize: 14, marginTop: 10 }}>Analyse en cours ou en attente...</p>
            ) : (
              <>
                <p style={{ fontSize: 14, marginTop: 10, marginBottom: 4 }}>
                  {c.nbDues} notion{c.nbDues > 1 ? 's' : ''} à travailler aujourd'hui sur {c.nbNotions}.
                </p>
                {faisabilite && (
                  <p style={{ fontSize: 13, marginTop: 0, marginBottom: 10, color: faisabilite.niveau === 'alerte' ? '#96271C' : '#3C7A5C' }}>
                    {faisabilite.texte}
                  </p>
                )}
                {historiqueJournalier.length >= 2 && (
                  <div style={{ marginBottom: 10 }}>
                    <MiniGraphique points={historiqueJournalier} couleur={couleur} />
                  </div>
                )}
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => router.push(`/session?courseId=${c.id}`)}>
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

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #E2DCC9', fontSize: 13, color: '#4A5468' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/confidentialite'); }}>Confidentialité et données personnelles</a>
        {' · '}
        <a href="#" onClick={(e) => { e.preventDefault(); supprimerCompte(); }} style={{ color: '#96271C' }}>
          {suppressionCompteEnCours ? 'Suppression...' : 'Supprimer mon compte'}
        </a>
      </div>
    </div>
  );
}
