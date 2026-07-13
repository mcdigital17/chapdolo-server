export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { adminPassword, newUser, newPass } = body;

  if (adminPassword !== 'chapdel220605') return res.status(403).json({ success: false, message: 'Action interdite' });
  if (!newUser || !newPass) return res.status(400).json({ success: false, message: 'Champs manquants' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  try {
    const getResponse = await fetch(`${url}/get/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    const getData = await getResponse.json();
    const users = getData.result ? JSON.parse(getData.result) : {};

    // NOUVEAU FORMAT : On sauvegarde le mot de passe, le statut bloqué et le statut actif
    users[newUser] = { pass: newPass, blocked: false, active: false };

    const setResponse = await fetch(`${url}/set/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    });
    const setData = await setResponse.json();
    if (setData.result === 'OK') return res.status(200).json({ success: true, message: 'Utilisateur créé avec succès !' });
    return res.status(500).json({ success: false, message: 'Erreur sauvegarde' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur connexion base' });
  }
}
