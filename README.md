# CB-lighting website

Nieuwe site voor cb-lighting.nl (Chris Bakker, verlichtingsadvies en lichtberekeningen).

## Opzet

- Statische site (HTML/CSS/JS), geen bouwstap nodig. Klaar voor Vercel.
- Inhoud (teksten, nieuws, projecten, foto's, aanvragen) staat in Supabase, project `koxjqujkyupcswooajns`, tabellen met voorvoegsel `cbl_`, fotobucket `cbl-fotos`.
- `beheer.html` is het dashboard: inloggen met een account dat in de tabel `cbl_allowed_emails` staat. Tabbladen: Aanvragen, Nieuws, Projecten, Teksten, Foto's.
- Beveiliging via RLS: bezoekers kunnen alleen lezen en een contactaanvraag insturen. Schrijven kan alleen met een account op de whitelist (functie `app_private.cbl_is_allowed()`).

## Pagina's

index, lichtberekeningen, projecten, nieuws, over-cb-lighting, contact, beheer (niet in het menu, noindex).

## Lokaal bekijken

Vanuit deze map: `npx serve -l 4180 .` en dan http://localhost:4180
