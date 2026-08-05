module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('URL manquante');
    }

    try {
        const targetUrl = new URL(url);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': targetUrl.origin + '/'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        res.setHeader('Content-Type', contentType);

        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            // 1. Corriger les chemins relatifs (CSS, JS, Images)
            const baseTag = `<base href="${targetUrl.origin}/">`;
            
            // 2. Le script intelligent qui intercepte les "Bundles"
                       const adBlockScript = `
            <script>
                // A. Bloquer totalement l'ouverture de nouvelles fenêtres (Pop-ups de pubs)
                window.open = function() { console.log('Pop-up bloqué !'); return null; };
                
                // B. Bloquer les redirections invisibles (souvent utilisées par les pubs)
                window.onbeforeunload = function() { return null; };

                // C. Intercepter les clics sur les liens et boutons
                document.addEventListener('click', function(e) {
                    let el = e.target;
                    while (el && el.tagName !== 'A') el = el.parentElement;
                    if (el && el.href) {
                        e.preventDefault(); // On annule l'action normale
                        let finalUrl = el.href;
                        if (el.getAttribute('href') && el.getAttribute('href').startsWith('/')) finalUrl = '${targetUrl.origin}' + el.getAttribute('href');
                        
                        // Si c'est un lien du site, on l'ouvre dans l'iframe via le proxy
                        if (finalUrl.includes('${targetUrl.hostname}')) {
                            window.location.href = '/api/proxy-web?url=' + encodeURIComponent(finalUrl);
                        }
                    }
                }, true);
            </script>`;
