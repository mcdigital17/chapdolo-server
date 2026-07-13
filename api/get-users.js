export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (body.adminPassword !== 'chapdel220605') return res.status(403).json({ error: 'Interdit' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  try {
    const getResponse = await fetch(`${url}/get/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    const getData = await getResponse.json();
    const users = getData.result ? JSON.parse(getData.result) : {};
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
