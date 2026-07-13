export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const { adminPassword, newUser, newPass } = body;

  if (adminPassword !== 'chapdel220605') {
    return res.status(403).json({ success: false, message: 'Action interdite' });
  }

  if (!newUser || !newPass) {
    return res.status(400).json({ success: false, message: 'Champs manquants' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ success: false, message: 'Variables base de données manquantes sur Vercel' });
  }

  try {
    // 1. On demande au coffre-fort la liste des utilisateurs
    const getResponse = await fetch(`${url}/get/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getResponse.json();
    
    // 2. On lit la liste (si elle est vide, on crée un dictionnaire vide)
    const users = getData.result ? JSON.parse(getData.result) : {};

    // 3. On ajoute le nouvel utilisateur
    users[newUser] = newPass;

    // 4. On renvoie la liste mise à jour au coffre-fort
    const setResponse = await fetch(`${url}/set/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(users)
    });
    const setData = await setResponse.json();

    if (setData.result === 'OK') {
      return res.status(200).json({ success: true, message: 'Utilisateur créé avec succès !' });
    } else {
      return res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde dans la base' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur de connexion au coffre-fort : ' + error.message });
  }
}
