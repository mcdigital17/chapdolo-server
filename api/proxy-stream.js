const { Readable } = require('stream');

module.exports = async (req, res) => {
    const { url, referer } = req.query;
    if (!url) {
        return res.status(400).send('URL manquante');
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
            return res.status(response.status).send('Erreur de flux');
        }

        let contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/html')) {
            return res.status(403).send('Publicité bloquée');
        }

        if (url.includes('.m3u8') && !contentType.includes('mpegurl')) {
            contentType = 'application/vnd.apple.mpegurl';
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
            let text = await response.text();
            const lines = text.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                
                if (trimmed.startsWith('#')) {
                    if (trimmed.includes('URI="')) {
                        return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
                            let finalUrl = p1;
                            if (!p1.startsWith('http')) {
                                finalUrl = new URL(p1, url).href;
                            }
                            return `URI="/api/proxy-stream?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent(ref)}"`;
                        });
                    }
                    return line;
                }
                
                let finalUrl = trimmed;
                if (!trimmed.startsWith('http')) {
                    finalUrl = new URL(trimmed, url).href;
                }
                return `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent(ref)}`;
            });
            res.send(rewrittenLines.join('\n'));
        } else {
            // FLUX CONTINU : La vidéo passe instantanément sans geler
            if (response.body) {
                Readable.fromWeb(response.body).pipe(res);
            } else {
                const buffer = Buffer.from(await response.arrayBuffer());
                res.send(buffer);
            }
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
