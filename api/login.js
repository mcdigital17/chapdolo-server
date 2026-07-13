export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { username, password } = body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Champs manquants' });
  }

  // Vérification Admin
  if (username === 'admin' && password === 'chapdel220605') {
    return res.status(200).json({ success: true, role: 'admin' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ success: false, message: 'Variables base de données manquantes sur Vercel' });
  }

  try {
    // On demande la liste des utilisateurs au coffre-fort
    const getResponse = await fetch(`${url}/get/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getResponse.json();
    
    const users = getData.result ? JSON.parse(getData.result) : {};

    // On vérifie si l'utilisateur existe et si le mot de passe est bon
    if (users[username] && users[username] === password) {
      return res.status(200).json({ success: true, role: 'user' });
    } else {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur de connexion au coffre-fort : ' + error.message });
  }
}
