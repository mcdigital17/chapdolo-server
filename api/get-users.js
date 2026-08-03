module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Cache-Control', 'no-store');
  
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).json({ success: false }); }
  const { adminPassword } = body;
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  
  if (!redisUrl || !redisToken) return res.status(500).json({ success: false, message: 'Variables base de données manquantes' });
  if (adminPassword !== process.env.ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Non autorisé' });

  try {
    const getResponse = await fetch(`${redisUrl}/get/users`, { headers: { 'Authorization': `Bearer ${redisToken}` } });
    const getData = await getResponse.json();
    
    if (getData.error) return res.status(500).json({ success: false, message: 'Erreur Redis: ' + getData.error });
    
    let users = {};
    if (getData.result) {
      let rawResult = getData.result;
      if (typeof rawResult === 'string' && rawResult.startsWith('"') && rawResult.endsWith('"')) {
        rawResult = rawResult.substring(1, rawResult.length - 1);
        rawResult = rawResult.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      try { 
        const parsed = JSON.parse(rawResult || '{}'); 
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) users = parsed;
      } catch(e) { users = {}; }
    }
    return res.status(200).json({ success: true, users: users });
  } catch (error) { 
    return res.status(500).json({ success: false, message: 'Erreur serveur: ' + error.message }); 
  }
}
