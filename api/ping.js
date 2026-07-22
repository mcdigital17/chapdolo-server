export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { username, sessionId } = body;
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) return res.status(500).json({ success: false });

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
      try { users = JSON.parse(rawResult || '{}'); } catch(e) { users = {}; }
    }

    const user = users[username];
    
    // Si l'utilisateur existe, a le bon ticket de session, et qu'il n'a pas été déconnecté par l'admin
    if (user && typeof user === 'object' && user.sessionId === sessionId && !user.blocked) {
      // On met à jour son dernier ping
      users[username].lastPing = Date.now();
      users[username].active = true;
      
      await fetch(`${redisUrl}/set/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(users))
      });
      
      return res.status(200).json({ success: true, valid: true });
    }

    // Si le ticket ne correspond pas (quelqu'un d'autre s'est connecté entre-temps)
    return res.status(200).json({ success: true, valid: false });

  } catch (error) {
    return res.status(500).json({ success: false });
  }
}
