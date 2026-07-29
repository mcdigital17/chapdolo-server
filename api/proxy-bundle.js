module.exports = async (req, res) => {
  let body;
  
  if (req.method === 'POST') {
    body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); } }
  } else if (req.method === 'GET') {
    body = {
      "jsonrpc": "2.0",
      "method": "catalog",
      "params": {
        "type": "movie",
        "id": "tmdb.movie",
        "extra": {
          "skip": 0,
          "limit": 20,
          "sort": "popularity"
        }
      },
      "id": 1
    };
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch('https://www.huhu.to/mediaurl.json', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Watched/2.3.1 (Android)',
        'Accept': 'application/json',
        'X-SDK-Version': '2.3.1',
        'Origin': 'https://www.huhu.to',
        'Referer': 'https://www.huhu.to/'
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
