export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { username, password } = body;
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ success: false, message: 'Variables base de données manquantes sur Vercel' });
  }

  try {
    // 1. Récupérer tous les utilisateurs
    const getResponse = await fetch(`${redisUrl}/get/users`, {
      headers: { 'Authorization': `Bearer ${redisToken}` }
    });
    const getData = await getResponse.json();
    
    let users = {};
    if (getData.result) {
      let rawResult = getData.result;
      if (typeof rawResult === 'string' && rawResult.startsWith('"') && rawResult.endsWith('"')) {
        rawResult = rawResult.substring(1, rawResult.length - 1);
      }
      try { users = JSON.parse(rawResult || '{}'); } catch(e) { users = {}; }
    }

    // 2. Vérifier l'utilisateur
    const user = users[username];
    if (!user) {
      return res.status(200).json({ success: false, message: 'Identifiant introuvable' });
    }

    // Gérer les anciens comptes (où l'utilisateur était juste une chaîne de caractères = mot de passe)
    const userPass = typeof user === 'string' ? user : user.pass;
    const isBlocked = typeof user === 'string' ? false : user.blocked;
    const isActive = typeof user === 'string' ? false : user.active;

    if (userPass !== password) {
      return res.status(200).json({ success: false, message: 'Mot de passe incorrect' });
    }

    if (isBlocked) {
      return res.status(200).json({ success: false, message: 'Compte bloqué par l\'administrateur' });
    }

    // 3. NOUVEAU : Vérifier si déjà connecté ailleurs
    if (isActive) {
      return res.status(200).json({ success: false, message: '⚠️ Ce compte est déjà connecté sur un autre appareil.' });
    }

    // 4. Connecter l'utilisateur (Mettre active à true)
    users[username] = {
      pass: userPass,
      blocked: isBlocked,
      active: true,
      createdAt: typeof user === 'string' ? new Date().toISOString() : user.createdAt
    };

    // 5. Sauvegarder dans Redis
    const setResponse = await fetch(`${redisUrl}/set/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(users))
    });
    const setData = await setResponse.json();

    if (setData.result === 'OK') {
      return res.status(200).json({ success: true, message: 'Connexion réussie' });
    } else {
      return res.status(500).json({ success: false, message: 'Erreur de sauvegarde de l\'état connecté' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
