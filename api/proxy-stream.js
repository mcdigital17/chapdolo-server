module.exports = async (req, res) => {
    const { url, referer } = req.query;
    if (!url) return res.status(400).send('URL manquante');

    try {
        const targetUrl = new URL(url);
        
        // Si on a un referer personnalisé, on l'utilise. Sinon, on prend l'origine du flux.
        const ref = referer || (targetUrl.origin + '/');

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': ref,
                'Origin': ref
            }
        });

        if (!response.ok) return res.status(response.status).send('Erreur de flux');

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

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
                
                // On renvoie le segment en gardant le referer
                return `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent(ref)}`;
            });
            res.send(rewrittenLines.join('\n'));
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            response.body.pipe(res);
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
