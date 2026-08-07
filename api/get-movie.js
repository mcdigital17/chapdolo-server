module.exports = async (req, res) => {
    const { tmdb_id, type } = req.query;
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        let requestBody = {
            language: "fr", region: "FR", 
            type: type === 'tv' ? 'tv' : 'movie',
            ids: { tmdb_id: tmdb_id }, name: "",
            episode: type === 'tv' ? 1 : undefined, 
            season: type === 'tv' ? 1 : undefined
        };

        // 1. Demander les liens à huhu.to
        const huhuResponse = await fetch('https://huhu.to/mediaurl-source.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify(requestBody)
        });
        const sources = await huhuResponse.json();

        // 2. Chercher un serveur Mixdrop pour extraire le .mp4
        for (let s of sources) {
            if (!s.url || s.url === '') continue;
            if (s.url.includes('tape') || s.url.includes('stp')) continue; // On ignore Streamtape
            
            if (s.url.includes('mixdrop.')) {
                let embedUrl = s.url.replace('/f/', '/e/');
                let mp4Url = await extractMixdropMp4(embedUrl);
                if (mp4Url) {
                    // SUCCÈS : On a le lien .mp4 brut ! On l'envoie à Chapdolo.
                    return res.json({ success: true, type: 'mp4', url: mp4Url });
                }
            }
        }

        // 3. Si Mixdrop échoue, on renvoie les autres serveurs en iframe (fallback)
        const embedSources = sources.map(s => {
             if (!s.url || s.url === '') return null;
             if (s.url.includes('tape') || s.url.includes('stp')) return null;
             let embedUrl = s.url;
             if (embedUrl.includes('dood.')) embedUrl = embedUrl.replace('/w/', '/e/');
             else if (embedUrl.includes('mixdrop.')) embedUrl = embedUrl.replace('/f/', '/e/');
             return { name: s.name, url: embedUrl };
        }).filter(s => s !== null);

        if (embedSources.length > 0) {
            return res.json({ success: true, type: 'embed', sources: embedSources });
        }

        res.status(404).json({ error: 'Aucun lecteur valide trouvé' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Fonction secrète pour extraire le .mp4 de Mixdrop
async function extractMixdropMp4(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }});
        const html = await res.text();
        
        // Cherche le code caché dans le script d'évaluation
        const match = html.match(/eval\(decodeURIComponent\('([^']+)'\)\)/);
        if (match) {
            let decoded = decodeURIComponent(match[1]);
            const urlMatch = decoded.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/);
            if (urlMatch) return urlMatch[1];
        }
        
        // Cherche une URL alternative dans hurl
        const hurlMatch = html.match(/hurl\s*=\s*["'](https?:\/\/[^"']+)["']/);
        if (hurlMatch) return hurlMatch[1];
        
        return null;
    } catch(e) {
        return null;
    }
}
