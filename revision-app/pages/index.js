import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Accueil() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' ou 'signup'
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard');
    });
  }, [router]);

  async function valider(e) {
    e.preventDefault();
    setErreur('');
    if (!email || motDePasse.length < 6) {
      setErreur('Entre un email valide et un mot de passe d\'au moins 6 caractères.');
      return;
    }
    setChargement(true);
    const action = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password: motDePasse })
      : supabase.auth.signUp({ email, password: motDePasse });
    const { error } = await action;
    setChargement(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="page">
      <h1>Fiche de révision sur mesure</h1>
      <p className="intro">Un plan de révision qui s'adapte à ton cours, tes difficultés, et le temps qu'il te reste.</p>

      <form onSubmit={valider}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
        </div>
        {erreur && <p className="error">{erreur}</p>}
        <button className="btn btn-primary" disabled={chargement}>
          {chargement ? 'Un instant...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 14 }}>
        {mode === 'login' ? "Pas encore de compte ? " : 'Déjà un compte ? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setErreur(''); }}>
          {mode === 'login' ? "S'inscrire" : 'Se connecter'}
        </a>
      </p>
    </div>
  );
}
