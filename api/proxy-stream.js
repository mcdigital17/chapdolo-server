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
        
        // ANTI-PUB : Si on reçoit une page Web au lieu d'une vidéo, on bloque net !
        if (contentType.includes('text/html')) {
            return res.status(403).send('Publicité bloquée');
        }

        // ACCÉLÉRATION : Autoriser la lecture croisée (CORS) pour la TV + Cache
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

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
                
                // ANTI-PUB : Si le segment est une pub VYPN/Vavoo, on le supprime proprement
                if (finalUrl.includes('vypn') || finalUrl.includes('vavoo')) {
                    return ''; // On efface la ligne de la pub
                }
                
                return `/api/proxy-stream?url=${encodeURIComponent(finalUrl)}`;
            });
            // On filtre les lignes vides pour ne pas casser le fichier m3u8
            res.send(rewrittenLines.filter(l => l !== '').join('\n'));
        } else {
            // MÉTHODE BUFFER : On télécharge le bout de vidéo et on l'envoie d'un coup (très rapide, évite le gel de Vercel)
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Stream Error:', error);
        res.status(500).send('Erreur serveur proxy');
    }
}
