// Bedrijf opzoeken in het KvK-register, voor de offertetool.
// De KvK-sleutel staat veilig in de instellingen van Vercel (KVK_API_KEY),
// niet in de code en niet in de browser. Zonder sleutel geeft deze functie
// een nette melding en werkt de rest van de offertetool gewoon.

export default async function handler(req, res) {
  const naam = String(req.query.naam || "").trim();
  if (naam.length < 2) {
    res.status(400).json({ fout: "te-kort" });
    return;
  }
  const sleutel = process.env.KVK_API_KEY;
  if (!sleutel) {
    res.status(200).json({ fout: "geen-sleutel" });
    return;
  }
  try {
    const antwoord = await fetch(
      "https://api.kvk.nl/api/v2/zoeken?naam=" + encodeURIComponent(naam) + "&resultatenPerPagina=8",
      { headers: { apikey: sleutel } }
    );
    if (!antwoord.ok) {
      res.status(200).json({ fout: "kvk-status-" + antwoord.status });
      return;
    }
    const data = await antwoord.json();
    const resultaten = (data.resultaten || []).map((r) => {
      const a = (r.adres && r.adres.binnenlandsAdres) || {};
      const straat = [a.straatnaam, a.huisnummer, a.huisnummerToevoeging].filter(Boolean).join(" ");
      return {
        naam: r.naam || "",
        kvkNummer: r.kvkNummer || "",
        straat: straat,
        postcode: a.postcode || "",
        plaats: a.plaats || "",
        type: r.type || ""
      };
    }).filter((r) => r.naam);
    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json({ resultaten });
  } catch (fout) {
    res.status(200).json({ fout: "kvk-onbereikbaar" });
  }
}
