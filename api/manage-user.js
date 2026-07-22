export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Cache-Control', 'no-store');
  
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).json({ success: false }); }
  const { adminPassword, username, action } = body;
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  if (!redisUrl || !redisToken) return res.status(500).json({ success: false });
  if (adminPassword !== 'chapdel220605') return res.status(403).json({ success: false });

  try {
    const getResponse = await fetch(`${redisUrl}/get/users`, { headers: { 'Authorization': `Bearer ${redisToken}` } });
    const getData = await getResponse.json();
    let users = {};
    if (getData.result) {
      let raw = getData.result;
      if (typeof raw === 'string' && raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.substring(1, raw.length - 1);
        raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      try {
        const parsed = JSON.parse(raw || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) users = parsed;
      } catch (e) { users = {}; }
    }

    if (!users[username]) return res.status(200).json({ success: false, message: 'Utilisateur introuvable' });

    if (typeof users[username] === 'string') {
      users[username] = { pass: users[username], blocked: false, active: false, lastPing: 0, sessionId: null, createdAt: new Date().toISOString() };
    }

    if (action === 'delete') {
      delete users[username];
    } else if (action === 'block') {
      users[username].blocked = true;
      users[username].active = false;
      users[username].sessionId = null;
      users[username].lastPing = 0;
    } else if (action === 'unblock') {
      users[username].blocked = false;
    } else if (action === 'disconnect') {
      users[username].active = false;
      users[username].sessionId = null;
      users[username].lastPing = 0;
    }

    const usersString = JSON.stringify(users);
    await fetch(`${redisUrl}/set/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(usersString)
    });
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ success: false }); }
}
