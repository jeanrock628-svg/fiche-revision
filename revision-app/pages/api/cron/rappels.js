import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Appelé une fois par jour par Vercel Cron (voir vercel.json).
// Protégé par CRON_SECRET pour éviter que n'importe qui déclenche l'envoi.
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send('Non autorisé');
  }

  const admin = supabaseAdmin();
  const aujourdHui = new Date().toISOString().split('T')[0];

  // Élèves ayant au moins une notion due aujourd'hui ou en retard.
  const { data: dus } = await admin
    .from('notion_progress')
    .select('user_id')
    .lte('prochaine_revision', aujourdHui)
    .lt('niveau', 5);

  const utilisateurs = [...new Set((dus || []).map((d) => d.user_id))];
  let envoyes = 0;

  for (const userId of utilisateurs) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email || !process.env.RESEND_API_KEY) continue;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'revisions@resend.dev',
        to: email,
        subject: 'Des notions à réviser aujourd\'hui',
        html: '<p>Bonjour,</p><p>Tu as des notions en attente de révision sur ta fiche. Une petite session de quelques minutes suffit pour rester dans les temps avant ton examen.</p>',
      }),
    });
    envoyes += 1;
  }

  res.status(200).json({ ok: true, envoyes });
}
