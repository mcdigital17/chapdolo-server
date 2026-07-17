import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { action, adminPassword, iptvUrl } = body;

  // Si l'admin veut sauvegarder un nouveau lien
  if (action === 'save') {
    if (adminPassword !== 'chapdel220605') return res.status(403).json({ error: 'Interdit' });
    await redis.set('iptv_url', iptvUrl);
    return res.status(200).json({ success: true, message: 'Source IPTV sauvegardée !' });
  }

  // Si l'application demande le lien pour l'afficher aux utilisateurs
  if (action === 'get') {
    const url = await redis.get('iptv_url');
    return res.status(200).json({ success: true, url: url || '' });
  }

  return res.status(400).json({ error: 'Action inconnue' });
}
