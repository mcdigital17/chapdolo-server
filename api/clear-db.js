export default async function handler(req, res) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  await fetch(`${url}/del/users`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  return res.status(200).send('Base nettoyée !');
}
