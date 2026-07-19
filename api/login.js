export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { username, password } = body;

  if (!username || !password) return res.status(400).json({ success: false, message: 'Champs manquants' });

  // Vérification Admin
  if (username === 'admin' && password === 'chapdel220605') return res.status(200).json({ success: true, role: 'admin' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ success: false, message: 'Variables base de données manquantes sur Vercel' });

  try {
    const getResponse = await fetch(`${url}/get/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    const getData = await getResponse.json();
    const users = getData.result ? JSON.parse(getData.result) : {};

    const user = users[username];
    
    // Vérification du mot de passe (compatible ancien et nouveau format)
    if (user && ((user.pass && user.pass === password) || (!user.pass && user === password))) {
      
      // Vérification si bloqué
      if (user.blocked === true) {
        return res.status(403).json({ success: false, message: 'Ce compte a été bloqué par l\'administrateur.' });
      }

      // CORRECTION : On ne bloque plus si "active". Si le mdp est bon, on se connecte et on écrase l'ancienne session.
      users[username].active = true;
      await fetch(`${url}/set/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      });

      return res.status(200).json({ success: true, role: 'user' });
    } else {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur de connexion au coffre-fort' });
  }
}
