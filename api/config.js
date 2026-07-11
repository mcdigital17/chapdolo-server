export default function handler(req, res) {
  // Configuration dynamique de Chapdolo
  const chapdoloConfig = {
    app_version: "1.0.0",
    force_update: false,
    maintenance: false,
    sources: {
      oha: "https://oha.to",
      huhu: "https://huhu.to"
    },
    scripts: {
      oha_extractor: "https://chapdolo.com/scripts/oha.js",
      huhu_extractor: "https://chapdolo.com/scripts/huhu.js"
    }
  };

  res.status(200).json(chapdoloConfig);
}
