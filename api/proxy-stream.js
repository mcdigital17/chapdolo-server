export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('URL manquante');
    }

    try {
        const targetUrl = new URL(url);
        // On utilise l'origine de l'URL comme Referer pour tromper la sécurité
        const referer = targetUrl.origin + '/';

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Origin': targetUrl.origin
            }
        });

        if (!response.ok) {
            return res.status(response.status).send('Erreur de flux');
        }

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        // Si c'est un fichier m3u8 (liste de segments), on doit réécrire les URLs
        if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
            let text = await response.text();
            const lines = text.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return line;
                
                // Si c'est une URL complète
                if (trimmed.startsWith('http')) {
                    return `/api/proxy-stream?url=${encodeURIComponent(trimmed)}`;
                }
                // Si c'est un chemin relatif, on le convertit en URL absolue puis on le proxy
                const absoluteUrl = new URL(trimmed, url).href;
                return `/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}`;
            });
            res.send(rewrittenLines.join('\n'));
        } else {
        // Pour les petits segments .ts de la TV, on utilise le buffer classique avec Cache
          else {
            // ON MET EN CACHE LES SEGMENTS SUR VERCEL POUR UN CHARGEMENT INSTANTANÉ
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
