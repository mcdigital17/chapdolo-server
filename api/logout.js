export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username } = body;
  if (!username) return res.status(400).json({ error: 'Champs manquants' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  try {
    const getResponse = await fetch(`${url}/get/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    const getData = await getResponse.json();
    const users = getData.result ? JSON.parse(getData.result) : {};

    if (users[username]) {
      users[username].active = false;
      await fetch(`${url}/set/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
