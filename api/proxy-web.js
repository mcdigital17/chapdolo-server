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
            
            // 1. Corriger les chemins relatifs
            const baseTag = `<base href="${targetUrl.origin}/">`;
            
            // 2. Le Bouclier Anti-Pubs Ultime
            const adBlockScript = `
            <script>
                // A. Bloquer les pop-ups
                window.open = function() { return null; };
                
                // B. Intercepter les clics pour bloquer les redirections de pub
                document.addEventListener('click', function(e) {
                    let el = e.target;
                    while (el && el.tagName !== 'A') el = el.parentElement;
                    if (el && el.href) {
                        e.preventDefault(); 
                        let finalUrl = el.href;
                        if (el.getAttribute('href') && el.getAttribute('href').startsWith('/')) finalUrl = '${targetUrl.origin}' + el.getAttribute('href');
                        if (finalUrl.includes('${targetUrl.hostname}')) {
                            window.location.href = '/api/proxy-web?url=' + encodeURIComponent(finalUrl);
                        }
                    }
                }, true);

                // C. LE TUEUR DE PUBS : Détruit les fausses notifications (Gmail, WhatsApp) et les boutons piégés
                const observer = new MutationObserver(function() {
                    document.querySelectorAll('div, iframe, img').forEach(el => {
                        // Si l'élément a un z-index très élevé (par-dessus la vidéo) et qu'il n'est pas le lecteur vidéo lui-même
                        let style = window.getComputedStyle(el);
                        let zIndex = parseInt(style.zIndex);
                        if (zIndex > 999 && !el.querySelector('video') && el.tagName !== 'VIDEO') {
                            el.remove(); // On détruit la pub !
                        }
                    });
                });
                // On lance le détecteur dès que le body est prêt
                document.addEventListener('DOMContentLoaded', function() {
                    observer.observe(document.body, { childList: true, subtree: true });
                });
            </script>`;
            
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}${adBlockScript}`);
            } else {
                html = baseTag + adBlockScript + html;
            }

            res.send(html);
        } else {
            // Pour les autres fichiers (CSS, JS, Vidéos), on les fait passer en "Stream"
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            response.body.pipe(res);
        }
    } catch (error) {
        console.error('Proxy Web Error:', error);
        res.status(500).send('Erreur serveur proxy web');
    }
}
