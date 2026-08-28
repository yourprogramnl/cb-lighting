// Zorgt dat project- en berichtpagina's hun eigen titel, samenvatting en foto
// al in de broncode hebben. Daardoor tonen LinkedIn, Facebook en WhatsApp bij het
// delen het echte artikel, en leest Google de juiste gegevens zonder javascript.
// /projecten/<naam> en /nieuws/<naam> komen hier binnen via vercel.json.

const SUPABASE_URL = "https://koxjqujkyupcswooajns.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveGpxdWpreXVwY3N3b29ham5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjI4MDcsImV4cCI6MjA5NDQzODgwN30.ugZ3zuYmU-Se3hSkL-68KjdsyaKYylbPvoLFKPkniyw";
const BASIS = "https://cb-lighting.nl";

function esc(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  const soort = req.query.soort === "project" ? "project" : "bericht";
  const slug = String(req.query.slug || "");
  const tabel = soort === "project" ? "cbl_projecten" : "cbl_nieuws";
  const tekstveld = soort === "project" ? "omschrijving" : "tekst";
  const pad = soort === "project" ? "projecten" : "nieuws";
  const sjabloon = soort === "project" ? "/project.html" : "/bericht.html";

  let rij = null;
  try {
    const antwoord = await fetch(
      SUPABASE_URL + "/rest/v1/" + tabel + "?select=*&gepubliceerd=eq.true&slug=eq." + encodeURIComponent(slug),
      { headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY } }
    );
    if (antwoord.ok) {
      const rijen = await antwoord.json();
      rij = rijen[0] || null;
    }
  } catch (fout) {
    // Bij een databasestoring tonen we de kale pagina; de browser probeert het dan zelf
  }

  let html;
  try {
    html = await (await fetch(BASIS + sjabloon)).text();
  } catch (fout) {
    res.status(500).send("De pagina kon niet geladen worden.");
    return;
  }

  if (rij) {
    const titel = esc(rij.titel);
    const beschrijving = esc(String(rij[tekstveld] || "").replace(/\s+/g, " ").trim().slice(0, 155));
    const url = BASIS + "/" + pad + "/" + rij.slug;
    const foto = esc(rij.foto_url || BASIS + "/assets/og.png");

    html = html
      .replace(/<title>[^<]*<\/title>/, function () { return "<title>" + titel + " | CB-lighting</title>"; })
      .replace(/(<meta name="description" content=")[^"]*(">)/, function (h, voor, na) { return voor + beschrijving + na; })
      .replace(/(<link rel="canonical" href=")[^"]*(")/, function (h, voor, na) { return voor + url + na; })
      .replace(/(<meta property="og:image" content=")[^"]*(">)/, function (h, voor, na) { return voor + foto + na; })
      .replace("</head>",
        '  <meta property="og:title" content="' + titel + '">\n' +
        '  <meta property="og:description" content="' + beschrijving + '">\n' +
        '  <meta property="og:url" content="' + url + '">\n' +
        '  <meta property="og:type" content="article">\n</head>');
    if (rij.foto_url) {
      // De vaste maatvermelding klopt alleen voor het standaardbeeld
      html = html.replace(/\s*<meta property="og:image:(?:width|height)" content="\d+">/g, "");
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=86400");
  res.status(rij ? 200 : 404).send(html);
}
