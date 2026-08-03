export default async function handler(req, res) {
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

        // Si c'est une page HTML, on injecte nos scripts anti-pubs
        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            // 1. Forcer les liens relatifs (CSS, JS, Images) à pointer vers le vrai site
            const baseTag = `<base href="${targetUrl.origin}/">`;
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}`);
            } else {
                html = baseTag + html;
            }

            // 2. Le script qui bloque les pubs et garde l'utilisateur dans l'appli
            const adBlockScript = `
            <script>
                const originalDomain = "${targetUrl.origin}";
                
                // A. Bloquer totalement l'ouverture de nouvelles fenêtres (Pop-ups de pubs)
                window.open = function() { console.log('Pop-up bloqué !'); return null; };
                
                // B. Intercepter les clics sur les liens
                document.addEventListener('click', function(e) {
                    let el = e.target;
                    while (el && el.tagName !== 'A') el = el.parentElement;
                    
                    if (el && el.href) {
                        // Si c'est un lien du site (film/série), on le force à rester dans l'iframe via le proxy
                        if (el.href.startsWith(originalDomain)) {
                            e.preventDefault();
                            window.location.href = '/api/proxy-web?url=' + encodeURIComponent(el.href);
                        } 
                        // Si c'est un lien externe (souvent une pub), on le bloque
                        else if (!el.href.startsWith('/api/proxy-web') && !el.href.startsWith('javascript:')) {
                            e.preventDefault();
                            console.log('Lien externe bloqué: ' + el.href);
                        }
                    }
                }, true);
            </script>`;
            
            if (html.includes('</head>')) {
                html = html.replace('</head>', `${adBlockScript}</head>`);
            } else {
                html += adBlockScript;
            }

            res.send(html);
        } else {
            // Si ce n'est pas du HTML (image, css, js), on renvoie juste le fichier
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Web Error:', error);
        res.status(500).send('Erreur serveur proxy web');
    }
}
