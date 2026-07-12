import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { username, password } = req.body;

  if (username === 'admin' && password === 'chapdel220605') {
    return res.status(200).json({ success: true, role: 'admin' });
  }

  const users = await redis.get('users') || {};
  if (users[username] && users[username] === password) {
    return res.status(200).json({ success: true, role: 'user' });
  }

  return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
}
