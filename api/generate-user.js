import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { adminPassword, newUser, newPass } = req.body;

  if (adminPassword !== 'chapdel220605') {
    return res.status(403).json({ success: false, message: 'Action interdite' });
  }

  const users = await redis.get('users') || {};
  users[newUser] = newPass;
  await redis.set('users', users);

  return res.status(200).json({ success: true, message: 'Utilisateur créé avec succès !' });
}
