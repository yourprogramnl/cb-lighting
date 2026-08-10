// Gedeelde logica voor alle pagina's:
// - menu op mobiel
// - aanpasbare teksten laden uit de database (data-tekst)
// - foto's laden uit de fotobucket (data-foto)
(function () {
  var C = window.CBL_CONFIG;

  // --- Menu ---
  var knop = document.querySelector(".hamburger");
  var menu = document.querySelector(".menu");
  if (knop && menu) {
    knop.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    // Tik je naast het menu, dan gaat het dicht
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("open") && !menu.contains(e.target)) {
        menu.classList.remove("open");
      }
    });
  }

  // --- Jaartal in de voettekst ---
  var jr = document.querySelector("[data-jaar]");
  if (jr) jr.textContent = new Date().getFullYear();

  // --- Hulpfunctie: lezen uit de database via de openbare API ---
  window.cblLees = function (pad) {
    return fetch(C.SUPABASE_URL + "/rest/v1/" + pad, {
      headers: { apikey: C.SUPABASE_ANON_KEY, Authorization: "Bearer " + C.SUPABASE_ANON_KEY }
    }).then(function (r) {
      if (!r.ok) throw new Error("Database gaf status " + r.status);
      return r.json();
    });
  };

  // --- Hulpfunctie: iets insturen (alleen voor het contactformulier) ---
  window.cblStuur = function (tabel, data) {
    return fetch(C.SUPABASE_URL + "/rest/v1/" + tabel, {
      method: "POST",
      headers: {
        apikey: C.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + C.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error("Insturen mislukt (status " + r.status + ")");
    });
  };

  // --- Datum netjes in het Nederlands ---
  window.cblDatum = function (iso) {
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return iso; }
  };

  // --- Veilig tekst in een element zetten, met alinea's ---
  window.cblVulTekst = function (el, tekst) {
    el.textContent = "";
    var stukken = String(tekst).split(/\n\s*\n/);
    stukken.forEach(function (stuk, i) {
      if (el.dataset.enkel !== undefined) {
        // Eén regel tekst, geen alinea's (bijv. telefoonnummer)
        el.textContent = String(tekst);
        return;
      }
      var p = document.createElement("p");
      p.textContent = stuk.trim();
      el.appendChild(p);
    });
  };

  // --- Aanpasbare teksten laden ---
  window.cblTekstenKlaar = window.cblLees("cbl_teksten?select=sleutel,inhoud").then(function (rijen) {
    var map = {};
    rijen.forEach(function (r) { map[r.sleutel] = r.inhoud; });

    document.querySelectorAll("[data-tekst]").forEach(function (el) {
      var sleutel = el.dataset.tekst;
      if (map[sleutel] !== undefined && map[sleutel] !== "") {
        window.cblVulTekst(el, map[sleutel]);
      }
    });

    // E-mail en telefoon ook als link laten werken
    var email = (map["contact_email"] || "").trim();
    document.querySelectorAll("[data-maillink]").forEach(function (a) {
      if (email) { a.href = "mailto:" + email; a.textContent = email; }
    });
    var tel = (map["contact_telefoon"] || "").trim();
    document.querySelectorAll("[data-tellink]").forEach(function (a) {
      if (tel) {
        a.href = "tel:" + tel.replace(/[^+\d]/g, "");
        a.textContent = tel;
        var blok = a.closest("[data-telblok]");
        if (blok) blok.style.display = "";
      }
    });
    // Belknop in de bovenbalk (alleen zichtbaar op telefoons, via CSS)
    if (tel) {
      var belknop = document.querySelector(".belknop");
      if (belknop) {
        belknop.href = "tel:" + tel.replace(/[^+\d]/g, "");
        document.body.classList.add("tel-actief");
      }
    }

    // --- Foto's op vaste plekken ---
    var versie = map["_fotoversie"] || "1";
    document.querySelectorAll("[data-foto]").forEach(function (el) {
      var slot = el.dataset.foto;
      var url = C.SUPABASE_URL + "/storage/v1/object/public/" + C.FOTO_BUCKET + "/" + slot + ".jpg?v=" + versie;
      var img = new Image();
      img.onload = function () {
        if (el.tagName === "IMG") { el.src = url; }
        else { el.style.backgroundImage = "url('" + url + "')"; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; }
        el.classList.add("heeft-foto");
      };
      img.src = url;
    });

    // KvK-nummer in de onderbalk, zodra het via het beheer is ingevuld
    var kvk = (map["contact_kvk"] || "").trim();
    if (kvk) {
      document.querySelectorAll(".onderbalk .wrap").forEach(function (balk) {
        var s = document.createElement("span");
        s.textContent = "KvK " + kvk;
        balk.appendChild(s);
      });
    }

    return map;
  }).catch(function (e) {
    // Als de database niet bereikbaar is, blijft de vaste tekst uit de pagina staan.
    console.warn("Teksten laden lukte niet:", e);
    return {};
  });

  // --- Bewerk-stand: alleen laden als er #bewerken (of ?bewerken=1) in het adres staat ---
  if (new URLSearchParams(location.search).has("bewerken") || location.hash === "#bewerken") {
    var s1 = document.createElement("script");
    s1.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    s1.onload = function () {
      var s2 = document.createElement("script");
      s2.src = "js/bewerk.js";
      document.body.appendChild(s2);
    };
    document.body.appendChild(s1);
  }
})();
