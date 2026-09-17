/* =========================================================
   Birthday Invitation — generic rendering engine
   Reads data/invite.json and builds the whole page.
   No event content is hardcoded here.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG_URL = "data/invite.json";
  var log = function (stage, extra) {
    if (extra !== undefined) console.log("[invite] " + stage, extra);
    else console.log("[invite] " + stage);
  };

  /* ---------- helpers ---------- */
  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };
  // A section/feature is ON unless explicitly set to false.
  var on = function (obj) {
    if (obj === false) return false;
    if (obj === undefined || obj === null) return false; // nothing to render
    if (typeof obj === "object" && obj.enabled === false) return false;
    return true;
  };
  var has = function (v) {
    return typeof v === "string" ? v.trim().length > 0 : v !== undefined && v !== null;
  };
  var show = function (node, visible) {
    if (!node) return;
    if (visible) node.removeAttribute("hidden");
    else node.setAttribute("hidden", "");
  };
  var setText = function (node, value) {
    if (!node) return false;
    if (has(value)) {
      node.textContent = value;
      show(node, true);
      return true;
    }
    show(node, false);
    return false;
  };
  // Images that 404 disappear instead of showing a broken icon.
  var safeImage = function (src, alt, onFail) {
    var img = new Image();
    img.alt = alt || "";
    img.loading = "lazy";
    img.addEventListener("error", function () {
      console.warn("[invite] image missing, hiding:", src);
      if (typeof onFail === "function") onFail(img);
      else if (img.parentNode) img.parentNode.removeChild(img);
    });
    img.src = src;
    return img;
  };
  var tpl = function (str, vars) {
    return String(str || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (m, key) {
      var parts = key.split(".");
      var cur = vars;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null) return "";
        cur = cur[parts[i]];
      }
      return cur == null ? "" : String(cur);
    });
  };
  var fmtDate = function (iso, fallback) {
    if (!has(iso)) return fallback || "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return fallback || iso;
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- boot ---------- */
  function fail(message, err) {
    console.error("[invite] FATAL:", message, err || "");
    var loader = $("#boot-loader");
    if (loader) loader.setAttribute("hidden", "");
    var box = $("#boot-error");
    var msg = $("#boot-error-message");
    if (msg) msg.textContent = message;
    show(box, true);
  }

  log("boot: starting");

  fetch(CONFIG_URL, { cache: "no-store" })
    .then(function (res) {
      log("boot: fetched config, status " + res.status);
      if (!res.ok) throw new Error("Could not load " + CONFIG_URL + " (HTTP " + res.status + ")");
      return res.text();
    })
    .then(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("data/invite.json contains invalid JSON: " + e.message);
      }
      log("boot: config parsed");
      if (!data || typeof data !== "object") throw new Error("invite.json must contain an object.");
      if (!data.celebrant || !has(data.celebrant.name)) {
        throw new Error('Required field missing: celebrant.name in data/invite.json');
      }
      render(data);
    })
    .catch(function (err) {
      fail(err && err.message ? err.message : "Unknown error loading the invitation.", err);
    });

  /* ---------- render ---------- */
  function render(data) {
    var celebrant = data.celebrant || {};
    var vars = {
      name: celebrant.name,
      age: celebrant.age,
      celebrant: celebrant,
      event: data.event || {},
      venue: (data.event || {}).venue || {},
      date: fmtDate((data.event || {}).date),
      time: (data.event || {}).time || "",
    };

    applyTheme(data.theme || {});
    applyMeta(data.meta || {}, celebrant);
    log("render: theme + meta applied");

    renderHero(data, vars);
    renderInvitation(data, vars);
    renderProfile(data, celebrant);
    renderEvent(data, vars);
    renderMemories(data);
    renderGallery(data);
    renderRsvp(data, vars);
    renderCandles(data);
    renderFooter(data);
    startCountdown(data, vars);
    renderNav(data);
    renderDecorations(data.decorations);
    setupMusic(data.music || {});

    show($("#app"), true);
    show($("#boot-loader"), false);
    setupReveal();
    setupLightbox();
    log("render: complete");
  }

  /* ---------- theme ---------- */
  function applyTheme(theme) {
    var root = document.documentElement;
    var map = {
      primary: "--primary",
      secondary: "--secondary",
      accent: "--accent",
      background: "--background",
      surface: "--surface",
      text: "--text",
    };
    Object.keys(map).forEach(function (k) {
      if (has(theme[k])) root.style.setProperty(map[k], theme[k]);
    });
    if (has(theme.radius)) root.style.setProperty("--radius", theme.radius);
    var fonts = theme.fonts || {};
    if (has(fonts.heading)) root.style.setProperty("--font-heading", fonts.heading);
    if (has(fonts.body)) root.style.setProperty("--font-body", fonts.body);

    var gf = theme.googleFonts;
    if (Array.isArray(gf) && gf.length) {
      var href =
        "https://fonts.googleapis.com/css2?" +
        gf
          .map(function (f) {
            return "family=" + String(f).trim().replace(/\s+/g, "+");
          })
          .join("&") +
        "&display=swap";
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.addEventListener("error", function () {
        console.warn("[invite] Google Fonts failed to load; using fallback fonts.");
      });
      document.head.appendChild(link);
    }
  }

  function applyMeta(meta, celebrant) {
    var title = has(meta.title) ? meta.title : celebrant.name + "'s Birthday";
    document.title = title;
    var d = document.querySelector('meta[name="description"]');
    if (d && has(meta.description)) d.setAttribute("content", meta.description);
    if (has(meta.favicon)) {
      var icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.href = meta.favicon;
    }
  }

  /* ---------- sections ---------- */
  function renderHero(data, vars) {
    var hero = data.hero;
    if (!on(hero)) return;
    var c = data.celebrant || {};
    var bg = $("#hero-bg");
    if (has(hero.backgroundImage)) {
      var probe = new Image();
      probe.onload = function () {
        bg.style.backgroundImage = 'url("' + hero.backgroundImage + '")';
      };
      probe.onerror = function () {
        console.warn("[invite] hero image missing, using gradient only.");
      };
      probe.src = hero.backgroundImage;
    }
    setText($("[data-hero-eyebrow]"), tpl(hero.eyebrow, vars));
    $("[data-hero-title]").textContent = tpl(has(hero.title) ? hero.title : "{{name}}", vars);
    var ageLine = has(hero.ageLabel)
      ? tpl(hero.ageLabel, vars)
      : has(c.age)
        ? "is turning " + c.age
        : "";
    setText($("[data-hero-age]"), ageLine);
    setText($("[data-hero-subtitle]"), tpl(hero.subtitle || c.tagline, vars));

    var btn = $("[data-hero-button]");
    var b = hero.button;
    if (on(b) && has(b.label)) {
      btn.textContent = tpl(b.label, vars);
      btn.setAttribute("href", has(b.href) ? b.href : "#rsvp");
      show(btn, true);
    }
    show($("#hero"), true);
  }

  function renderInvitation(data, vars) {
    var inv = data.invitation;
    if (!on(inv) || !has(inv.message)) return;
    setText($("[data-invitation-title]"), inv.title || "You're Invited");
    $("[data-invitation-message]").textContent = tpl(inv.message, vars);
    setText($("[data-invitation-signature]"), tpl(inv.signature, vars));
    show($("#invitation"), true);
  }

  function renderProfile(data, celebrant) {
    var p = data.profile !== undefined ? data.profile : {};
    if (!on(p)) return;
    setText($("[data-profile-title]"), p.title || "Meet " + celebrant.name);
    setText($("[data-profile-tagline]"), p.tagline || celebrant.tagline);

    var photo = has(p.photo) ? p.photo : celebrant.photo;
    var fig = $("[data-profile-figure]");
    var img = $("[data-profile-img]");
    if (has(photo)) {
      img.alt = p.photoAlt || celebrant.name;
      img.addEventListener("error", function () {
        show(fig, false);
        console.warn("[invite] profile photo missing, hiding.");
      });
      img.src = photo;
      show(fig, true);
    }

    var facts = p.facts || celebrant.facts;
    var list = $("[data-profile-facts]");
    if (Array.isArray(facts) && facts.length) {
      facts.forEach(function (f) {
        list.appendChild(el("li", null, typeof f === "string" ? f : f.text || ""));
      });
      show(list, true);
    }
    show($("#celebrant"), true);
  }

  function renderEvent(data, vars) {
    var ev = data.event;
    if (!on(ev)) return;
    var venue = ev.venue || {};
    setText($("[data-event-title]"), ev.title || "Party Details");
    var grid = $("[data-event-grid]");
    var cards = [];
    if (has(ev.date)) cards.push(["Date", fmtDate(ev.date), ev.dateNote]);
    if (has(ev.time)) cards.push(["Time", ev.time, ev.timeNote]);
    if (has(venue.name))
      cards.push([
        "Venue",
        venue.name,
        [venue.address, venue.city].filter(has).join(", "),
      ]);
    if (has(ev.dressCode)) cards.push(["Dress code", ev.dressCode, ""]);
    cards.forEach(function (c) {
      var card = el("div", "event-card");
      card.appendChild(el("div", "event-card__label", c[0]));
      card.appendChild(el("div", "event-card__value", c[1]));
      if (has(c[2])) card.appendChild(el("div", "event-card__sub", c[2]));
      grid.appendChild(card);
    });

    var mapQuery = [venue.name, venue.address, venue.city].filter(has).join(", ");
    var map = $("[data-event-map]");
    if (has(venue.mapUrl) || mapQuery) {
      map.href = has(venue.mapUrl)
        ? venue.mapUrl
        : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery);
      show(map, true);
    }
    show($("#event"), cards.length > 0);
  }

  function renderMemories(data) {
    var m = data.memories;
    if (!on(m) || !Array.isArray(m.items) || !m.items.length) return;
    setText($("[data-memories-title]"), m.title || "Our Memories");
    var list = $("[data-memories-list]");
    m.items.forEach(function (item) {
      var li = el("li", "tl-item");
      li.appendChild(el("span", "tl-item__dot"));
      var card = el("div", "tl-item__card");
      if (has(item.image)) {
        card.appendChild(
          safeImage(item.image, item.title || "Memory", function (img) {
            if (img.parentNode) img.parentNode.removeChild(img);
            card.classList.add("no-image");
          })
        );
      } else {
        card.classList.add("no-image");
      }
      var body = el("div", "tl-item__body");
      if (has(item.date)) body.appendChild(el("div", "tl-item__date", item.date));
      if (has(item.title)) body.appendChild(el("h3", "tl-item__title", item.title));
      if (has(item.text)) body.appendChild(el("p", "tl-item__text", item.text));
      card.appendChild(body);
      li.appendChild(card);
      list.appendChild(li);
    });
    show($("#memories"), true);
  }

  var galleryImages = [];

  function renderGallery(data) {
    var g = data.gallery;
    if (!on(g) || !Array.isArray(g.images) || !g.images.length) return;
    setText($("[data-gallery-title]"), g.title || "Photo Gallery");
    var grid = $("[data-gallery-grid]");
    g.images.forEach(function (item) {
      if (!has(item.src)) return;
      var btn = el("button", "gallery__item");
      btn.type = "button";
      btn.setAttribute("aria-label", "Open photo: " + (item.caption || item.alt || "photo"));
      var img = safeImage(item.src, item.alt || item.caption || "Party photo", function () {
        if (btn.parentNode) btn.parentNode.removeChild(btn);
        var idx = galleryImages.indexOf(item);
        if (idx > -1) galleryImages.splice(idx, 1);
        if (!grid.children.length) show($("#gallery"), false);
      });
      btn.appendChild(img);
      if (has(item.caption)) btn.appendChild(el("span", "gallery__cap", item.caption));
      galleryImages.push(item);
      btn.addEventListener("click", function () {
        openLightbox(galleryImages.indexOf(item));
      });
      grid.appendChild(btn);
    });
    show($("#gallery"), grid.children.length > 0);
  }

  function renderRsvp(data, vars) {
    var r = data.rsvp;
    if (!on(r)) return;
    setText($("[data-rsvp-title]"), r.title || "Will you join us?");
    setText($("[data-rsvp-note]"), tpl(r.note, vars));
    setText($("[data-rsvp-deadline]"), tpl(r.deadline, vars));
    var actions = $("[data-rsvp-actions]");
    var message = tpl(r.message || "Hi! I'd love to come to {{name}}'s birthday party.", vars);

    var add = function (label, href) {
      var a = el("a", "btn btn--primary", label);
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      actions.appendChild(a);
    };

    var w = r.whatsapp;
    if (on(w) && has(w.number)) {
      add(
        w.label || "RSVP on WhatsApp",
        "https://wa.me/" +
          String(w.number).replace(/[^\d]/g, "") +
          "?text=" +
          encodeURIComponent(tpl(w.message || message, vars))
      );
    }
    var p = r.phone;
    if (on(p) && has(p.number)) {
      add(p.label || "Call " + p.number, "tel:" + String(p.number).replace(/\s+/g, ""));
    }
    var e = r.email;
    if (on(e) && has(e.address)) {
      add(
        e.label || "RSVP by email",
        "mailto:" +
          e.address +
          "?subject=" +
          encodeURIComponent(tpl(e.subject || "RSVP", vars)) +
          "&body=" +
          encodeURIComponent(tpl(e.message || message, vars))
      );
    }
    var f = r.googleForm;
    if (on(f) && has(f.url)) add(f.label || "Fill the RSVP form", f.url);

    show($("#rsvp"), actions.children.length > 0);
  }

  function renderCandles(data) {
    var c = data.candles;
    if (!on(c)) return;
    setText($("[data-candles-title]"), c.title || "Make a wish");
    setText($("[data-candles-hint]"), c.hint || "Tap the cake to blow out the candles");
    var cake = $("#cake-btn");
    cake.addEventListener("click", function () {
      cake.classList.add("is-out");
      burstConfetti(data.theme || {});
      setTimeout(function () {
        cake.classList.remove("is-out");
      }, 2600);
    });
    show($("#candles"), true);
  }

  function renderFooter(data) {
    var f = data.footer !== undefined ? data.footer : {};
    if (!on(f)) return;
    var any = false;
    any = setText($("[data-footer-message]"), f.message) || any;
    any = setText($("[data-footer-hashtag]"), f.hashtag) || any;

    var s = data.social;
    var list = $("[data-socials]");
    if (on(s) && Array.isArray(s.links) && s.links.length) {
      s.links.forEach(function (link) {
        if (!has(link.url) || !has(link.label)) return;
        var li = el("li");
        var a = el("a", null, link.label);
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener";
        li.appendChild(a);
        list.appendChild(li);
      });
      if (list.children.length) {
        show(list, true);
        any = true;
      }
    }
    show($("#site-footer"), any);
  }

  function renderNav(data) {
    var nav = data.nav !== undefined ? data.nav : {};
    if (!on(nav)) return;
    var c = data.celebrant || {};
    var brand = $("[data-brand]");
    brand.textContent = has(nav.brand) ? nav.brand : c.name;

    var defaults = [
      ["invitation", "Invite"],
      ["celebrant", "About"],
      ["countdown", "Countdown"],
      ["event", "Details"],
      ["memories", "Memories"],
      ["gallery", "Gallery"],
      ["rsvp", "RSVP"],
    ];
    var items = Array.isArray(nav.links)
      ? nav.links.map(function (l) {
          return [String(l.target || "").replace("#", ""), l.label];
        })
      : defaults;

    var navEl = $("#site-nav");
    items.forEach(function (it) {
      var target = document.getElementById(it[0]);
      if (!target || target.hasAttribute("hidden")) return;
      var a = el("a", null, it[1]);
      a.href = "#" + it[0];
      a.addEventListener("click", closeNav);
      navEl.appendChild(a);
    });

    var burger = $("#nav-toggle");
    burger.addEventListener("click", function () {
      var open = navEl.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeNav();
    });
    function closeNav() {
      navEl.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Open menu");
    }
    show($("#site-header"), true);
  }

  /* ---------- countdown ---------- */
  function startCountdown(data, vars) {
    var cd = data.countdown;
    if (!on(cd)) return;
    var target = has(cd.target)
      ? cd.target
      : has((data.event || {}).date)
        ? data.event.date
        : null;
    if (!target) return;
    var when = new Date(target).getTime();
    if (isNaN(when)) {
      console.warn("[invite] countdown target is not a valid date:", target);
      return;
    }
    setText($("[data-countdown-title]"), cd.title || "Counting down");
    var labels = cd.labels || {};
    var defs = [
      ["days", labels.days || "Days"],
      ["hours", labels.hours || "Hours"],
      ["minutes", labels.minutes || "Minutes"],
      ["seconds", labels.seconds || "Seconds"],
    ];
    var grid = $("[data-countdown-grid]");
    var nums = {};
    defs.forEach(function (d) {
      var cell = el("div", "cd-cell");
      var num = el("span", "cd-cell__num", "00");
      cell.appendChild(num);
      cell.appendChild(el("span", "cd-cell__label", d[1]));
      grid.appendChild(cell);
      nums[d[0]] = num;
    });
    var msgs = cd.messages || {};
    var msgNode = $("[data-countdown-message]");
    show($("#countdown"), true);

    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    var tick = function () {
      var diff = when - Date.now();
      if (diff <= 0) {
        Object.keys(nums).forEach(function (k) {
          nums[k].textContent = "00";
        });
        setText(msgNode, tpl(msgs.finished || "The party has started!", vars));
        clearInterval(timer);
        return;
      }
      var s = Math.floor(diff / 1000);
      nums.days.textContent = pad(Math.floor(s / 86400));
      nums.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      nums.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      nums.seconds.textContent = pad(s % 60);
      setText(msgNode, tpl(msgs.counting, vars));
    };
    tick();
    var timer = setInterval(tick, 1000);
    log("countdown: running to " + new Date(when).toISOString());
  }

  /* ---------- decorations ---------- */
  function renderDecorations(deco) {
    if (!on(deco) || prefersReduced) return;
    var style = (deco && deco.style) || "balloons";
    var layer = $("#decorations");
    var palette =
      Array.isArray(deco && deco.colors) && deco.colors.length
        ? deco.colors
        : ["var(--primary)", "var(--secondary)", "var(--accent)"];
    var count = typeof deco.count === "number" ? deco.count : style === "confetti" ? 26 : 12;

    for (var i = 0; i < count; i++) {
      var node = el("span", "deco");
      var color = palette[i % palette.length];
      if (style === "confetti") {
        node.classList.add("deco--confetti");
        node.style.background = color;
      } else if (style === "party-hats") {
        node.classList.add("deco--hat");
        node.style.borderBottom = "26px solid " + color;
      } else if (style === "cake") {
        node.classList.add("deco--cake");
        node.textContent = "🎂";
      } else {
        node.classList.add("deco--balloon");
        node.style.background = color;
        node.style.color = color;
      }
      node.style.left = Math.random() * 96 + "%";
      node.style.animationDuration = 14 + Math.random() * 18 + "s";
      node.style.animationDelay = "-" + Math.random() * 20 + "s";
      layer.appendChild(node);
    }
    show(layer, true);
    log("decorations: " + style + " x" + count);
  }

  function burstConfetti(theme) {
    var layer = $("#confetti-layer");
    var colors = [
      theme.primary || "#ff5c8a",
      theme.secondary || "#7b5cff",
      theme.accent || "#ffc94d",
    ];
    var rect = ($("#cake-btn") || document.body).getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    for (var i = 0; i < 60; i++) {
      var p = el("span", "confetti-piece");
      p.style.background = colors[i % colors.length];
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      var angle = Math.random() * Math.PI * 2;
      var dist = 120 + Math.random() * 260;
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      p.style.animationDelay = Math.random() * 0.15 + "s";
      layer.appendChild(p);
      (function (node) {
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 1800);
      })(p);
    }
    log("confetti: burst");
  }

  /* ---------- music ---------- */
  function setupMusic(music) {
    var btn = $("#music-toggle");
    var audio = $("#bg-audio");
    if (!on(music) || !has(music.source)) {
      show(btn, false);
      return;
    }
    audio.loop = music.loop !== false;
    audio.volume = typeof music.volume === "number" ? Math.min(1, Math.max(0, music.volume)) : 0.4;
    audio.src = music.source;
    audio.addEventListener("error", function () {
      console.warn("[invite] music file missing; hiding the music button.");
      show(btn, false);
    });
    // Verify the file actually exists before offering the control.
    fetch(music.source, { method: "HEAD" })
      .then(function (res) {
        if (res.ok) show(btn, true);
        else {
          console.warn("[invite] music file not found (HTTP " + res.status + "); hiding music button.");
          show(btn, false);
        }
      })
      .catch(function () {
        console.warn("[invite] music file could not be checked; hiding music button.");
        show(btn, false);
      });
    btn.addEventListener("click", function () {
      if (audio.paused) {
        var play = audio.play();
        if (play && play.catch) {
          play.catch(function (e) {
            console.warn("[invite] playback blocked:", e && e.message);
            show(btn, false);
          });
        }
        btn.classList.add("is-playing");
        btn.setAttribute("aria-label", "Pause background music");
      } else {
        audio.pause();
        btn.classList.remove("is-playing");
        btn.setAttribute("aria-label", "Play background music");
      }
    });
    log("music: ready");
  }

  /* ---------- scroll reveal ---------- */
  function setupReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (prefersReduced || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) {
        n.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach(function (n) {
      io.observe(n);
    });
  }

  /* ---------- lightbox ---------- */
  var lbIndex = 0;
  var lastFocus = null;

  function openLightbox(index) {
    if (index < 0 || !galleryImages.length) return;
    lbIndex = index;
    lastFocus = document.activeElement;
    updateLightbox();
    show($("#lightbox"), true);
    $("#lb-close").focus();
  }
  function closeLightbox() {
    show($("#lightbox"), false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function step(delta) {
    lbIndex = (lbIndex + delta + galleryImages.length) % galleryImages.length;
    updateLightbox();
  }
  function updateLightbox() {
    var item = galleryImages[lbIndex];
    if (!item) return;
    var img = $("#lb-img");
    img.src = item.src;
    img.alt = item.alt || item.caption || "Party photo";
    $("#lb-caption").textContent = item.caption || "";
  }

  function setupLightbox() {
    var box = $("#lightbox");
    $("#lb-close").addEventListener("click", closeLightbox);
    $("#lb-prev").addEventListener("click", function () {
      step(-1);
    });
    $("#lb-next").addEventListener("click", function () {
      step(1);
    });
    box.addEventListener("click", function (ev) {
      if (ev.target === box) closeLightbox();
    });
    document.addEventListener("keydown", function (ev) {
      if (box.hasAttribute("hidden")) return;
      if (ev.key === "Escape") closeLightbox();
      if (ev.key === "ArrowRight") step(1);
      if (ev.key === "ArrowLeft") step(-1);
    });
    var sx = null;
    box.addEventListener(
      "touchstart",
      function (ev) {
        sx = ev.touches[0].clientX;
      },
      { passive: true }
    );
    box.addEventListener(
      "touchend",
      function (ev) {
        if (sx === null) return;
        var dx = ev.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
        sx = null;
      },
      { passive: true }
    );
  }
})();
