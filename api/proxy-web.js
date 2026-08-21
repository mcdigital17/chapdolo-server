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
        
        // 1. Détruire la sécurité X-Frame-Options pour que la TV puisse l'afficher
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            const baseTag = `<base href="${targetUrl.origin}/">`;
            
            // 2. Le script qui bloque les pubs ET ferme l'avertissement Franime
            const adBlockScript = `
            <script>
                window.open = function() { return null; };
                
                // Fermer automatiquement l'avertissement de sécurité de Franime
                setInterval(function() {
                    // Cherche un bouton qui contient le mot "Fermer" ou "Continue"
                    const btns = document.querySelectorAll('button, a');
                    btns.forEach(btn => {
                        if (btn.textContent.includes('Fermer') || btn.textContent.includes('Continue') || btn.textContent.includes('close')) {
                            btn.click();
                        }
                    });
                    // Cherche la modale d'avertissement et la cache
                    const modal = document.querySelector('div[class*="modal"], div[class*="Modal"], div[class*="overlay"]');
                    if (modal && modal.textContent.includes('Avertissement')) {
                        modal.style.display = 'none';
                    }
                }, 1000);
                
                // Bloquer les redirections de pub
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
            </script>`;
            
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}${adBlockScript}`);
            } else {
                html = baseTag + adBlockScript + html;
            }

            res.send(html);
        } else {
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Web Error:', error);
        res.status(500).send('Erreur serveur proxy web');
    }
}
