// Mini graphique en ligne (sparkline), sans dépendance externe.
// points : tableau de nombres (ex. niveau moyen par jour).
export default function MiniGraphique({ points, couleur = '#3B5B84', hauteur = 40, largeur = 160 }) {
  if (!points || points.length < 2) {
    return <p style={{ fontSize: 12, color: '#4A5468' }}>Pas encore assez d'historique pour un graphique.</p>;
  }
  const max = Math.max(...points, 5);
  const min = Math.min(...points, 0);
  const echelle = max - min || 1;
  const pas = largeur / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * pas;
    const y = hauteur - ((p - min) / echelle) * hauteur;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur}`} width={largeur} height={hauteur}>
      <polyline points={coords.join(' ')} fill="none" stroke={couleur} strokeWidth="2" />
    </svg>
  );
}
