export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  res.setHeader('Cache-Control', 'no-store');
  
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false });
  }

  const { username } = body;
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
      try { 
        const parsed = JSON.parse(rawResult || '{}'); 
        if (typeof parsed === 'object' && parsed !== null) users = parsed;
      } catch(e) { users = {}; }
    }

    if (users[username]) {
      if (typeof users[username] === 'object') {
        users[username].active = false;
        users[username].sessionId = null;
        users[username].lastPing = 0;
      } else {
        users[username] = { pass: users[username], blocked: false, active: false, sessionId: null, lastPing: 0, createdAt: new Date().toISOString() };
      }

      await fetch(`${redisUrl}/set/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([JSON.stringify(users)])
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
}
