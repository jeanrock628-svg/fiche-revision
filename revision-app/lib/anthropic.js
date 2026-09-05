// Ce fichier n'est jamais importé depuis une page ou un composant React :
// il n'est appelé que depuis pages/api/*, qui s'exécutent côté serveur.
// La clé GROQ_API_KEY n'atteint donc jamais le navigateur de l'élève.

export async function appellerClaude({ system, messages, maxTokens = 1000 }) {
  const apiKey = process.env.GROQ_API_KEY;
  const modele = 'llama-3.3-70b-versatile';

  const messagesFormates = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modele,
      messages: messagesFormates,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Groq (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Extrait un objet JSON même si le modèle a ajouté un peu de texte autour.
export function extraireJSON(texte) {
  const start = texte.indexOf('{');
  const end = texte.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Aucun JSON trouvé dans la réponse du modèle.');
  return JSON.parse(texte.slice(start, end + 1));
}
