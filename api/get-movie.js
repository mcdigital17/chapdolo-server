module.exports = async (req, res) => {
    const { tmdb_id } = req.query;
    if (!tmdb_id) return res.status(400).json({ error: 'TMDB ID manquant' });

    try {
        // 1. Demander les liens à huhu.to (en français)
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

        // 2. Chercher un lien Doodstream
        let doodUrl = sources.find(s => s.url && s.url.includes('dood'))?.url;

        if (!doodUrl) {
            return res.status(404).json({ error: 'Aucun serveur compatible trouvé' });
        }

        // 3. Scrapper Doodstream pour obtenir le vrai .mp4
        const doodDomain = new URL(doodUrl).origin;
        
        const doodPageRes = await fetch(doodUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const doodHtml = await doodPageRes.text();

        const passMatch = doodHtml.match(/(\/pass_md5\/[^"']+)/);
        const tokenMatch = doodHtml.match(/token["']?\s*[:=]\s*["']([^"']+)["']/);
        
        if (!passMatch || !tokenMatch) {
            // On renvoie le code HTML reçu pour voir ce que Doodstream répond à Vercel
            return res.status(500).json({ 
                error: 'Extraction échouée', 
                doodUrl: doodUrl, 
                htmlRecu: doodHtml.substring(0, 500) // On affiche les 500 premiers caractères
            });
        }

        const passRes = await fetch(doodDomain + passMatch[0], { 
            headers: { 
                'Referer': doodUrl, 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });
        const passText = await passRes.text();

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomStr = '';
        for(let i=0; i<10; i++) randomStr += chars.charAt(Math.floor(Math.random() * chars.length));

        const finalMp4 = passText + randomStr + '?token=' + tokenMatch[1] + '&expiry=';
        
        res.json({ success: true, url: finalMp4 });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
