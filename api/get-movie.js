module.exports = async (req, res) => {
    const { tmdb_id, type, action, season, episode } = req.query;

    // ==========================================
    // PARTIE 1 : TV LIVE (Catalogue)
    // ==========================================
    if (action === 'get_live_tv') {
        const { cursor } = req.query;
        try {
            const response = await fetch('https://huhu.to/mediaurl-catalog.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                body: JSON.stringify({ adult: false, catalogId: "iptv", cursor: cursor ? parseInt(cursor) : null, filter: {}, id: "", language: "fr", region: "FR", sort: "trending-region" })
            });
            const data = await response.json();
            return res.json(data);
        } catch (error) { return res.status(500).json({ error: 'Erreur serveur TV' }); }
    }

    // ==========================================
    // PARTIE 1.5 : TV LIVE (Flux)
    // ==========================================
    if (action === 'get_live_stream') {
        const { channel_url } = req.query;
        try {
            const domainMatch = channel_url.match(/^(https?:\/\/[^\/]+)/);
            const domain = domainMatch ? domainMatch[1] : 'https://huhu.to';
            const response = await fetch(domain + '/mediaurl-resolve.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': domain + '/', 'Origin': domain },
                body: JSON.stringify({ language: "de", region: "DE", url: channel_url })
            });
            const sources = await response.json();
            let streamUrls = [];
            if (Array.isArray(sources)) {
                const validSources = sources.filter(s => s.url && !s.url.includes('vypn') && !s.url.includes('vavoo') && !s.url.includes('tape'));
                streamUrls = validSources.map(s => s.url);
            } else if (sources && sources.url && !sources.url.includes('vypn') && !sources.url.includes('vavoo')) { 
                streamUrls = [sources.url]; 
            }
            if (streamUrls.length > 0) return res.json({ success: true, url: streamUrls[0], referer: domain });
            else return res.status(404).json({ error: 'Flux TV non trouvé' });
        } catch (error) { return res.status(500).json({ error: 'Erreur serveur TV stream' }); }
    }

    // ==========================================
    // PARTIE 2 : ANIMES (Franime)
    // ==========================================
    if (action === 'search_anime') {
        const { query } = req.query;
        try {
            const response = await fetch(`https://api.franime.fr/animes?search=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://franime.fr', 'Referer': 'https://franime.fr/' } });
            const data = await response.json();
            return res.json(data);
        } catch (e) { return res.status(500).json({ error: 'Erreur recherche anime' }); }
    }
    if (action === 'get_anime_catalog') {
        try {
            const response = await fetch('https://api.franime.fr/animes', { headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://franime.fr', 'Referer': 'https://franime.fr/' } });
            const data = await response.json();
            return res.json(data);
        } catch (e) { return res.status(500).json({ error: 'Erreur catalogue anime' }); }
    }
    if (action === 'get_anime_episodes') {
        const { anime_id } = req.query;
        try {
            const response = await fetch(`https://api.franime.fr/anime/${anime_id}`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://franime.fr', 'Referer': 'https://franime.fr/' } });
            const data = await response.json();
            return res.json(data);
        } catch (e) { return res.status(500).json({ error: 'Erreur épisodes anime' }); }
    }

    // ==========================================
    // PARTIE 3 : FILMS & SÉRIES (Moteur 2Embed)
    // ==========================================
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        let embedUrl = '';
        
        // Si c'est une série, on construit l'URL avec la saison et l'épisode
        if (type === 'tv') {
            let s = parseInt(season) || 1;
            let e = parseInt(episode) || 1;
            embedUrl = `https://www.2embed.cc/embedtv/${tmdb_id}&s=${s}&e=${e}`;
        } 
        // Sinon, c'est un film
        else {
            embedUrl = `https://www.2embed.cc/embed/${tmdb_id}`;
        }

        // On renvoie le lien du lecteur 2Embed à l'application
        return res.json({ success: true, type: 'embed', sources: [{ name: 'Lecteur Standard (VF/VOSTFR)', url: embedUrl, lang: 'VF' }] });

    } catch (e) { 
        res.status(500).json({ error: 'Erreur serveur VOD: ' + e.message }); 
    }
}
