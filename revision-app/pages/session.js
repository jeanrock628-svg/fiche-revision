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
  const [reponseTexte, setReponseTexte] = useState('');
  const [revele, setRevele] = useState(false);
  const [noteDonnee, setNoteDonnee] = useState(false);
  const [etapeLecon, setEtapeLecon] = useState(true);
  const [score, setScore] = useState({ bon: 0, total: 0 });
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const { courseId } = router.query;
    if (!courseId) { router.replace('/dashboard'); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setSession(data.session);
      await chargerSession(data.session.access_token, courseId);
    });
  }, [router.isReady]);

  async function chargerSession(token, courseId) {
    setEtat('chargement');
    try {
      const resp = await fetch('/api/session/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      if (!data.exercices || data.exercices.length === 0) {
        setEtat('vide');
        return;
      }
      setExercices(data.exercices);
      reinitialiserExercice();
      setScore({ bon: 0, total: 0 });
      setEtat('en_cours');
    } catch (err) {
      console.error(err);
      setErreur('Impossible de préparer la session. Réessaie dans un instant.');
      setEtat('erreur');
    }
  }

  function reinitialiserExercice() {
    setIndex(0);
    setReponseChoisie(null);
    setReponseTexte('');
    setRevele(false);
    setNoteDonnee(false);
    setEtapeLecon(true);
  }

  async function envoyerResultat(notionId, correct) {
    await fetch('/api/session/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ notionId, correct }),
    });
  }

  // QCM : on connaît la bonne réponse immédiatement, donc on note tout de suite.
  async function repondreQCM(choix) {
    if (revele) return;
    const exo = exercices[index];
    const correct = choix === exo.reponse;
    setReponseChoisie(choix);
    setRevele(true);
    setNoteDonnee(true);
    setScore((s) => ({ bon: s.bon + (correct ? 1 : 0), total: s.total + 1 }));
    await envoyerResultat(exo.notionId, correct);
  }

  // Question ouverte : on affiche d'abord la correction, puis l'élève s'auto-évalue.
  function voirCorrection() {
    setRevele(true);
  }

  async function autoEvaluer(correct) {
    if (noteDonnee) return;
    setNoteDonnee(true);
    setScore((s) => ({ bon: s.bon + (correct ? 1 : 0), total: s.total + 1 }));
    await envoyerResultat(exercices[index].notionId, correct);
  }

  function suivant() {
    if (index + 1 >= exercices.length) {
      setEtat('termine');
      return;
    }
    setIndex(index + 1);
    setReponseChoisie(null);
    setReponseTexte('');
    setRevele(false);
    setNoteDonnee(false);
    setEtapeLecon(true);
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
  const estQCM = !!exo.choix;

  return (
    <div className="page">
      <div className="top-nav">
        <span style={{ fontSize: 14, color: '#4A5468' }}>{index + 1} / {exercices.length}</span>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>Quitter</a>
      </div>
      <div className="card">
        <p style={{ fontSize: 13, color: '#4A5468', marginTop: 0 }}>{exo.notionTitre}</p>

        {etapeLecon ? (
          <>
            <p style={{ fontWeight: 500, marginBottom: 6 }}>Le cours</p>
            <p style={{ lineHeight: 1.6 }}>{exo.lecon}</p>
            {exo.memo && (
              <div style={{ background: 'rgba(193,57,43,0.08)', border: '1px solid rgba(193,57,43,0.3)', borderRadius: 4, padding: 12, marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 14 }}><strong>🧠 Astuce pour retenir :</strong> {exo.memo}</p>
              </div>
            )}
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setEtapeLecon(false)}>
              Passer à l'exercice
            </button>
          </>
        ) : (
        <>
        <p style={{ fontWeight: 500 }}>{exo.question}</p>

        {estQCM ? (
          exo.choix.map((c, i) => {
            let cls = 'choice';
            if (revele && c === exo.reponse) cls += ' correct';
            else if (revele && c === reponseChoisie) cls += ' wrong';
            return <button key={i} className={cls} onClick={() => repondreQCM(c)}>{c}</button>;
          })
        ) : (
          <>
            {!revele && (
              <>
                <textarea
                  value={reponseTexte}
                  onChange={(e) => setReponseTexte(e.target.value)}
                  placeholder="Écris ta réponse ici..."
                  style={{ minHeight: 90 }}
                />
                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={voirCorrection}>
                  Voir la correction
                </button>
              </>
            )}
            {revele && (
              <div style={{ fontSize: 14 }}>
                <p style={{ color: '#4A5468' }}>
                  <strong>Ta réponse :</strong> {reponseTexte.trim() ? reponseTexte : <em>(rien écrit)</em>}
                </p>
              </div>
            )}
          </>
        )}

        {revele && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2DCC9', fontSize: 14, color: '#4A5468' }}>
            {!estQCM && <p><strong>Réponse attendue :</strong> {exo.reponse}</p>}
            <p style={{ margin: 0 }}>{exo.explication}</p>
          </div>
        )}

        {revele && !estQCM && !noteDonnee && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 13, color: '#4A5468', marginBottom: 8 }}>Sois honnête, ça sert juste à adapter tes prochaines révisions :</p>
            <button className="btn btn-secondary" style={{ marginRight: 8 }} onClick={() => autoEvaluer(true)}>J'avais juste</button>
            <button className="btn btn-secondary" onClick={() => autoEvaluer(false)}>Je n'avais pas trouvé</button>
          </div>
        )}
        </>
        )}
      </div>

      {noteDonnee && <button className="btn btn-primary" onClick={suivant}>Suivant</button>}
    </div>
  );
}
