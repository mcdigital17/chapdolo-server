export default function handler(req, res) {
  // On dit à Vercel qu'on renvoie du code Javascript (et non du HTML ou du JSON)
  res.setHeader('Content-Type', 'application/javascript');
  
  // Le vrai script d'extraction qui sera envoyé à l'application
  const scriptContent = `
    function chapdoloExtractVideo() {
        let videoUrl = null;
        const videoTag = document.querySelector('video');
        if (videoTag) {
            const sources = videoTag.querySelectorAll('source');
            if (sources.length > 0) {
                videoUrl = sources[sources.length - 1].src;
            } else if (videoTag.src) {
                videoUrl = videoTag.src;
            }
        }
        if (!videoUrl) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.src && (iframe.src.includes("player") || iframe.src.includes("embed"))) {
                    videoUrl = iframe.src;
                }
            });
        }
        if (videoUrl) {
            console.log("CHAPDOLO_VIDEO_URL:" + videoUrl);
        } else {
            setTimeout(chapdoloExtractVideo, 1000);
        }
    }
    window.open = function() { return null; };
    var adElements = document.querySelectorAll('[class*="ad"], [id*="ad"], [class*="popup"]');
    adElements.forEach(function(el) { el.remove(); });
    chapdoloExtractVideo();
  `;

  // On envoie le script
  res.status(200).send(scriptContent);
}
