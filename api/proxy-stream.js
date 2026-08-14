module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL manquante');

    try {
        const targetUrl = new URL(url);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': targetUrl.origin + '/',
                'Origin': targetUrl.origin
            }
        });

        if (!response.ok) return res.status(response.status).send('Erreur de flux');

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        // Si c'est un fichier m3u8 (TV), on le lit et on renvoie les liens directs pour ne pas faire crasher Vercel
        if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
            let text = await response.text();
            const lines = text.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return line;
                
                // ON RENVOIE LES LIENS DIRECTS DES SEGMENTS (.ts) POUR NE PAS FAIRE PLANTER VERCEL
                if (trimmed.startsWith('http')) return trimmed;
                return new URL(trimmed, url).href;
            });
            res.send(rewrittenLines.join('\n'));
        } else {
            // Pour les films MP4, on garde le stream
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            response.body.pipe(res);
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
