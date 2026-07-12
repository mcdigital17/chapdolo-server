import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // Sécurité pour lire les données envoyées par l'application
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { username, password } = body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Champs manquants' });
  }

  // Vérification Admin
  if (username === 'admin' && password === 'chapdel220605') {
    return res.status(200).json({ success: true, role: 'admin' });
  }

  try {
    // Vérification Utilisateur dans la base de données
    const users = await redis.get('users') || {};
    
    // Vérification stricte du mot de passe
    if (users[username] && users[username] === password) {
      return res.status(200).json({ success: true, role: 'user' });
    } else {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur base de données' });
  }
}
