export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL manquante');
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).send('Erreur proxy');
  }
}
