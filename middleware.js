// Tijdelijk slot op de hele site: bezoekers zien alleen een onderhoudspagina.
// Wie één keer de geheime link opent (cb-lighting.nl/?toegang=lichtaan2026)
// krijgt een koekje in de browser en ziet de site daarna gewoon.
// Dit bestand weghalen (of hernoemen) en opnieuw publiceren = site weer open.

const SLEUTEL = "lichtaan2026";

const ONDERHOUD = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Even geduld | CB-lighting</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: grid; place-items: center;
      background: #0c1929; color: #fff;
      font: 400 18px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
      padding: 24px; text-align: center;
    }
    img { height: 44px; margin: 0 auto 22px; display: block; }
    h1 { font-size: 1.6rem; margin-bottom: 10px; }
    p { color: #cdd8e4; max-width: 420px; }
  </style>
</head>
<body>
  <div>
    <img src="/assets/logo-wit.png" alt="CB-lighting">
    <h1>Wij werken even aan de website</h1>
    <p>De site is tijdelijk niet beschikbaar. Kom binnenkort gerust terug.</p>
  </div>
</body>
</html>`;

export default function middleware(req) {
  const url = new URL(req.url);

  // De geheime link: zet het koekje en stuur door naar de gewone site
  if (url.searchParams.get("toegang") === SLEUTEL) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Set-Cookie": "cbl_toegang=" + SLEUTEL + "; Path=/; Max-Age=31536000; SameSite=Lax; Secure"
      }
    });
  }

  // Met koekje: gewoon doorlaten
  const koekjes = (req.headers.get("cookie") || "").split(/;\s*/);
  if (koekjes.includes("cbl_toegang=" + SLEUTEL)) return;

  // Plaatjes en stijl mogen door (nodig voor de onderhoudspagina zelf)
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/css/")) return;

  // Iedereen anders: onderhoudspagina, met het "tijdelijk"-signaal voor Google
  return new Response(ONDERHOUD, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "86400",
      "Cache-Control": "no-store"
    }
  });
}
