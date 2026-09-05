// Ce fichier n'est jamais importé depuis une page ou un composant React :
// il n'est appelé que depuis pages/api/*, qui s'exécutent côté serveur.
// La clé GEMINI_API_KEY n'atteint donc jamais le navigateur de l'élève.

export async function appellerClaude({ system, messages, maxTokens = 1000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modele = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Gemini (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  const texte = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('\n');
  return texte;
}

export function extraireJSON(texte) {
  const start = texte.indexOf('{');
  const end = texte.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Aucun JSON trouvé dans la réponse du modèle.');
  return JSON.parse(texte.slice(start, end + 1));
}
