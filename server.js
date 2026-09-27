import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});

app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, apiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/generate-look", upload.single("photo"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY ist auf dem Server noch nicht eingerichtet." });
    }
    if (!req.file) return res.status(400).json({ error: "Bitte zuerst ein Foto hochladen." });

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Bitte JPG, PNG oder WEBP verwenden." });
    }

    const hairstyle = req.body.hairstyle || "bestehende Frisur";
    const hairColor = req.body.hairColor || "bestehende Haarfarbe";
    const outfit = req.body.outfit || "bestehende Kleidung";
    const mode = req.body.mode || "manual";

    const prompt = mode === "advisor"
      ? `Edit the supplied photo into a realistic, tasteful modern style makeover.
         Keep the person recognizably the same person: preserve facial identity, age, skin tone,
         body proportions, pose, expression, camera angle and background as closely as possible.
         Act as a conservative personal stylist. Choose a flattering contemporary hairstyle,
         harmonious natural-looking hair color and a modern wearable outfit.
         Do not beautify or reshape the face or body. Do not change other people in the image.
         Photorealistic result, natural texture and lighting.`
      : `Edit only the requested styling in the supplied photo.
         Hairstyle: ${hairstyle}.
         Hair color: ${hairColor}.
         Outfit: ${outfit}.
         Keep the person recognizably the same person: preserve facial identity, age, skin tone,
         body proportions, pose, expression, camera angle and background as closely as possible.
         Do not beautify or reshape the face or body. Do not change other people in the image.
         Make hair and clothing photorealistic, contemporary, wearable and naturally lit.`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const input = await toFile(req.file.buffer, req.file.originalname || "photo.png", {
      type: req.file.mimetype
    });

    const result = await client.images.edit({
      model: "gpt-image-2",
      image: input,
      prompt,
      size: "auto",
      quality: "medium"
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Die Bild-API hat kein Bild zurückgegeben.");

    res.json({ image: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error(err);
    const message =
      err?.status === 401 ? "API-Key ungültig oder nicht freigeschaltet." :
      err?.status === 429 ? "API-Limit erreicht oder API-Guthaben fehlt." :
      err?.message || "Unbekannter Fehler bei der Bildgenerierung.";
    res.status(err?.status >= 400 && err?.status < 600 ? err.status : 500).json({ error: message });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`LOOKWISE läuft auf Port ${port}`));
