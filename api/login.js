export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  res.setHeader('Cache-Control', 'no-store'); // Empêche Vercel de mettre en cache
  
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
      // Nettoyage des guillemets (bug courant avec Redis)
      if (typeof rawResult === 'string' && rawResult.startsWith('"') && rawResult.endsWith('"')) {
        rawResult = rawResult.substring(1, rawResult.length - 1);
      }
      try { 
        const parsed = JSON.parse(rawResult || '{}'); 
        if (typeof parsed === 'object' && parsed !== null) users = parsed;
      } catch(e) { users = {}; }
    }

    // 2. Vérifier l'utilisateur
    const user = users[username];
    if (!user) {
      return res.status(200).json({ success: false, message: 'Identifiant introuvable' });
    }

    // Gérer les anciens comptes et les nouveaux
    const userPass = typeof user === 'string' ? user : user.pass;
    const isBlocked = typeof user === 'string' ? false : user.blocked;
    const isActive = typeof user === 'string' ? false : user.active;
    const lastPing = typeof user === 'string' ? 0 : (user.lastPing || 0);

    if (userPass !== password) {
      return res.status(200).json({ success: false, message: 'Mot de passe incorrect' });
    }

    if (isBlocked) {
      return res.status(200).json({ success: false, message: 'Compte bloqué par l\'administrateur' });
    }

    // 3. Vérifier si déjà connecté ailleurs (session active dans les 2 dernières minutes)
    const twoMinutes = 2 * 60 * 1000;
    if (isActive && (Date.now() - lastPing < twoMinutes)) {
      return res.status(200).json({ success: false, message: '⚠️ Ce compte est déjà connecté sur un autre appareil.' });
    }

    // 4. Création du ticket de session
    const sessionId = Date.now() + '_' + Math.random().toString(36).substring(2);

    users[username] = {
      pass: userPass,
      blocked: isBlocked,
      active: true,
      lastPing: Date.now(),
      sessionId: sessionId,
      createdAt: typeof user === 'string' ? new Date().toISOString() : (user.createdAt || new Date().toISOString())
    };

    // 5. Sauvegarder dans Redis (avec la syntaxe corrigée : tableau contenant la chaîne JSON)
    const setResponse = await fetch(`${redisUrl}/set/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([JSON.stringify(users)])
    });
    const setData = await setResponse.json();

    if (setData.error) {
      return res.status(500).json({ success: false, message: 'Erreur Redis: ' + setData.error });
    }

    return res.status(200).json({ success: true, sessionId: sessionId });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
