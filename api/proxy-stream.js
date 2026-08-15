module.exports = async (req, res) => {
    const { url, referer } = req.query;
    if (!url) return res.status(400).send('URL manquante');

    try {
        const targetUrl = new URL(url);
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
        
        // LIGNE CRITIQUE POUR LA TV : Autoriser la lecture croisée (CORS)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);

        // 1. Si c'est un fichier m3u8 (TV), on le lit et on renvoie les segments via le proxy
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
                return `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent(ref)}`;
            });
            res.send(rewrittenLines.join('\n'));
        } 
        // 2. Si c'est un film MP4, on utilise le stream
        else if (url.includes('.mp4') || contentType.includes('mp4')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            response.body.pipe(res);
        } 
        // 3. SINON (pour les petits segments .ts de la TV), on utilise le buffer classique avec Cache
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
