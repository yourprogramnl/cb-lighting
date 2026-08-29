// Bedenkt een pakkende titel (hook) voor een bericht, met hulp van Claude (AI).
// Werkt alleen voor ingelogde beheerders, en alleen als in Vercel de
// omgevingsvariabele ANTHROPIC_API_KEY is ingesteld.

const SUPABASE_URL = "https://koxjqujkyupcswooajns.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveGpxdWpreXVwY3N3b29ham5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjI4MDcsImV4cCI6MjA5NDQzODgwN30.ugZ3zuYmU-Se3hSkL-68KjdsyaKYylbPvoLFKPkniyw";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ fout: "verkeerde-methode" }); return; }
  const sleutel = process.env.ANTHROPIC_API_KEY;
  if (!sleutel) { res.status(503).json({ fout: "niet-ingesteld" }); return; }

  // Alleen ingelogde beheerders mogen dit gebruiken. Hun inlogbewijs kan de
  // tabel met toegestane e-mailadressen lezen; bezoekers krijgen daar niets uit.
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) { res.status(401).json({ fout: "niet-ingelogd" }); return; }
  try {
    const controle = await fetch(SUPABASE_URL + "/rest/v1/cbl_allowed_emails?select=email&limit=1", {
      headers: { apikey: ANON_KEY, Authorization: "Bearer " + token }
    });
    const rijen = controle.ok ? await controle.json() : [];
    if (!Array.isArray(rijen) || !rijen.length) { res.status(401).json({ fout: "geen-toegang" }); return; }
  } catch (fout) {
    res.status(401).json({ fout: "geen-toegang" });
    return;
  }

  const tekst = String((req.body && req.body.tekst) || "").slice(0, 8000).trim();
  const eerdere = Array.isArray(req.body && req.body.eerdere) ? req.body.eerdere.slice(-8).map(String) : [];
  if (!tekst) { res.status(400).json({ fout: "geen-tekst" }); return; }

  const opdracht =
    "Je schrijft titels voor korte vakartikelen van Chris Bakker, specialist in lichtberekeningen " +
    "voor openbare verlichting (cb-lighting.nl). Hieronder staat de tekst van zijn nieuwe bericht. " +
    "Bedenk EEN pakkende Nederlandse titel die nieuwsgierig maakt om verder te lezen. " +
    "Regels: nuchter gewoon Nederlands, geen overdreven reclametaal, geen gedachtestreepje, " +
    "hoogstens 70 tekens, geen aanhalingstekens om de titel heen. " +
    (eerdere.length
      ? "Deze titels zijn al voorgesteld en wil hij niet; kom met een wezenlijk andere invalshoek: " + eerdere.join(" | ") + ". "
      : "") +
    "Antwoord met alleen de titel, niets anders.\n\nDe tekst van het bericht:\n" + tekst;

  const model = process.env.CLAUDE_MODEL || "claude-opus-5";
  const body = {
    model: model,
    max_tokens: 2000,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: opdracht }]
  };
  const headers = {
    "x-api-key": sleutel,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };
  // Vangnet voor de nieuwste modellen: bij een weigering probeert de server
  // zelf een ander Claude-model, zodat de knop gewoon een titel oplevert
  if (model.indexOf("claude-opus-5") === 0 || model.indexOf("claude-fable-5") === 0) {
    headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
    body.fallbacks = "default";
  }

  try {
    const antwoord = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    if (!antwoord.ok) { res.status(502).json({ fout: "ai-storing" }); return; }
    const data = await antwoord.json();
    if (data.stop_reason === "refusal") { res.status(502).json({ fout: "ai-storing" }); return; }
    let titel = "";
    (data.content || []).forEach(function (blok) {
      if (blok.type === "text" && blok.text) titel = blok.text;
    });
    titel = titel.trim().split("\n")[0]
      .replace(/^["'“‘]+|["'”’]+$/g, "")
      .replace(/—/g, ",")
      .trim();
    if (!titel) { res.status(502).json({ fout: "ai-storing" }); return; }
    res.status(200).json({ titel: titel });
  } catch (fout) {
    res.status(502).json({ fout: "ai-storing" });
  }
}
