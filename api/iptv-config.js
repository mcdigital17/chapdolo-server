export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // Lecture sécurisée des données reçues
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { action, adminPassword, iptvUrl } = body;

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ success: false, message: 'Variables base de données manquantes sur Vercel' });
  }

  // --- ACTION : SAUVEGARDER ---
  if (action === 'save') {
    if (adminPassword !== 'chapdel220605') {
      return res.status(403).json({ success: false, message: 'Action interdite' });
    }
    if (!iptvUrl) {
      return res.status(400).json({ success: false, message: 'URL manquante' });
    }

    try {
      // On sauvegarde l'URL dans la base de données
      const setResponse = await fetch(`${redisUrl}/set/iptv_url`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${redisToken}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(iptvUrl)
      });
      const setData = await setResponse.json();
      
      if (setData.result === 'OK') {
        return res.status(200).json({ success: true, message: 'Source IPTV sauvegardée avec succès !' });
      } else {
        return res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde en base' });
      }
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur de connexion au coffre-fort' });
    }
  }

  // --- ACTION : LIRE / RECUPERER ---
  if (action === 'get') {
    try {
      // On demande l'URL au coffre-fort
      const getResponse = await fetch(`${redisUrl}/get/iptv_url`, {
        headers: { 'Authorization': `Bearer ${redisToken}` }
      });
      const getData = await getResponse.json();
      
      let cleanUrl = getData.result || '';
      
      // Nettoyage des guillemets (bug courant avec Redis)
      if (typeof cleanUrl === 'string' && cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) {
        cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1);
      }
      
      return res.status(200).json({ success: true, url: cleanUrl });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur de lecture du coffre-fort' });
    }
  }

  // Si l'action n'est ni save ni get
  return res.status(400).json({ success: false, message: 'Action inconnue' });
}
