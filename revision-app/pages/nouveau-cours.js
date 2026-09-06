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
  const [coursMode, setCoursMode] = useState('texte');
  const [coursTexte, setCoursTexte] = useState('');
  const [fichier, setFichier] = useState(null); // { name, base64 }
  const [etape, setEtape] = useState('formulaire'); // formulaire | extraction | analyse | erreur
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/'); return; }
      setSession(data.session);
    });
  }, []);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setFichier({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
  }

  const peutValider = classe && dateExamen &&
    ((coursMode === 'texte' && coursTexte.trim().length > 20) || (coursMode === 'pdf' && fichier));

  async function creerCours(e) {
    e.preventDefault();
    setErreur('');

    let texteFinal = coursTexte;

    if (coursMode === 'pdf') {
      setEtape('extraction');
      try {
        const resp = await fetch('/api/notions/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: fichier.base64 }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        texteFinal = data.texte;
      } catch (err) {
        console.error(err);
        setErreur(`Erreur d'extraction du PDF : ${err.message}`);
        setEtape('erreur');
        return;
      }
    }

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
          texte_cours: texteFinal,
        })
        .select()
        .single();
      if (coursErr) throw coursErr;

      const resp = await fetch('/api/notions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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

  if (etape === 'extraction') return <div className="page"><p>Lecture du PDF...</p></div>;
  if (etape === 'analyse') return <div className="page"><p>Analyse du cours et découpage en notions à réviser...</p></div>;

  return (
    <div className="page">
      <div className="top-nav">
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>← Retour</a>
      </div>
      <h1>Nouveau cours</h1>
      <p className="intro">Colle ton cours ou importe un PDF : il sera découpé automatiquement en petites notions à réviser une par une.</p>

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
          <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
            <button type="button" className={coursMode === 'texte' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ width: 'auto', flex: 1 }} onClick={() => setCoursMode('texte')}>Coller le texte</button>
            <button type="button" className={coursMode === 'pdf' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ width: 'auto', flex: 1 }} onClick={() => setCoursMode('pdf')}>Importer un PDF</button>
          </div>
          {coursMode === 'texte' ? (
            <textarea value={coursTexte} onChange={(e) => setCoursTexte(e.target.value)} placeholder="Colle ici le contenu de ton cours..." />
          ) : (
            <div style={{ border: '1px dashed #C9C2B0', borderRadius: 4, padding: 20, textAlign: 'center' }}>
              <input type="file" accept="application/pdf" onChange={handleFile} />
              {fichier && <p style={{ fontSize: 13, marginTop: 8 }}>{fichier.name}</p>}
            </div>
          )}
        </div>

        {erreur && <p className="error">{erreur}</p>}
        <button className="btn btn-primary" disabled={!peutValider}>Analyser mon cours</button>
      </form>
    </div>
  );
}
