module.exports = async (req, res) => {
    const { tmdb_id, type, action } = req.query;

    // ==========================================
    // PARTIE 1 : TV LIVE (Si on demande le catalogue TV)
    // ==========================================
    // ==========================================
    // PARTIE 1.5 : FLUX TV LIVE (Si on demande de lire une chaîne Huhu)
    // ==========================================
    if (action === 'get_live_stream') {
        const { channel_id } = req.query;
        try {
            const response = await fetch('https://huhu.to/mediaurl-source.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                body: JSON.stringify({ 
                    language: "fr", 
                    region: "FR", 
                    type: "iptv", 
                    ids: { id: channel_id },
                    name: "" // <-- ON AJOUTE LE CHAMP NAME QUI MANQUAIT
                })
            });
            const sources = await response.json();
            
            // ON AFFICHE ENCORE LA RÉPONSE BRUTE POUR VOIR SI L'ERREUR EST TOUUBLE LÀ
            return res.json({ success: true, raw_response: sources });

        } catch (error) {
            return res.status(500).json({ error: 'Erreur serveur TV stream' });
        }
    }
    if (action === 'get_live_tv') {
        try {
            const response = await fetch('https://huhu.to/mediaurl-catalog.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                body: JSON.stringify({ language: "fr", region: "FR", type: "tv" })
            });
            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Erreur get-tv:', error);
            return res.status(500).json({ error: 'Erreur serveur TV' });
        }
    }

    // ==========================================
    // PARTIE 2 : FILMS & SÉRIES (Le code qu'on avait déjà)
    // ==========================================
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        let requestBody = {
            language: "fr", region: "FR", 
            type: type === 'tv' ? 'tv' : 'movie',
            ids: { tmdb_id: tmdb_id }, name: "",
            episode: type === 'tv' ? 1 : undefined, 
            season: type === 'tv' ? 1 : undefined
        };

        const huhuResponse = await fetch('https://huhu.to/mediaurl-source.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: JSON.stringify(requestBody)
        });
        const sources = await huhuResponse.json();

        for (let s of sources) {
            if (!s.url || s.url === '') continue;
            if (s.url.includes('tape') || s.url.includes('stp')) continue;
            
            if (s.url.includes('mixdrop.')) {
                let embedUrl = s.url.replace('/f/', '/e/');
                let mp4Url = await extractMixdropMp4(embedUrl);
                if (mp4Url) return res.json({ success: true, type: 'mp4', url: mp4Url });
            }
        }

        const embedSources = sources.map(s => {
             if (!s.url || s.url === '') return null;
             if (s.url.includes('tape') || s.url.includes('stp')) return null;
             let embedUrl = s.url;
             if (embedUrl.includes('dood.')) embedUrl = embedUrl.replace('/w/', '/e/');
             else if (embedUrl.includes('mixdrop.')) embedUrl = embedUrl.replace('/f/', '/e/');
             return { name: s.name, url: embedUrl };
        }).filter(s => s !== null);

        if (embedSources.length > 0) {
            embedSources.sort((a, b) => {
                if (a.name.includes('R2')) return -1;
                if (b.name.includes('R2')) return 1;
                return 0;
            });
            return res.json({ success: true, type: 'embed', sources: embedSources });
        }

        res.status(404).json({ error: 'Aucun lecteur valide trouvé' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

async function extractMixdropMp4(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }});
        const html = await res.text();
        const match = html.match(/eval\(decodeURIComponent\('([^']+)'\)\)/);
        if (match) {
            let decoded = decodeURIComponent(match[1]);
            const urlMatch = decoded.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/);
            if (urlMatch) return urlMatch[1];
        }
        const hurlMatch = html.match(/hurl\s*=\s*["'](https?:\/\/[^"']+)["']/);
        if (hurlMatch) return hurlMatch[1];
        return null;
    } catch(e) {
        return null;
    }
}
