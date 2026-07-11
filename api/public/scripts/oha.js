// Script d'extraction Chapdolo - Moteur V1
function chapdoloExtractVideo() {
    let videoUrl = null;

    // 1. Cherche la balise vidéo principale
    const videoTag = document.querySelector('video');
    if (videoTag) {
        const sources = videoTag.querySelectorAll('source');
        if (sources.length > 0) {
            videoUrl = sources[sources.length - 1].src;
        } else if (videoTag.src) {
            videoUrl = videoTag.src;
        }
    }

    // 2. Cherche dans les iframes de lecteurs (très courant sur ces sites)
    if (!videoUrl) {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            if (iframe.src && (iframe.src.includes("player") || iframe.src.includes("embed"))) {
                videoUrl = iframe.src;
            }
        });
    }

    // 3. Envoi du lien à l'application Chapdolo
    if (videoUrl) {
        console.log("CHAPDOLO_VIDEO_URL:" + videoUrl);
    } else {
        // Si le lecteur n'a pas encore chargé, on réessaie 1 seconde plus tard
        setTimeout(chapdoloExtractVideo, 1000);
    }
}

// Nettoyage des pubs pendant que le lecteur charge
window.open = function() { return null; }; // Bloque les pop-ups
var adElements = document.querySelectorAll('[class*="ad"], [id*="ad"], [class*="popup"]');
adElements.forEach(function(el) { el.remove(); });

// Lancement de l'extraction
chapdoloExtractVideo();
