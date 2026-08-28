// Sitemap voor Google: de vaste pagina's plus alle gepubliceerde projecten.
// Draait als klein functietje op Vercel; /sitemap.xml wijst hiernaartoe (zie vercel.json).

const SUPABASE_URL = "https://koxjqujkyupcswooajns.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveGpxdWpreXVwY3N3b29ham5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjI4MDcsImV4cCI6MjA5NDQzODgwN30.ugZ3zuYmU-Se3hSkL-68KjdsyaKYylbPvoLFKPkniyw";

export default async function handler(req, res) {
  const basis = "https://cb-lighting.nl";
  const vaste = [
    "/",
    "/lichtberekeningen.html",
    "/projecten.html",
    "/nieuws.html",
    "/over-cb-lighting.html",
    "/contact.html"
  ];

  let projecten = [];
  try {
    const antwoord = await fetch(
      SUPABASE_URL + "/rest/v1/cbl_projecten?select=slug&gepubliceerd=eq.true&slug=not.is.null&order=sortering.asc",
      { headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY } }
    );
    if (antwoord.ok) projecten = await antwoord.json();
  } catch (fout) {
    // Zonder database blijven in elk geval de vaste pagina's in de sitemap staan
  }

  const regels = [];
  vaste.forEach((pad) => regels.push("<url><loc>" + basis + pad + "</loc></url>"));
  projecten.forEach((p) => regels.push("<url><loc>" + basis + "/projecten/" + p.slug + "</loc></url>"));

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + regels.join("") + "</urlset>"
  );
}
