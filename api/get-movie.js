module.exports = async (req, res) => {
    const { tmdb_id, type } = req.query;
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        let requestBody;

        // Si c'est une série (type=tv), on demande la Saison 1 Épisode 1 par défaut
        if (type === 'tv') {
            requestBody = {
                language: "fr", region: "FR", type: "tv",
                ids: { tmdb_id: tmdb_id }, name: "",
                episode: 1, season: 1
            };
        } else {
            // Sinon, c'est un film
            requestBody = {
                language: "fr", region: "FR", type: "movie",
                ids: { tmdb_id: tmdb_id }, name: ""
            };
        }

        // 1. Demander les liens à huhu.to
        const huhuResponse = await fetch('https://huhu.to/mediaurl-source.json', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            },
            body: JSON.stringify(requestBody)
        });
        const sources = await huhuResponse.json();

        // 2. Transformer les URLs en URLs d'Embed (/e/) et filtrer celles qui sont vides
        const embedSources = sources.map(s => {
            if (!s.url || s.url === '') return null;
            // On ignore Streamtape car il bloque les serveurs Vercel
            if (s.url.includes('tape') || s.url.includes('stp')) return null; // Bloque Streamtape et ses variantes
            
            let embedUrl = s.url;
            if (embedUrl.includes('dood.')) embedUrl = embedUrl.replace('/w/', '/e/');
            else if (embedUrl.includes('mixdrop.')) embedUrl = embedUrl.replace('/f/', '/e/');
            
            return { name: s.name, url: embedUrl };
        }).filter(s => s !== null);

        if (embedSources.length === 0) {
            return res.status(404).json({ error: 'Aucun lecteur valide trouvé' });
        }

        // 3. Renvoyer les lecteurs propres
        res.json({ success: true, sources: embedSources });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
