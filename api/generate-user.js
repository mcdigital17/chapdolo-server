import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { adminPassword, newUser, newPass } = body;

  // Vérification que c'est bien l'admin
  if (adminPassword !== 'chapdel220605') {
    return res.status(403).json({ success: false, message: 'Action interdite' });
  }

  if (!newUser || !newPass) {
    return res.status(400).json({ success: false, message: 'Champs manquants' });
  }

  try {
    // Récupération et sauvegarde
    const users = await redis.get('users') || {};
    users[newUser] = newPass;
    await redis.set('users', users);
    
    return res.status(200).json({ success: true, message: 'Utilisateur créé avec succès !' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur base de données' });
  }
}
