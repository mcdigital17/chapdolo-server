module.exports = async (req, res) => {
  let body;
  
  // Si Chapdolo envoie du POST (pour l'application finale)
  if (req.method === 'POST') {
    body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); } }
  } 
  // Si on teste avec le navigateur (GET)
  else if (req.method === 'GET') {
    const { action, type, id, sort } = req.query;
    body = {
      action: action || 'catalog',
      type: type || 'movie',
      id: id || 'tmdb.movie',
      extra: { sort: sort || 'popularity' }
    };
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
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
};
