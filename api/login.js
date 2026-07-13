export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, password } = body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Champs manquants' });

  if (username === 'admin' && password === 'chapdel220605') return res.status(200).json({ success: true, role: 'admin' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  try {
    const getResponse = await fetch(`${url}/get/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    const getData = await getResponse.json();
    const users = getData.result ? JSON.parse(getData.result) : {};

    const user = users[username];
    
    // Vérifie si l'utilisateur existe et si le mot de passe est bon (compatible ancien et nouveau format)
    if (user && ((user.pass && user.pass === password) || (!user.pass && user === password))) {
      
      // Vérifie si le compte est bloqué
      if (user.blocked === true) {
        return res.status(403).json({ success: false, message: 'Ce compte a été bloqué par l\'administrateur.' });
      }
      
      // Vérifie si le compte est déjà connecté ailleurs
      if (user.active === true) {
        return res.status(403).json({ success: false, message: 'Ce compte est déjà utilisé sur un autre appareil.' });
      }

      // Si tout est bon, on le marque comme Actif et on sauvegarde
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
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
