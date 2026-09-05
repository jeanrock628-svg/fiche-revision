import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Session() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [etat, setEtat] = useState('chargement'); // chargement | en_cours | termine | erreur
  const [exercices, setExercices] = useState([]);
  const [index, setIndex] = useState(0);
  const [reponseChoisie, setReponseChoisie] = useState(null);
  const [revele, setRevele] = useState(false);
  const [score, setScore] = useState({ bon: 0, total: 0 });
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setSession(data.session);
      await chargerSession(data.session.access_token);
    });
  }, []);

  async function chargerSession(token) {
    setEtat('chargement');
    try {
      const resp = await fetch('/api/session/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      if (!data.exercices || data.exercices.length === 0) {
        setEtat('vide');
        return;
      }
      setExercices(data.exercices);
      setIndex(0);
      setReponseChoisie(null);
      setRevele(false);
      setScore({ bon: 0, total: 0 });
      setEtat('en_cours');
    } catch (err) {
      console.error(err);
      setErreur('Impossible de préparer la session. Réessaie dans un instant.');
      setEtat('erreur');
    }
  }

  async function repondre(choix) {
    if (revele) return;
    const exo = exercices[index];
    const correct = choix === exo.reponse;
    setReponseChoisie(choix);
    setRevele(true);
    setScore((s) => ({ bon: s.bon + (correct ? 1 : 0), total: s.total + 1 }));

    await fetch('/api/session/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ notionId: exo.notionId, correct }),
    });
  }

  function suivant() {
    if (index + 1 >= exercices.length) {
      setEtat('termine');
      return;
    }
    setIndex(index + 1);
    setReponseChoisie(null);
    setRevele(false);
  }

  if (etat === 'chargement') return <div className="page"><p>Préparation de tes exercices...</p></div>;
  if (etat === 'erreur') return <div className="page"><p className="error">{erreur}</p></div>;
  if (etat === 'vide') return (
    <div className="page">
      <p>Rien à réviser pour l'instant, tout est à jour ! Reviens un peu plus tard.</p>
      <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>Retour au tableau de bord</button>
    </div>
  );
  if (etat === 'termine') return (
    <div className="page">
      <h1>Session terminée</h1>
      <p className="intro">{score.bon} bonne{score.bon > 1 ? 's' : ''} réponse{score.bon > 1 ? 's' : ''} sur {score.total}.</p>
      <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>Retour au tableau de bord</button>
    </div>
  );

  const exo = exercices[index];

  return (
    <div className="page">
      <div className="top-nav">
        <span style={{ fontSize: 14, color: '#4A5468' }}>{index + 1} / {exercices.length}</span>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>Quitter</a>
      </div>
      <div className="card">
        <p style={{ fontSize: 13, color: '#4A5468', marginTop: 0 }}>{exo.notionTitre}</p>
        <p style={{ fontWeight: 500 }}>{exo.question}</p>
        {exo.choix ? (
          exo.choix.map((c, i) => {
            let cls = 'choice';
            if (revele && c === exo.reponse) cls += ' correct';
            else if (revele && c === reponseChoisie) cls += ' wrong';
            return <button key={i} className={cls} onClick={() => repondre(c)}>{c}</button>;
          })
        ) : (
          !revele && <button className="btn btn-secondary" onClick={() => repondre(exo.reponse)}>Voir la réponse modèle</button>
        )}
        {revele && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2DCC9', fontSize: 14, color: '#4A5468' }}>
            {!exo.choix && <p><strong>Réponse attendue :</strong> {exo.reponse}</p>}
            {exo.explication}
          </div>
        )}
      </div>
      {revele && <button className="btn btn-primary" onClick={suivant}>Suivant</button>}
    </div>
  );
}
