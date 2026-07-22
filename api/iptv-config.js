export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // Lecture sécurisée des données reçues
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { action, adminPassword, iptvUrl, adultPin, adultUrl } = body;

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ success: false, message: 'Variables base de données manquantes sur Vercel' });
  }

  // Fonction utilitaire pour nettoyer les guillemets de Redis
  const cleanRedisString = (val) => {
    if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
      return val.substring(1, val.length - 1);
    }
    return val || '';
  };

  // --- ACTION : SAUVEGARDER ---
  if (action === 'save') {
    if (adminPassword !== 'chapdel220605') {
      return res.status(403).json({ success: false, message: 'Action interdite' });
    }

    try {
      const promises = [];
      
      // On sauvegarde l'URL classique si elle est fournie
      if (iptvUrl) {
        promises.push(fetch(`${redisUrl}/set/iptv_url`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(iptvUrl)
        }));
      }
      
      // On sauvegarde le PIN adulte s'il est fourni
      if (adultPin) {
        promises.push(fetch(`${redisUrl}/set/adult_pin`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(adultPin)
        }));
      }
      
      // On sauvegarde l'URL adulte si elle est fournie
      if (adultUrl) {
        promises.push(fetch(`${redisUrl}/set/adult_url`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(adultUrl)
        }));
      }

      // On attend que toutes les sauvegardes soient terminées
      await Promise.all(promises);
      
      return res.status(200).json({ success: true, message: 'Configuration sauvegardée avec succès !' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur de connexion au coffre-fort' });
    }
  }

  // --- ACTION : LIRE / RECUPERER ---
  if (action === 'get') {
    try {
      // On demande les 3 clés à Redis en même temps
      const [getUrlRes, getPinRes, getAdultUrlRes] = await Promise.all([
        fetch(`${redisUrl}/get/iptv_url`, { headers: { 'Authorization': `Bearer ${redisToken}` } }),
        fetch(`${redisUrl}/get/adult_pin`, { headers: { 'Authorization': `Bearer ${redisToken}` } }),
        fetch(`${redisUrl}/get/adult_url`, { headers: { 'Authorization': `Bearer ${redisToken}` } })
      ]);

      const urlData = await getUrlRes.json();
      const pinData = await getPinRes.json();
      const adultUrlData = await getAdultUrlRes.json();
      
      return res.status(200).json({ 
        success: true, 
        url: cleanRedisString(urlData.result),
        adultPin: cleanRedisString(pinData.result),
        adultUrl: cleanRedisString(adultUrlData.result)
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur de lecture du coffre-fort' });
    }
  }

  // Si l'action n'est ni save ni get
  return res.status(400).json({ success: false, message: 'Action inconnue' });
}
