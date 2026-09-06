export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { base64 } = req.body;
  if (!base64) return res.status(400).send('Fichier manquant');

  try {
    // Import différé : pdf-parse doit être chargé côté serveur uniquement.
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = Buffer.from(base64, 'base64');
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length < 20) {
      return res.status(422).send("Le PDF ne contient pas assez de texte exploitable (peut-être un scan sans OCR).");
    }
    res.status(200).json({ texte: data.text });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || "Impossible de lire ce PDF.");
  }
}
