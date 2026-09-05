// Ce fichier n'est jamais importé depuis une page ou un composant React :
// il n'est appelé que depuis pages/api/*, qui s'exécutent côté serveur.
// La clé ANTHROPIC_API_KEY n'atteint donc jamais le navigateur de l'élève.

export async function appellerClaude({ system, messages, maxTokens = 1000 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Anthropic (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  const texte = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return texte;
}

// Extrait un objet JSON même si le modèle a ajouté un peu de texte autour.
export function extraireJSON(texte) {
  const start = texte.indexOf('{');
  const end = texte.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Aucun JSON trouvé dans la réponse du modèle.');
  return JSON.parse(texte.slice(start, end + 1));
}
