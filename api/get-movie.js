module.exports = async (req, res) => {
    const { tmdb_id, type, action, season, episode } = req.query;

    // ==========================================
    // PARTIE 1 : TV LIVE (Catalogue)
    // ==========================================
    if (action === 'get_live_tv') {
        const { cursor } = req.query;
        try {
            let url = `https://huhu.to/live/catalog/live/channels.json?region=FR&language=fr&sort=trending`;
            if (cursor) url += `&cursor=${cursor}`;
            
            const response = await fetch(url, {
                method: 'GET', 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://huhu.to/',
                    'Origin': 'https://huhu.to'
                }
            });
            const data = await response.json();
            
            // ADAPTATION AUTOMATIQUE DU FORMAT
            if (!data.items) {
                if (data.channels) data.items = data.channels;
                else if (Array.isArray(data)) data.items = data;
                else data.items = [];
            }
            
            return res.json(data);
        } catch (error) { return res.status(500).json({ error: 'Erreur serveur TV' }); }
    }

    // ==========================================
    // PARTIE 1.5 : TV LIVE (Flux)
    // ==========================================
    if (action === 'get_live_stream') {
        const { channel_url } = req.query;
        try {
            const resolveUrl = `https://huhu.to/live/resolve?region=FR&language=fr&url=${encodeURIComponent(channel_url)}`;
            const response = await fetch(resolveUrl, {
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
                    'Referer': 'https://huhu.to/', 
                    'Origin': 'https://huhu.to' 
                }
            });
            
            const text = await response.text();
            let sources;
            try { sources = JSON.parse(text); } catch(e) { sources = text; }
            
            let streamUrl = null;
            
            // Si c'est une URL directe en texte brut
            if (typeof sources === 'string' && sources.startsWith('http')) {
                streamUrl = sources;
            } 
            // Si c'est un tableau
            else if (Array.isArray(sources)) {
                const valid = sources.find(s => s.url && !s.url.includes('vypn') && !s.url.includes('vavoo'));
                if (valid) streamUrl = valid.url;
            } 
            // Si c'est un objet
            else if (sources && typeof sources === 'object') {
                if (sources.url) streamUrl = sources.url;
                else if (sources.stream && sources.stream[0] && sources.stream[0].url) streamUrl = sources.stream[0].url;
                else if (sources.sources && sources.sources[0] && sources.sources[0].url) streamUrl = sources.sources[0].url;
            }
            
            if (streamUrl) return res.json({ success: true, url: streamUrl, referer: 'https://huhu.to' });
            else return res.status(404).json({ error: 'Flux introuvable. Réponse brute: ' + text.substring(0, 100) });
            
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
    // PARTIE 3 : FILMS & SÉRIES (Multi-Lecteurs)
    // ==========================================
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        let sources = [];
        
        if (type === 'tv') {
            let s = parseInt(season) || 1;
            let e = parseInt(episode) || 1;
            sources.push({ name: 'Lecteur 1 (VF/VOSTFR)', url: `https://www.2embed.cc/embedtv/${tmdb_id}&s=${s}&e=${e}`, lang: 'Multi' });
            sources.push({ name: 'Lecteur 2 (VF/VOSTFR)', url: `https://vidsrc.to/embed/tv/${tmdb_id}/${s}/${e}`, lang: 'Multi' });
            sources.push({ name: 'Lecteur 3 (VF/VOSTFR)', url: `https://multiembed.mov/?video_id=${tmdb_id}&tmdb=1&s=${s}&e=${e}`, lang: 'Multi' });
        } 
        else {
            sources.push({ name: 'Lecteur 1 (VF/VOSTFR)', url: `https://www.2embed.cc/embed/${tmdb_id}`, lang: 'Multi' });
            sources.push({ name: 'Lecteur 2 (VF/VOSTFR)', url: `https://vidsrc.to/embed/movie/${tmdb_id}`, lang: 'Multi' });
            sources.push({ name: 'Lecteur 3 (VF/VOSTFR)', url: `https://multiembed.mov/?video_id=${tmdb_id}&tmdb=1`, lang: 'Multi' });
        }

        return res.json({ success: true, type: 'embed', sources: sources });

    } catch (e) { 
        res.status(500).json({ error: 'Erreur serveur VOD: ' + e.message }); 
    }
}
