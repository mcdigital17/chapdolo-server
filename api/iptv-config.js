export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { action, adminPassword, iptvUrl } = body;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ success: false, message: 'Variables base de données manquantes' });
  }

  // Si l'admin veut sauvegarder un nouveau lien
  if (action === 'save') {
    if (adminPassword !== 'chapdel220605') return res.status(403).json({ error: 'Interdit' });
    
    try {
      const setResponse = await fetch(`${url}/set/iptv_url`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(iptvUrl)
      });
      const setData = await setResponse.json();
      if (setData.result === 'OK') {
        return res.status(200).json({ success: true, message: 'Source IPTV sauvegardée !' });
      } else {
        return res.status(500).json({ success: false, message: 'Erreur sauvegarde base' });
      }
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Erreur connexion base' });
    }
  }

   // Si l'application demande le lien pour l'afficher aux utilisateurs
  if (action === 'get') {
    try {
      const getResponse = await fetch(`${url}/get/iptv_url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const getData = await getResponse.json();
      
      // Nettoyage des guillemets si la base en a ajouté
      let cleanUrl = getData.result || '';
      if (cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) {
        cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1);
      }
      
      return res.status(200).json({ success: true, url: cleanUrl });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Erreur lecture base' });
    }
  }
