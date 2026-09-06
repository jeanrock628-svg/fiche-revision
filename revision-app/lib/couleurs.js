// Attribue une couleur stable à chaque matière, pour donner un repère visuel
// constant qui aide à "rentrer" dans le bon contexte mental en changeant de
// fiche (effet de mémoire contextuelle : un repère visuel cohérent facilite
// le rappel des connaissances associées).

const PALETTE = ['#C1392B', '#3B5B84', '#3C7A5C', '#8A5A9E', '#B9822F', '#4A6FA5'];

export function couleurMatiere(nom) {
  const texte = nom || 'default';
  let hash = 0;
  for (let i = 0; i < texte.length; i++) {
    hash = texte.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
