module.exports = async (req, res) => {
    try {
        // On demande à huhu.to le catalogue des chaînes TV (type: tv)
        const response = await fetch('https://huhu.to/mediaurl-catalog.json', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            },
            body: JSON.stringify({
                language: "fr",
                region: "FR",
                type: "tv"
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erreur get-tv:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}
