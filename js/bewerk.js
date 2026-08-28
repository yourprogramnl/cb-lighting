// Bewerk-stand: de site zelf aanpassen door op potloodjes en fotoknoppen te klikken.
// Wordt alleen geladen als er ?bewerken=1 in het adres staat (zie site.js) en werkt
// alleen met een ingelogd beheeraccount.
(function () {
  var C = window.CBL_CONFIG;
  var sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

  var stijl = document.createElement("style");
  stijl.textContent = [
    ".bw-balk{position:fixed;left:0;right:0;bottom:0;z-index:99;background:#0c1929;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:16px;box-shadow:0 -6px 20px rgba(0,0,0,.25)}",
    ".bw-balk b{color:#f2a93b}",
    ".bw-balk a{background:#f2a93b;color:#0c1929;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:8px}",
    ".bw-balk a.stil{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}",
    "[data-tekst],[data-rijtekst]{outline:2px dashed rgba(242,169,59,.65);outline-offset:6px;border-radius:2px;cursor:pointer}",
    "[data-tekst]:hover,[data-rijtekst]:hover{outline-style:solid;background:rgba(242,169,59,.1)}",
    ".bw-knop{position:absolute;top:-16px;right:-14px;z-index:10;width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#f2a93b;border:0;border-radius:999px;font-size:15px;line-height:1;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25)}",
    ".bw-fotoknop{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:10;background:#f2a93b;color:#0c1929;border:0;border-radius:999px;padding:9px 16px;font:700 14px Inter,sans-serif;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25)}",
    ".bw-sluier{position:fixed;inset:0;background:rgba(12,25,41,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}",
    ".bw-venster{background:#fff;border-radius:14px;max-width:720px;width:100%;max-height:88vh;display:flex;flex-direction:column;overflow:hidden}",
    ".bw-venster h3{font:700 19px Inter,sans-serif;color:#1d2733;padding:18px 22px 0}",
    ".bw-venster p.uitleg{font:400 14px Inter,sans-serif;color:#5c6b7a;padding:4px 22px 0}",
    ".bw-venster textarea{flex:1;margin:14px 22px;min-height:220px;font:400 17px/1.6 Inter,sans-serif;padding:12px;border:1.5px solid #e3e9ef;border-radius:10px;resize:none}",
    ".bw-taal{margin:0 22px 10px;font:400 14px/1.5 Inter,sans-serif;color:#5c6b7a;max-height:140px;overflow:auto}",
    ".bw-taal .fout{color:#8c1d18}",
    ".bw-taal .goed{color:#14572c;font-weight:600}",
    ".bw-voet{display:flex;gap:10px;align-items:center;padding:0 22px 18px;flex-wrap:wrap}",
    ".bw-voet button{font:700 16px Inter,sans-serif;border:0;border-radius:8px;padding:11px 22px;cursor:pointer}",
    ".bw-opslaan{background:#f2a93b;color:#0c1929}",
    ".bw-weg{background:#f5f8fb;color:#1d2733;border:1px solid #e3e9ef !important}",
    ".bw-status{font:400 15px Inter,sans-serif;color:#14572c}",
    "body{padding-bottom:70px}",
    "@media (max-width:600px){.bw-balk{font-size:13px;gap:8px;padding:10px 12px}.bw-balk a{padding:8px 12px}body{padding-bottom:130px}}"
  ].join("\n");
  document.head.appendChild(stijl);

  sb.auth.getSession().then(function (res) {
    if (!res.data || !res.data.session) {
      window.location.href = "beheer.html";
      return;
    }
    start();
  });

  function start() {
    // Balk onderaan
    var balk = document.createElement("div");
    balk.className = "bw-balk";
    balk.innerHTML = "<span>U kunt de site nu aanpassen: klik op een <b>tekst</b> om die te veranderen, of op <b>Foto vervangen</b>.</span>" +
      '<a class="stil" href="beheer.html">Terug naar het beheer</a>' +
      '<a href="#" class="bw-klaar">Klaar met aanpassen</a>';
    document.body.appendChild(balk);
    balk.querySelector(".bw-klaar").addEventListener("click", function (e) {
      e.preventDefault();
      history.replaceState(null, "", location.pathname);
      location.reload();
    });

    // Uitklapvragen (FAQ) allemaal open, zodat ook de antwoorden aan te klikken zijn
    document.querySelectorAll("details").forEach(function (d) { d.open = true; });

    // Links binnen de site houden de bewerk-stand vast, zodat u kunt doorklikken
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href") || "";
      var binnen = /^[a-z-]+\.html/.test(h) || /^\/(projecten|nieuws)\//.test(h) || h === "/";
      if (binnen && h.indexOf("beheer") === -1 && h.indexOf("#") === -1) {
        a.setAttribute("href", h.split("?")[0] + "#bewerken");
      }
    });

    window.cblTekstenKlaar.then(function (map) {
      document.querySelectorAll("[data-tekst]").forEach(function (el) { maakTekstKnop(el, map); });
      document.querySelectorAll("[data-foto]").forEach(function (el) { maakFotoKnop(el); });
    });

    // Ook losse projecten en berichten zijn bewerkbaar; de pagina roept dit
    // nogmaals aan zodra de inhoud geladen is (die komt uit de database)
    window.cblBewerkRij = koppelRijen;
    koppelRijen();
  }

  // --- Teksten en foto's die bij één project of bericht horen ---
  function koppelRijen() {
    document.querySelectorAll("[data-rijtekst]").forEach(function (el) {
      if (el.dataset.bwKlaar) return;
      el.dataset.bwKlaar = "1";
      el.style.position = "relative";
      var d = el.dataset.rijtekst.split("|"); // tabel|veld|id
      var knop = document.createElement("button");
      knop.className = "bw-knop";
      knop.type = "button";
      knop.textContent = "✏️";
      knop.title = "Tekst aanpassen";
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openVenster(huidigeTekst(el, {}), el.dataset.enkel !== undefined, function (nieuw, klaar) {
          var wijziging = {};
          wijziging[d[1]] = nieuw;
          sb.from(d[0]).update(wijziging).eq("id", d[2]).then(function (res) {
            if (res.error) { klaar("Opslaan is niet gelukt. Probeer het nog eens."); return; }
            var eigenKnop = el.querySelector(".bw-knop");
            window.cblVulTekst(el, nieuw);
            if (eigenKnop) el.appendChild(eigenKnop);
            if (el.tagName === "H1") document.title = nieuw + " | CB-lighting";
            klaar(null);
          });
        });
      });
      el.appendChild(knop);
    });

    document.querySelectorAll("[data-rijfoto]").forEach(function (el) {
      if (el.dataset.bwKlaar) return;
      el.dataset.bwKlaar = "1";
      el.style.position = "relative";
      el.style.display = ""; // ook tonen als er nog geen foto is, anders valt er niets te kiezen
      var d = el.dataset.rijfoto.split("|"); // tabel|veld|id|map
      var img = el.querySelector("img");
      if (img && !img.getAttribute("src")) img.src = "/assets/nieuws-standaard.png";
      var knop = document.createElement("button");
      knop.className = "bw-fotoknop";
      knop.type = "button";
      knop.textContent = "📷 Foto vervangen";
      var invoer = document.createElement("input");
      invoer.type = "file";
      invoer.accept = "image/*";
      invoer.style.display = "none";
      knop.addEventListener("click", function () { invoer.click(); });
      invoer.addEventListener("change", function () {
        var f = invoer.files[0];
        if (!f) return;
        knop.textContent = "Bezig met uploaden...";
        var ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        var pad = d[3] + "/" + Date.now() + "." + ext;
        var url = C.SUPABASE_URL + "/storage/v1/object/public/" + C.FOTO_BUCKET + "/" + pad;
        sb.storage.from(C.FOTO_BUCKET).upload(pad, f, { contentType: f.type })
          .then(function (res) {
            if (res.error) throw res.error;
            var wijziging = {};
            wijziging[d[1]] = url;
            return sb.from(d[0]).update(wijziging).eq("id", d[2]);
          })
          .then(function (res) {
            if (res && res.error) throw res.error;
            if (img) {
              el.classList.remove("staand");
              img.src = url;
              if (window.cblFotoPas) window.cblFotoPas(img);
            }
            knop.textContent = "✔ Gelukt! Nog eens vervangen?";
          })
          .catch(function () { knop.textContent = "Mislukt, probeer opnieuw"; });
      });
      el.appendChild(knop);
      el.appendChild(invoer);
    });
  }

  function huidigeTekst(el, map) {
    var sleutel = el.dataset.tekst;
    if (map[sleutel] !== undefined && map[sleutel] !== "") return map[sleutel];
    // Lezen uit een kopie zonder de bewerk-knoppen, anders komt "Tekst aanpassen" mee
    var kopie = el.cloneNode(true);
    kopie.querySelectorAll(".bw-knop,.bw-fotoknop,input[type=file]").forEach(function (k) { k.remove(); });
    if (el.dataset.enkel !== undefined) return kopie.textContent.trim();
    var alineas = [];
    kopie.querySelectorAll("p").forEach(function (p) { alineas.push(p.textContent.trim()); });
    return alineas.length ? alineas.join("\n\n") : kopie.textContent.trim();
  }

  function maakTekstKnop(el, map) {
    el.style.position = "relative";
    var knop = document.createElement("button");
    knop.className = "bw-knop";
    knop.type = "button";
    knop.textContent = "✏️";
    knop.title = "Tekst aanpassen";
    knop.setAttribute("aria-label", "Tekst aanpassen");
    // De hele tekst is klikbaar; het potloodje is het herkenningsteken
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openVenster(huidigeTekst(el, map), el.dataset.enkel !== undefined, function (nieuw, klaar) {
        sb.from("cbl_teksten").upsert({ sleutel: el.dataset.tekst, inhoud: nieuw, bijgewerkt: new Date().toISOString() })
          .then(function (res) {
            if (res.error) { klaar("Opslaan is niet gelukt. Probeer het nog eens."); return; }
            map[el.dataset.tekst] = nieuw;
            document.querySelectorAll('[data-tekst="' + el.dataset.tekst + '"]').forEach(function (zelfde) {
              // Potloodje even apart houden: het opnieuw vullen veegt de inhoud leeg
              var eigenKnop = zelfde.querySelector(".bw-knop");
              window.cblVulTekst(zelfde, nieuw);
              if (eigenKnop) zelfde.appendChild(eigenKnop);
            });
            klaar(null);
          });
      });
    });
    el.appendChild(knop);
  }

  function openVenster(tekst, enkeleRegel, bijOpslaan) {
    var sluier = document.createElement("div");
    sluier.className = "bw-sluier";
    sluier.innerHTML = '<div class="bw-venster"><h3>Tekst aanpassen</h3>' +
      '<p class="uitleg">' + (enkeleRegel ? "Pas de tekst aan en klik op Opslaan." : "Pas de tekst aan en klik op Opslaan. Een lege regel tussen twee stukken maakt een nieuwe alinea.") + "</p>" +
      '<textarea spellcheck="true" lang="nl"></textarea>' +
      '<div class="bw-taal"></div>' +
      '<div class="bw-voet"><button class="bw-opslaan" type="button">Opslaan</button><button class="bw-weg" type="button">Taal controleren</button><button class="bw-weg bw-sluit" type="button">Annuleren</button><span class="bw-status"></span></div></div>';
    var ta = sluier.querySelector("textarea");
    ta.value = tekst;
    if (enkeleRegel) ta.style.minHeight = "70px";
    // Het vak groeit mee met de tekst, met wat lucht eronder (tot de helft van het scherm, daarna scrollt het)
    function groeiMee() {
      ta.style.flex = "none"; // anders bepaalt de kolom de hoogte en doet onze meting niets
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight + 30, Math.round(window.innerHeight * 0.5)) + "px";
    }
    ta.addEventListener("input", groeiMee);
    setTimeout(groeiMee, 0);
    var st = sluier.querySelector(".bw-status");
    var taalUit = sluier.querySelector(".bw-taal");
    sluier.querySelector(".bw-sluit").addEventListener("click", function () { sluier.remove(); });
    sluier.querySelectorAll(".bw-weg")[0].addEventListener("click", function () {
      taalUit.innerHTML = "Bezig met controleren...";
      window.cblTaalcheck(ta.value).then(function (regels) {
        taalUit.innerHTML = "";
        regels.forEach(function (r) {
          var d = document.createElement("div");
          d.className = r.goed ? "goed" : "fout";
          d.textContent = r.tekst;
          taalUit.appendChild(d);
        });
      }).catch(function () { taalUit.textContent = "De taalcontrole is even niet bereikbaar."; });
    });
    sluier.querySelector(".bw-opslaan").addEventListener("click", function () {
      st.textContent = "Bezig met opslaan...";
      st.style.color = "#5c6b7a";
      bijOpslaan(ta.value.trim(), function (fout) {
        if (fout) { st.textContent = fout; st.style.color = "#8c1d18"; return; }
        st.textContent = "Opgeslagen! De site is bijgewerkt.";
        st.style.color = "#14572c";
        setTimeout(function () { sluier.remove(); }, 900);
      });
    });
    document.body.appendChild(sluier);
    ta.focus();
  }

  // Nederlandse taalcontrole via LanguageTool (gratis dienst)
  // Vaktermen die de controle niet als fout moet melden
  var VAKWOORDEN = ["dwg", "dxf", "armatuurkeuze", "verledding", "dimprofielen", "dimprofiel", "dialux", "npr", "nen", "lichtberekening", "lichtberekeningen", "gelijkmatigheid", "mastposities", "lichtpunthoogte", "cb-lighting"];
  window.cblTaalcheck = function (tekst) {
    return fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ language: "nl", text: tekst }).toString()
    }).then(function (r) { return r.json(); }).then(function (d) {
      var m = (d.matches || []).filter(function (x) {
        return VAKWOORDEN.indexOf(tekst.substr(x.offset, x.length).trim().toLowerCase()) === -1;
      }).slice(0, 10);
      if (!m.length) return [{ goed: true, tekst: "Geen taalfouten gevonden." }];
      return m.map(function (x) {
        var woord = tekst.substr(x.offset, x.length).trim();
        var tips = (x.replacements || []).slice(0, 3).map(function (v) { return v.value; }).join(", ");
        return { goed: false, tekst: '"' + woord + '": ' + x.message + (tips ? " Suggestie: " + tips : "") };
      });
    });
  };

  function maakFotoKnop(el) {
    el.style.position = "relative";
    var knop = document.createElement("button");
    knop.className = "bw-fotoknop";
    knop.type = "button";
    knop.textContent = "📷 Foto vervangen";
    var invoer = document.createElement("input");
    invoer.type = "file";
    invoer.accept = "image/*";
    invoer.style.display = "none";
    knop.addEventListener("click", function () { invoer.click(); });
    invoer.addEventListener("change", function () {
      var f = invoer.files[0];
      if (!f) return;
      knop.textContent = "Bezig met uploaden...";
      var slot = el.dataset.foto;
      sb.storage.from(C.FOTO_BUCKET).upload(slot + ".jpg", f, { upsert: true, contentType: f.type })
        .then(function (res) {
          if (res.error) throw res.error;
          return sb.from("cbl_teksten").upsert({ sleutel: "_fotoversie", inhoud: String(Date.now()) });
        })
        .then(function () {
          var url = C.SUPABASE_URL + "/storage/v1/object/public/" + C.FOTO_BUCKET + "/" + slot + ".jpg?v=" + Date.now();
          if (el.tagName === "IMG") { el.src = url; }
          else {
            el.style.backgroundImage = "url('" + url + "')";
            el.style.backgroundSize = "cover";
            el.style.backgroundPosition = el.dataset.fotofocus || "center";
          }
          el.classList.add("heeft-foto");
          knop.textContent = "✔ Gelukt! Nog eens vervangen?";
        })
        .catch(function () { knop.textContent = "Mislukt, probeer opnieuw"; });
    });
    el.appendChild(knop);
    el.appendChild(invoer);
  }
})();
