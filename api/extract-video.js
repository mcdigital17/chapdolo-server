export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { movieUrl } = body;

  if (!movieUrl) return res.status(400).json({ error: 'URL manquante' });

  try {
    // Le serveur se déguise pour visiter la page du film
    const response = await fetch(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://oha.to/'
      }
    });
    const html = await response.text();
    
    // On cherche le lien vidéo .m3u8 dans le code source
    const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
    
    if (m3u8Match) {
      return res.status(200).json({ success: true, videoUrl: m3u8Match[0] });
    } else {
      return res.status(404).json({ success: false, message: 'Lien vidéo non trouvé par le robot.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'extraction.' });
  }
}
