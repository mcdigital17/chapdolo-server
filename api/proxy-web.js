module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL manquante');

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': new URL(url).origin + '/'
            }
        });

        let html = await response.text();
        
        // Supprimer les sécurités qui bloquent les TV
        html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
        html = html.replace(/X-Frame-Options/gi, 'X-Frame-Options-Disabled');

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Injecter un script pour bloquer les pubs
        const adBlock = `<script>window.open=function(){return null;};document.addEventListener('click',function(e){let el=e.target;while(el&&el.tagName!=='A')el=el.parentElement;if(el&&el.href){e.preventDefault();window.location.href='/api/proxy-web?url='+encodeURIComponent(el.href);}},true);</script>`;
        
        if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>${adBlock}`);
        } else {
            html = adBlock + html;
        }

        res.send(html);
    } catch (error) {
        res.status(500).send('Erreur proxy web');
    }
}
