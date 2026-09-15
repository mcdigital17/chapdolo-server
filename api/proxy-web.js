module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL manquante');

    try {
        const targetUrl = new URL(url);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': targetUrl.origin + '/'
            }
        });

        let contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            const baseTag = `<base href="${targetUrl.origin}/">`;
            const adBlockScript = `
            <script>
                window.open = function() { return null; };
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

            // DÉTRUIRE LA SÉCURITÉ HTTP X-Frame-Options et CSP
            res.removeHeader('X-Frame-Options');
            res.removeHeader('Content-Security-Policy');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            res.send(html);
        } else {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            const buffer = Buffer.from(await response.arrayBuffer());
            res.send(buffer);
        }
    } catch (error) {
        console.error('Proxy Web Error:', error);
        res.status(500).send('Erreur proxy web');
    }
}
