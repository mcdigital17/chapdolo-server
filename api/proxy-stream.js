export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const referer = searchParams.get('referer');

  if (!url) {
    return new Response('URL manquante', { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    const ref = referer || (targetUrl.origin + '/');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': ref,
        'Origin': ref
      }
    });

    if (!response.ok) {
      return new Response('Erreur de flux', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // ANTI-PUB
    if (contentType.includes('text/html')) {
      return new Response('Publicité bloquée', { status: 403 });
    }

    // Si c'est un fichier m3u8, on réécrit les URLs
    if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
      let text = await response.text();
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        
        let finalUrl = trimmed;
        if (!trimmed.startsWith('http')) {
          finalUrl = new URL(trimmed, url).href;
        }
        
        if (finalUrl.includes('vypn') || finalUrl.includes('vavoo')) {
          return ''; 
        }
        
        return `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent(ref)}`;
      });
      const m3u8Text = rewrittenLines.filter(l => l !== '').join('\n');
      
      return new Response(m3u8Text, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    } else {
      // POUR LES VIDÉOS : On renvoie le flux directement (Edge Function gère ça parfaitement sans geler)
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=86400');
      
      return new Response(response.body, { headers });
    }
  } catch (error) {
    return new Response('Erreur serveur proxy', { status: 500 });
  }
}
