module.exports = async (req, res) => {
    const { url, referer } = req.query;
    if (!url) {
        return res.status(400).send('URL manquante');
    }

    try {
        const targetUrl = new URL(url);
        // On utilise le referer passé par get-movie.js (huhu.to) pour tromper la sécurité
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

        const contentType = response.headers.get('content-type') || '';
        
        // Sécurité anti-pub
        if (contentType.includes('text/html')) {
            return res.status(403).send('Publicité bloquée');
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        // Si c'est un fichier m3u8 (liste de segments), on doit réécrire les URLs
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
                
                // On renvoie le segment en gardant le referer magique
                return `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent(ref)}`;
            });
            res.send(rewrittenLines.filter(l => l !== '').join('\n'));
        } else {
            // Pour les segments vidéo (.ts, .mp4, etc.), on renvoie juste les données
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
