export default function handler(req, res) {
  const chapdoloConfig = {
    app_version: "1.0.0",
    force_update: false,
    maintenance: false,
    sources: {
      oha: "https://oha.to",
      huhu: "https://huhu.to"
    },
    scripts: {
      oha_extractor: "https://chapdolo.com/api/oha",
      huhu_extractor: "https://chapdolo.com/api/huhu"
    }
  };

  res.status(200).json(chapdoloConfig);
}
