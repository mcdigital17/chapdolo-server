export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Cache-Control', 'no-store');
  
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).json({ success: false }); }
  const { adminPassword } = body;
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  if (!redisUrl || !redisToken) return res.status(500).json({ success: false });
  if (adminPassword !== 'chapdel220605') return res.status(403).json({ success: false });

  try {
    const getResponse = await fetch(`${redisUrl}/get/users`, { headers: { 'Authorization': `Bearer ${redisToken}` } });
    const getData = await getResponse.json();
    let users = {};
    if (getData.result) {
      let rawResult = getData.result;
      if (typeof rawResult === 'string' && rawResult.startsWith('"') && rawResult.endsWith('"')) {
        rawResult = rawResult.substring(1, rawResult.length - 1);
      }
      try {
        const parsed = JSON.parse(rawResult || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          users = parsed;
        } else {
          users = {}; // Nettoyage si c'est corrompu (un tableau ou autre)
        }
      } catch (e) { users = {}; }
    }
    return res.status(200).json({ success: true, users: users });
  } catch (error) { return res.status(500).json({ success: false }); }
}
