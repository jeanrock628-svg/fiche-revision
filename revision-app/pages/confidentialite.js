import { useRouter } from 'next/router';

export default function Confidentialite() {
  const router = useRouter();
  return (
    <div className="page">
      <div className="top-nav">
        <a href="#" onClick={(e) => { e.preventDefault(); router.back(); }}>← Retour</a>
      </div>
      <h1>Confidentialité et données personnelles</h1>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 17 }}>Quelles données sont collectées ?</h2>
        <p>Ton email et ton mot de passe (chiffré) pour créer ton compte ; le contenu des cours que tu ajoutes, ta classe, ta matière, la date de tes examens et la note que tu vises ; ta progression sur chaque notion étudiée.</p>
      </section>

      <section>
        <h2 style={{ fontSize: 17 }}>Pourquoi ces données ?</h2>
        <p>Uniquement pour faire fonctionner le service : analyser ton cours, générer des exercices adaptés à ton niveau, et calculer quand te faire réviser chaque notion. Le contenu de ton cours est envoyé à un service tiers de génération de texte par IA pour cette analyse.</p>
      </section>

      <section>
        <h2 style={{ fontSize: 17 }}>Combien de temps sont-elles gardées ?</h2>
        <p>Tant que ton compte existe. Tu peux supprimer une fiche à tout moment, ou ton compte entier (et toutes les données associées) depuis le tableau de bord.</p>
      </section>

      <section>
        <h2 style={{ fontSize: 17 }}>Tes droits</h2>
        <p>Conformément au RGPD, tu peux à tout moment demander l'accès, la correction ou la suppression de tes données. La suppression de compte depuis le tableau de bord efface tout immédiatement et définitivement.</p>
      </section>

      <section>
        <h2 style={{ fontSize: 17 }}>Partage avec des tiers</h2>
        <p>Aucune donnée n'est vendue. Le texte de tes cours transite par l'API du fournisseur d'IA utilisé pour générer les exercices, uniquement le temps du traitement.</p>
      </section>
    </div>
  );
}
