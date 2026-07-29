export default async function handler(req, res) {
  // On accepte seulement les requêtes POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // On récupère le corps de la requête envoyée par Chapdolo
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  try {
    // On interroge le serveur de huhu.to
    const response = await fetch('https://www.huhu.to/mediaurl.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de connexion au bundle huhu.to' });
  }
}
