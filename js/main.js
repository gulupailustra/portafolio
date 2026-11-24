// Fabián Carvajal · gulupa: idioma, filtros de la galería, copiar correo e imágenes pendientes
(function () {
  var root = document.documentElement;
  var LANG_KEY = "gulupa-lang";
  var CAT_KEY = "gulupa-cat";

  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function put(store, k, v) { try { window[store].setItem(k, v); } catch (e) {} }

  // Idioma
  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang);
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.set === lang));
    });
    document.querySelectorAll("[data-alt-" + lang + "]").forEach(function (el) {
      el.setAttribute("alt", el.getAttribute("data-alt-" + lang));
    });
    document.querySelectorAll("[data-aria-" + lang + "]").forEach(function (el) {
      el.setAttribute("aria-label", el.getAttribute("data-aria-" + lang));
    });
    document.querySelectorAll("[data-title-" + lang + "]").forEach(function (el) {
      el.setAttribute("title", el.getAttribute("data-title-" + lang));
    });
    var t = document.querySelector("meta[name='title-" + lang + "']");
    if (t) document.title = t.content;
    announceCount();
  }

  // Filtros
  var gallery = document.querySelector(".gallery");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var cats = chips.map(function (c) { return c.dataset.cat; });
  var current = "todo";

  function announceCount() {
    var s = document.getElementById("filter-status");
    if (!s || !gallery) return;
    var n = gallery.querySelectorAll("li:not([hidden])").length;
    var en = root.getAttribute("data-lang") === "en";
    var chip = chips.filter(function (c) { return c.dataset.cat === current; })[0];
    var name = chip ? chip.querySelector("[data-l='" + (en ? "en" : "es") + "']").textContent : "";
    if (current === "todo") s.textContent = en ? "Showing all " + n + " projects" : "Mostrando los " + n + " proyectos";
    else s.textContent = en ? "Showing " + n + " projects in " + name : "Mostrando " + n + " proyectos de " + name;
  }

  function setCat(cat, remember) {
    if (cats.indexOf(cat) === -1) cat = "todo";
    current = cat;
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.cat === cat)); });
    if (gallery) gallery.querySelectorAll("li").forEach(function (li) {
      li.hidden = !(cat === "todo" || (" " + li.dataset.cats + " ").indexOf(" " + cat + " ") !== -1);
    });
    if (remember) put("sessionStorage", CAT_KEY, cat);
    announceCount();
  }

  setLang(get("localStorage", LANG_KEY) || root.getAttribute("data-lang") || "es");

  if (gallery) {
    var fromHash = location.hash.replace("#", "");
    if (cats.indexOf(fromHash) !== -1) {
      setCat(fromHash, true);
      var g = document.getElementById("trabajo");
      if (g) g.scrollIntoView();
    } else {
      setCat(get("sessionStorage", CAT_KEY) || "todo", false);
    }
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest(".lang button");
    if (b) { setLang(b.dataset.set); put("localStorage", LANG_KEY, b.dataset.set); return; }

    var chip = ev.target.closest(".chip");
    if (chip) { setCat(chip.dataset.cat, true); return; }

    var op = ev.target.closest("[data-open]");
    if (op) { if (!op.closest("dialog")) opener = op; openStory(op.getAttribute("data-open")); return; }
    var cl = ev.target.closest("[data-close]");
    if (cl) { cl.closest("dialog").close(); return; }
    if (ev.target.matches && ev.target.matches("dialog.lb")) { ev.target.close(); return; }

    var c = ev.target.closest("[data-copy]");
    if (c) {
      var text = c.getAttribute("data-copy");
      var status = document.getElementById("copy-status");
      var en = root.getAttribute("data-lang") === "en";
      var ok = en ? "Email copied" : "Correo copiado";
      var fail = en ? "Select the email above and copy it" : "Selecciona el correo de arriba y cópialo";
      var done = function (msg) { if (status) status.textContent = msg; };
      try {
        navigator.clipboard.writeText(text).then(function () { done(ok); }, function () { selectMail(); done(fail); });
      } catch (e) { selectMail(); done(fail); }
    }
  });

  // Carrusel de inicio: cambia solo cada 10 segundos; se puede pausar, elegir con los puntos o arrastrar
  var hero = document.querySelector(".hero .slides");
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll(".slide"));
    var dots = Array.prototype.slice.call(document.querySelectorAll(".h-dot"));
    var pauseBtn = document.querySelector(".h-pause");
    var cur = 0, timer = null, paused = false, hovering = false;
    function show(k) {
      cur = (k + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        var on = i === cur;
        s.classList.toggle("is-active", on);
        if (on) { s.removeAttribute("aria-hidden"); s.removeAttribute("tabindex"); }
        else { s.setAttribute("aria-hidden", "true"); s.setAttribute("tabindex", "-1"); }
      });
      dots.forEach(function (d, i) { d.setAttribute("aria-current", String(i === cur)); });
    }
    function schedule() {
      clearInterval(timer); timer = null;
      if (!paused && !hovering && !document.hidden) timer = setInterval(function () { if (!busy && startX === null) show(cur + 1); }, 10000);
    }
    // Paso manual: la imagen nueva entra deslizándose (de derecha a izquierda al avanzar), sin fundido
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var busy = false;
    function place(el, x, anim) {
      el.style.transition = anim ? "transform .5s cubic-bezier(.22,.61,.36,1)" : "none";
      el.style.visibility = "visible"; el.style.opacity = "1"; el.style.zIndex = "1";
      el.style.transform = "translateX(" + x + "px)";
    }
    function settle(els, k) {
      els.forEach(function (el) { el.style.transition = "none"; });
      show(k);
      void hero.offsetWidth;
      els.forEach(function (el) { el.style.transform = ""; el.style.visibility = ""; el.style.opacity = ""; el.style.zIndex = ""; });
      void hero.offsetWidth;
      els.forEach(function (el) { el.style.transition = ""; });
      busy = false;
    }
    function slideTo(k, dir, fromDx) {
      k = (k + slides.length) % slides.length;
      if (k === cur || busy) return;
      if (still) { show(k); return; }
      busy = true;
      var W = hero.clientWidth, a = slides[cur], n = slides[k];
      place(a, fromDx || 0, false); place(n, dir * W + (fromDx || 0), false);
      void hero.offsetWidth;
      place(a, -dir * W, true); place(n, 0, true);
      var done = false;
      function fin() { if (done) return; done = true; settle([a, n], k); }
      n.addEventListener("transitionend", fin, { once: true });
      setTimeout(fin, 700);
    }
    dots.forEach(function (d) { d.addEventListener("click", function () {
      var k = +d.dataset.go; slideTo(k, k > cur ? 1 : -1); schedule();
    }); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () {
      paused = !paused; pauseBtn.setAttribute("aria-pressed", String(paused));
      var en = root.getAttribute("data-lang") === "en";
      pauseBtn.querySelector('[data-l="es"]').textContent = paused ? "Reanudar" : "Pausar";
      pauseBtn.querySelector('[data-l="en"]').textContent = paused ? "Play" : "Pause";
      schedule();
    });
    var area = document.querySelector(".hero");
    area.addEventListener("mouseenter", function () { hovering = true; schedule(); });
    area.addEventListener("mouseleave", function () { hovering = false; schedule(); });
    area.addEventListener("focusin", function () { hovering = true; schedule(); });
    area.addEventListener("focusout", function () { hovering = false; schedule(); });
    document.addEventListener("visibilitychange", schedule);

    // Arrastrar con el mouse o deslizar con el dedo: la imagen sigue el gesto y deja ver la siguiente
    var startX = null, startY = 0, dx = 0, dragging = false, moved = false, peek = null, dir = 0;
    hero.addEventListener("dragstart", function (e) { e.preventDefault(); });
    hero.addEventListener("pointerdown", function (e) {
      if (busy || (e.pointerType === "mouse" && e.button !== 0)) return;
      startX = e.clientX; startY = e.clientY; dx = 0; dragging = false; moved = false; peek = null; dir = 0;
    });
    hero.addEventListener("pointermove", function (e) {
      if (startX === null) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        dragging = true; hero.classList.add("is-dragging");
        try { hero.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (!dragging) return;
      var W = hero.clientWidth, d = dx < 0 ? 1 : -1;
      if (d !== dir) {
        if (peek) { peek.style.transform = ""; peek.style.visibility = ""; peek.style.opacity = ""; peek.style.zIndex = ""; }
        dir = d; peek = slides[(cur + d + slides.length) % slides.length];
      }
      place(slides[cur], dx, false);
      place(peek, dir * W + dx, false);
    });
    function endDrag() {
      if (startX === null) return;
      var W = hero.clientWidth, a = slides[cur];
      if (dragging) {
        moved = true;
        if (Math.abs(dx) > Math.min(80, W * 0.12)) {
          busy = true;
          var k = (cur + dir + slides.length) % slides.length, n = peek;
          place(a, -dir * W, true); place(n, 0, true);
          var done = false;
          var fin = function () { if (done) return; done = true; settle([a, n], k); };
          n.addEventListener("transitionend", fin, { once: true });
          setTimeout(fin, 700);
          schedule();
        } else {
          busy = true;
          var p2 = peek;
          place(a, 0, true); if (p2) place(p2, dir * W, true);
          setTimeout(function () { settle(p2 ? [a, p2] : [a], cur); }, 520);
        }
      }
      hero.classList.remove("is-dragging");
      startX = null; dragging = false;
    }
    hero.addEventListener("pointerup", endDrag);
    hero.addEventListener("pointercancel", endDrag);
    // si se arrastró, no abrir el proyecto al soltar
    hero.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);

    schedule();
  }

  // Botones flotantes: aparecen al bajar; el de escribir se oculta cuando se ve la sección de contacto
  function onScroll() { root.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  var contacto = document.getElementById("contacto");
  if (contacto && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { root.classList.toggle("at-contact", es[0].isIntersecting); }).observe(contacto);
  }
  document.addEventListener("click", function (ev) {
    if (!ev.target.closest("[data-top]")) return;
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    var b = document.querySelector(".brand");
    if (b) b.focus({ preventScroll: true });
  });

  // Relatos: ventana con las páginas de cada relato
  var opener = null;
  function openStory(id) {
    var d = document.getElementById(id);
    if (!d || typeof d.showModal !== "function") return;
    var cur = document.querySelector("dialog.lb[open]");
    if (cur && cur !== d) cur.close();
    if (!d.open) d.showModal();
    var body = d.querySelector(".lb-body");
    if (body) body.scrollTop = 0;
    root.classList.add("lb-open");
  }
  document.querySelectorAll("dialog.lb").forEach(function (d) {
    d.addEventListener("close", function () {
      setTimeout(function () {
        if (!document.querySelector("dialog.lb[open]")) {
          root.classList.remove("lb-open");
          if (opener) opener.focus();
        }
      }, 0);
    });
  });

  function selectMail() {
    var m = document.querySelector(".mail");
    if (!m || !window.getSelection) return;
    var r = document.createRange(); r.selectNodeContents(m);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  // Imágenes que todavía no existen: se muestra el espacio reservado
  function markEmpty(img) {
    var f = img.closest(".fig, .tile");
    if (f) f.classList.add("is-empty");
  }
  document.querySelectorAll("img[data-ph]").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markEmpty(img);
    img.addEventListener("error", function () { markEmpty(img); });
  });
  // Menú de celular
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    var setMenu = function (open) {
      root.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", function () { setMenu(!root.classList.contains("menu-open")); });
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("click", function (e) {
      if (root.classList.contains("menu-open") && !e.target.closest(".top")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("menu-open")) { setMenu(false); menuBtn.focus(); }
    });
    var wide = window.matchMedia("(min-width: 1081px)");
    var onWide = function (e) { if (e.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide); else if (wide.addListener) wide.addListener(onWide);
  }
  // Animaciones en video: se mueven solas (salvo con movimiento reducido) y se pueden pausar
  document.querySelectorAll("video[data-anim]").forEach(function (v) {
    var btn = v.parentNode.querySelector(".anim-btn");
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var userPaused = still;
    function sync() { if (btn) btn.classList.toggle("is-paused", v.paused); }
    function tryPlay() { var p = v.play(); if (p && p.catch) p.catch(function () { sync(); }); }
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    if (btn) btn.addEventListener("click", function () {
      if (v.paused) { userPaused = false; tryPlay(); } else { userPaused = true; v.pause(); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (!userPaused) tryPlay(); }
          else if (!v.paused) { v.pause(); }
        });
      }, { threshold: 0.25 }).observe(v);
    } else if (!userPaused) { tryPlay(); }
    sync();
  });
  // Modo oscuro: el botón guarda la elección; sin elección se sigue el tema del sistema
  var THEME_KEY = "gulupa-theme";
  var themeBtns = document.querySelectorAll(".theme-btn");
  function applyTheme(t, save) {
    root.setAttribute("data-theme", t);
    themeBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(t === "dark")); });
    if (save) put("localStorage", THEME_KEY, t);
  }
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
  themeBtns.forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true); });
  });
  if (window.matchMedia) {
    var sys = window.matchMedia("(prefers-color-scheme: dark)");
    var onSys = function (e) { var saved = get("localStorage", THEME_KEY); if (saved !== "light" && saved !== "dark") applyTheme(e.matches ? "dark" : "light", false); };
    if (sys.addEventListener) sys.addEventListener("change", onSys); else if (sys.addListener) sys.addListener(onSys);
  }
})();
