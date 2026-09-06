import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const CLASSES = ['6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale', 'Enseignement supérieur'];

export default function ModifierCours() {
  const router = useRouter();
  const [cours, setCours] = useState(null);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const { courseId } = router.query;
    if (!courseId) { router.replace('/dashboard'); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      const { data: c, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
      if (error || !c) { router.replace('/dashboard'); return; }
      setCours(c);
    });
  }, [router.isReady]);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    const { error } = await supabase.from('courses').update({
      classe: cours.classe,
      matiere: cours.matiere,
      date_examen: cours.date_examen,
      note_visee: Number(cours.note_visee),
    }).eq('id', cours.id);
    setEnCours(false);
    if (error) { setErreur(error.message); return; }
    router.push('/dashboard');
  }

  if (!cours) return <div className="page"><p>Chargement...</p></div>;

  return (
    <div className="page">
      <div className="top-nav">
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>← Retour</a>
      </div>
      <h1>Modifier la fiche</h1>
      <p className="intro">Le contenu du cours et les notions déjà générées ne changent pas ici — seulement les informations générales.</p>

      <form onSubmit={enregistrer}>
        <div className="field">
          <label>Classe</label>
          <select value={cours.classe} onChange={(e) => setCours({ ...cours, classe: e.target.value })}>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Matière</label>
          <input type="text" value={cours.matiere || ''} onChange={(e) => setCours({ ...cours, matiere: e.target.value })} />
        </div>
        <div className="field">
          <label>Date de l'examen</label>
          <input type="date" value={cours.date_examen} onChange={(e) => setCours({ ...cours, date_examen: e.target.value })} />
        </div>
        <div className="field">
          <label>Note visée sur 20</label>
          <input type="range" min="0" max="20" value={cours.note_visee} onChange={(e) => setCours({ ...cours, note_visee: e.target.value })} />
          <p style={{ textAlign: 'center', margin: 0 }}>{cours.note_visee}/20</p>
        </div>
        {erreur && <p className="error">{erreur}</p>}
        <button className="btn btn-primary" disabled={enCours}>Enregistrer</button>
      </form>
    </div>
  );
}
