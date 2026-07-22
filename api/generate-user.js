export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { adminPassword, newUser, newPass } = body;
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) return res.status(500).json({ success: false, message: 'Variables base de données manquantes' });
  if (adminPassword !== 'chapdel220605') return res.status(403).json({ success: false, message: 'Non autorisé' });

  try {
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
      try { 
        const parsed = JSON.parse(rawResult || '{}'); 
        if (typeof parsed === 'object' && parsed !== null) {
          users = parsed;
        }
      } catch(e) { users = {}; }
    }

    if (users[newUser]) {
      return res.status(200).json({ success: false, message: 'Cet identifiant existe déjà' });
    }

    users[newUser] = {
      pass: newPass,
      blocked: false,
      active: false,
      lastPing: 0,
      sessionId: null,
      createdAt: new Date().toISOString()
    };

    const setResponse = await fetch(`${redisUrl}/set/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(users))
    });
    const setData = await setResponse.json();

    if (setData.error) {
      return res.status(500).json({ success: false, message: 'Erreur Redis: ' + setData.error });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
