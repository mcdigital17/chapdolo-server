module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('URL manquante');
    }

    try {
        const targetUrl = new URL(url);
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

        // 1. Si c'est un flux TV (m3u8), on le réécrit pour passer par le proxy
        if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
            let text = await response.text();
            const lines = text.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return line;
                
                if (trimmed.startsWith('http')) {
                    return `/api/proxy-stream?url=${encodeURIComponent(trimmed)}`;
                }
                const absoluteUrl = new URL(trimmed, url).href;
                return `/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}`;
            });
            res.send(rewrittenLines.join('\n'));
        } 
        // 2. Si c'est un film MP4, on utilise le Stream pour ne pas faire crasher Vercel
        else if (url.includes('.mp4') || contentType.includes('mp4')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            response.body.pipe(res);
        } 
        // 3. SINON (pour les petits segments .ts de la TV), on utilise le buffer classique (très stable)
        else {
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
