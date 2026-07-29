module.exports = async (req, res) => {
  let body;
  
  if (req.method === 'POST') {
    body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); } }
  } else if (req.method === 'GET') {
    const { action, type, id, sort, url } = req.query;
    
    // Si on demande la source vidéo d'un élément
    if (action === 'source') {
      body = {
        action: 'source',
        type: type || 'movie',
        url: url
      };
    } 
    // Sinon, on demande le catalogue
    else {
      body = {
        action: action || 'catalog',
        type: type || 'movie',
        id: id || 'tmdb.movie',
        extra: { 
          skip: 0,
          limit: 20,
          sort: sort || 'popularity' 
        }
      };
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // L'URL CORRIGÉE EST ICI 👇
    const response = await fetch('https://www.huhu.to/mediaurl-catalog.json', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur de connexion au bundle huhu.to' });
  }
};
