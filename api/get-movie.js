module.exports = async (req, res) => {
    const { tmdb_id } = req.query;
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        // 1. Demander les liens à huhu.to
        const huhuResponse = await fetch('https://huhu.to/mediaurl-source.json', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            },
            body: JSON.stringify({
                language: "fr",
                region: "FR",
                type: "movie",
                ids: { tmdb_id: tmdb_id },
                name: ""
            })
        });
        const sources = await huhuResponse.json();

        // 2. Transformer les URLs /w/ ou /f/ en URLs d'Embed /e/ (Lecteur sans pubs)
        const embedSources = sources.map(s => {
            if (!s.url) return null;
            let embedUrl = s.url;
            
            // Pour Doodstream : on change /w/ par /e/
            if (embedUrl.includes('dood.')) {
                embedUrl = embedUrl.replace('/w/', '/e/');
            } 
            // Pour Mixdrop : on change /f/ par /e/
            else if (embedUrl.includes('mixdrop.')) {
                embedUrl = embedUrl.replace('/f/', '/e/');
            }
            
            return { name: s.name, url: embedUrl };
        }).filter(s => s !== null); // On supprime les vide

        if (embedSources.length === 0) {
            return res.status(404).json({ error: 'Aucun lecteur compatible trouvé' });
        }

        // 3. Renvoyer les lecteurs propres à l'application
        res.json({ success: true, sources: embedSources });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
