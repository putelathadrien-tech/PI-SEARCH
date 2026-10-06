(function () {
  "use strict";

  var P = window.PiSearch;
  var form = document.getElementById("search-form");
  var input = document.getElementById("q");
  var button = document.getElementById("go");
  var statusEl = document.getElementById("status");
  var results = document.getElementById("results");

  var manifest = null;   // { digits, chunkDigits, chunks }
  var firstChunk = null; // digits of chunk 0, kept in memory for instant answers
  var searchId = 0;      // bumps on every new search so old deep searches stop

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fmt(n) { return n.toLocaleString("en-US"); }

  function selectedEncoding() {
    return form.querySelector("input[name=enc]:checked").value;
  }

  function chunkUrl(i) { return "data/pi-" + String(i).padStart(3, "0") + ".bin"; }

  function fetchChunk(i) {
    return fetch(chunkUrl(i)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + chunkUrl(i));
      return r.arrayBuffer();
    }).then(function (buf) { return P.unpack(new Uint8Array(buf)); });
  }

  // ---------- Rendering ----------

  function lettersView(letters) {
    return el("div", { "class": "letters" }, letters.map(function (l) {
      return el("span", null, [el("b", { text: l.letter }), el("small", { text: l.code })]);
    }));
  }

  function digitsView(r) {
    var s = r.snip || P.context(firstChunk, r.position, r.code.length, 24);
    var lead = r.position <= 24 ? "3." : "…";
    return el("div", { "class": "digits" }, [
      el("span", { "class": "dim", text: lead + s.before }),
      el("mark", { text: s.match }),
      el("span", { "class": "dim", text: s.after + "…" })
    ]);
  }

  function hitLine(r, state) {
    if (r.position === -1) {
      var text = state.done
        ? " in the first " + fmt(state.searched) + " digits."
        : " in the first " + fmt(state.searched) + " digits yet. Still looking…";
      return el("p", null, [el("span", { "class": state.done ? "notfound" : "searching", text: "Not found" }), text]);
    }
    var parts = ["Found at position ", el("span", { "class": "found", text: fmt(r.position) })];
    if (r.count) {
      var times = r.capped ? fmt(r.count) + "+ times" : r.count === 1 ? "once" : fmt(r.count) + " times";
      parts.push(" (appears " + times + " in the first " + fmt(firstChunk.length) + " digits).");
    } else {
      parts.push(".");
    }
    return el("p", null, parts);
  }

  function resultBlock(r, state) {
    var parts = [lettersView(r.letters), hitLine(r, state)];
    if (r.position !== -1) parts.push(digitsView(r));
    return parts;
  }

  function piecesList(w) {
    return el("div", null, [
      el("p", { "class": "note", text: "Split into " + w.pieces.length + " pieces that do appear in pi:" }),
      el("ul", { "class": "pieces" }, w.pieces.map(function (p) {
        return el("li", null, [
          el("b", { text: p.text }), " (" + p.code + ") at position ",
          el("span", { "class": "found", text: fmt(p.position) })
        ]);
      }))
    ]);
  }

  function render(res, state) {
    results.innerHTML = "";
    if (!res) return;

    var wholeCard = el("section", { "class": "card" }, [
      el("h2", { text: res.isSentence ? "Whole sentence: “" + res.query + "”" : "“" + res.query + "”" })
    ].concat(resultBlock(res.whole, state)));
    if (res.isSentence) {
      wholeCard.appendChild(el("p", { "class": "note",
        text: "Spaces are ignored, so the code for the whole sentence is " + res.whole.code.length + " digits long." }));
    }
    results.appendChild(wholeCard);

    if (!res.isSentence) {
      var w = res.words[0];
      if (res.whole.position === -1 && state.done && w.pieces) {
        results.appendChild(el("section", { "class": "card" }, [el("h2", { text: "Built from pieces" }), piecesList(w)]));
      }
      return;
    }

    var list = el("ul", { "class": "word-list" });
    res.words.forEach(function (w) {
      var li = el("li", null, [el("h3", { text: w.text })].concat(resultBlock(w, state)));
      if (w.position === -1 && state.done && w.pieces) li.appendChild(piecesList(w));
      list.appendChild(li);
    });
    var allFound = res.words.every(function (w) { return w.position !== -1; });
    results.appendChild(el("section", { "class": "card" }, [
      el("h2", { text: "Word by word" }),
      el("p", { "class": "note", text: allFound
        ? "Every word of your sentence is hiding somewhere in pi!"
        : "Words that are too long are split into the longest pieces found in pi." }),
      list
    ]));
  }

  function setStatus(text, withStop) {
    statusEl.innerHTML = "";
    statusEl.appendChild(document.createTextNode(text));
    if (withStop) {
      var stop = el("button", { type: "button", "class": "stop", text: "Stop" });
      stop.addEventListener("click", function () { searchId++; });
      statusEl.appendChild(stop);
    }
  }

  // ---------- Searching ----------

  /** Results that still need finding: the whole text and any missing words. */
  function missing(res) {
    var list = res.isSentence ? [res.whole].concat(res.words) : [res.whole];
    return list.filter(function (r) { return r.position === -1; });
  }

  function applyHits(res, hits, text, startPos) {
    var changed = false;
    missing(res).forEach(function (r) {
      var pos = hits[r.code];
      if (pos === undefined) return;
      var i = pos - startPos;
      r.position = pos;
      r.count = 0;
      r.snip = {
        before: text.slice(Math.max(0, i - 24), i),
        match: r.code,
        after: text.slice(i + r.code.length, i + r.code.length + 24)
      };
      changed = true;
    });
    // A single word is the same as the whole text.
    if (!res.isSentence && res.whole.position !== -1) {
      res.words[0].position = res.whole.position;
    }
    return changed;
  }

  /** Read chunk after chunk until everything is found or pi runs out. */
  function deepSearch(res, id, t0) {
    var chunkDigits = manifest.chunkDigits;
    var state = { done: false, searched: firstChunk.length };
    var tail = "";
    var next = 1;
    var pending = null;

    function finish(stopped) {
      state.done = true;
      render(res, state);
      var secs = ((performance.now() - t0) / 1000).toFixed(1);
      setStatus((stopped ? "Stopped after " : "Searched ") + fmt(state.searched) + " digits in " + secs + " s.");
    }

    function step() {
      if (id !== searchId) { if (!state.done) finish(true); return; }
      var codes = missing(res).map(function (r) { return r.code; });
      if (!codes.length || next >= manifest.chunks) { finish(false); return; }

      var current = pending || fetchChunk(next);
      pending = next + 1 < manifest.chunks ? fetchChunk(next + 1) : null; // download the next one meanwhile
      var index = next++;
      current.then(function (digits) {
        if (id !== searchId) { finish(true); return; }
        var text = tail + digits;
        var startPos = index * chunkDigits - tail.length + 1;
        if (applyHits(res, P.scan(text, startPos, codes), text, startPos)) render(res, state);
        var longest = Math.max.apply(null, codes.map(function (c) { return c.length; }));
        tail = longest > 1 ? text.slice(-(longest - 1)) : "";
        state.searched = index * chunkDigits + digits.length;
        setStatus("Searching… " + fmt(state.searched) + " of " + fmt(manifest.digits) + " digits", true);
        step();
      }).catch(function (err) {
        state.done = true;
        render(res, state);
        setStatus("Stopped at " + fmt(state.searched) + " digits: could not download more (" + err.message + ").");
      });
    }

    render(res, state);
    step();
  }

  function run(updateUrl) {
    var q = input.value;
    var id = ++searchId;
    if (!P.normalize(q)) {
      results.innerHTML = "";
      setStatus(q ? "Please type some letters (A–Z)." : "");
      return;
    }
    var enc = selectedEncoding();
    if (updateUrl) {
      var params = new URLSearchParams({ q: q });
      if (enc !== "alpha") params.set("enc", enc);
      try { history.replaceState(null, "", "?" + params.toString()); } catch (e) { /* not allowed in some hosts */ }
    }
    var t0 = performance.now();
    var res = P.search(firstChunk, q, enc);
    if (missing(res).length && manifest.chunks > 1) {
      deepSearch(res, id, t0);
    } else {
      render(res, { done: true, searched: firstChunk.length });
      setStatus("Searched " + fmt(firstChunk.length) + " digits in " +
        Math.max(1, Math.round(performance.now() - t0)) + " ms.");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (firstChunk) run(true);
  });
  form.querySelectorAll("input[name=enc]").forEach(function (r) {
    r.addEventListener("change", function () { if (firstChunk && input.value) run(true); });
  });
  form.querySelectorAll(".examples a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var p = new URLSearchParams(link.getAttribute("href").slice(1));
      input.value = p.get("q") || "";
      form.querySelector("input[value=" + (p.get("enc") === "keypad" ? "keypad" : "alpha") + "]").checked = true;
      if (firstChunk) run(true);
    });
  });

  // Pre-fill from ?q=...&enc=... (like pinames.org/index.php?q=a)
  var params = new URLSearchParams(location.search);
  if (params.get("q")) input.value = params.get("q");
  if (params.get("enc") === "keypad") form.querySelector("input[value=keypad]").checked = true;

  button.disabled = true;
  fetch("data/manifest.json")
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (m) {
      manifest = m;
      document.querySelectorAll(".total-digits").forEach(function (n) { n.textContent = fmt(m.digits); });
      return fetchChunk(0);
    })
    .then(function (digits) {
      firstChunk = digits;
      button.disabled = false;
      setStatus("Ready: " + fmt(manifest.digits) + " digits of pi to search.");
      if (input.value) run(false);
    })
    .catch(function (err) {
      setStatus("Could not load the digits of pi (" + err.message +
        "). If you opened the file directly, run a local web server instead (see README).");
    });
})();
