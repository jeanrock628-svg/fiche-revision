import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const CLASSES = ['6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale', 'Enseignement supérieur'];

export default function NouveauCours() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [classe, setClasse] = useState('Terminale');
  const [matiere, setMatiere] = useState('');
  const [dateExamen, setDateExamen] = useState('');
  const [noteVisee, setNoteVisee] = useState(14);
  const [texteCours, setTexteCours] = useState('');
  const [etape, setEtape] = useState('formulaire'); // formulaire | analyse | erreur
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setSession(data.session);
    });
  }, []);

  const peutValider = classe && dateExamen && texteCours.trim().length > 20;

  async function creerCours(e) {
    e.preventDefault();
    setErreur('');
    setEtape('analyse');
    try {
      const { data: coursData, error: coursErr } = await supabase
        .from('courses')
        .insert({
          user_id: session.user.id,
          classe,
          matiere,
          date_examen: dateExamen,
          note_visee: Number(noteVisee),
          texte_cours: texteCours,
        })
        .select()
        .single();

      if (coursErr) throw coursErr;

      const resp = await fetch('/api/notions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId: coursData.id }),
      });
      if (!resp.ok) throw new Error(await resp.text());

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setErreur(`Erreur : ${err.message}`);
      setEtape('erreur');
    }
  }

  if (etape === 'analyse') {
    return <div className="page"><p>Analyse du cours et découpage en notions à réviser...</p></div>;
  }

  return (
    <div className="page">
      <div className="top-nav">
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>← Retour</a>
      </div>
      <h1>Nouveau cours</h1>
      <p className="intro">Colle le contenu de ton cours : il sera découpé automatiquement en petites notions à réviser une par une.</p>

      <form onSubmit={creerCours}>
        <div className="field">
          <label>Classe</label>
          <select value={classe} onChange={(e) => setClasse(e.target.value)}>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Matière</label>
          <input type="text" value={matiere} onChange={(e) => setMatiere(e.target.value)} placeholder="Ex. Mathématiques" />
        </div>
        <div className="field">
          <label>Date de l'examen</label>
          <input type="date" value={dateExamen} onChange={(e) => setDateExamen(e.target.value)} />
        </div>
        <div className="field">
          <label>Note visée sur 20</label>
          <input type="range" min="0" max="20" value={noteVisee} onChange={(e) => setNoteVisee(e.target.value)} />
          <p style={{ textAlign: 'center', margin: 0 }}>{noteVisee}/20</p>
        </div>
        <div className="field">
          <label>Le cours</label>
          <textarea value={texteCours} onChange={(e) => setTexteCours(e.target.value)} placeholder="Colle ici le contenu de ton cours..." />
        </div>
        {erreur && <p className="error">{erreur}</p>}
        <button className="btn btn-primary" disabled={!peutValider}>Analyser mon cours</button>
      </form>
    </div>
  );
}
