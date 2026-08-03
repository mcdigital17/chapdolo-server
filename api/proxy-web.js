module.exports = (req, res) => {
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
            
            const baseTag = `<base href="${targetUrl.origin}/">`;
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}`);
            } else {
                html = baseTag + html;
            }

            const adBlockScript = `
            <script>
                const originalDomain = "${targetUrl.origin}";
                window.open = function() { console.log('Pop-up bloqué !'); return null; };
                document.addEventListener('click', function(e) {
                    let el = e.target;
                    while (el && el.tagName !== 'A') el = el.parentElement;
                    if (el && el.href) {
                        if (el.href.startsWith(originalDomain)) {
                            e.preventDefault();
                            window.location.href = '/api/proxy-web?url=' + encodeURIComponent(el.href);
                        } else if (!el.href.startsWith('/api/proxy-web') && !el.href.startsWith('javascript:')) {
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
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Web Error:', error);
        res.status(500).send('Erreur serveur proxy web');
    }
}
