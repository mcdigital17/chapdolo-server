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
                        
                        // Si c'est un lien du site (lecteur vidéo), on l'ouvre dans l'iframe via le proxy
                        if (finalUrl.includes('${targetUrl.hostname}')) {
                            window.location.href = '/api/proxy-web?url=' + encodeURIComponent(finalUrl);
                        }
                        // Sinon c'est une pub, on ne fait rien (bloqué)
                    }
                }, true);

                // D. Cibler spécifiquement les iframes de pubs (Mixdrop en utilise parfois)
                const observer = new MutationObserver(function(mutations) {
                    document.querySelectorAll('iframe').forEach(frame => {
                        if (!frame.src.includes('mixdrop') && !frame.src.includes('dood') && !frame.src.includes('/api/proxy-web')) {
                            frame.remove(); // On détruit les iframes de pubs
                        }
                    });
                });
                observer.observe(document.body, { childList: true, subtree: true });
            </script>`;
            
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}${adBlockScript}`);
            } else {
                html = baseTag + adBlockScript + html;
            }

            res.send(html);
        } else {
            // Pour les autres fichiers (CSS, JS, Images), on les renvoie normalement
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Web Error:', error);
        res.status(500).send('Erreur serveur proxy web');
    }
}
