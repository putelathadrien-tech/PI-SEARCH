(function () {
  "use strict";

  var P = window.PiSearch;
  var form = document.getElementById("search-form");
  var input = document.getElementById("q");
  var button = document.getElementById("go");
  var statusEl = document.getElementById("status");
  var results = document.getElementById("results");
  var digits = null;

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

  function lettersView(letters) {
    return el("div", { "class": "letters" }, letters.map(function (l) {
      return el("span", null, [el("b", { text: l.letter }), el("small", { text: l.code })]);
    }));
  }

  function digitsView(r) {
    var c = P.context(digits, r.position, r.code.length, 24);
    var lead = c.startPos === 1 ? "3." : "…";
    return el("div", { "class": "digits" }, [
      el("span", { "class": "dim", text: lead + c.before }),
      el("mark", { text: c.match }),
      el("span", { "class": "dim", text: c.after + "…" })
    ]);
  }

  function hitLine(r) {
    if (r.position === -1) {
      return el("p", null, [
        el("span", { "class": "notfound", text: "Not found" }),
        " in the first " + fmt(digits.length) + " digits."
      ]);
    }
    var times = r.capped ? fmt(r.count) + "+ times" : r.count === 1 ? "once" : fmt(r.count) + " times";
    return el("p", null, [
      "Found at position ",
      el("span", { "class": "found", text: fmt(r.position) }),
      " (appears " + times + " in the first " + fmt(digits.length) + " digits)."
    ]);
  }

  function resultBlock(r) {
    var parts = [lettersView(r.letters), hitLine(r)];
    if (r.position !== -1) parts.push(digitsView(r));
    return parts;
  }

  function render(res) {
    results.innerHTML = "";
    if (!res) return;

    var wholeCard = el("section", { "class": "card" }, [
      el("h2", { text: res.isSentence ? "Whole sentence: “" + res.query + "”" : "“" + res.query + "”" })
    ].concat(resultBlock(res.whole)));
    if (res.isSentence) {
      wholeCard.appendChild(el("p", { "class": "note",
        text: "Spaces are ignored, so the code for the whole sentence is " + res.whole.code.length + " digits long." }));
    }
    results.appendChild(wholeCard);

    // For a single word that is too long, show the pieces it can be built from.
    if (!res.isSentence) {
      if (res.whole.position === -1) results.appendChild(piecesCard(res.words[0]));
      return;
    }

    var list = el("ul", { "class": "word-list" });
    res.words.forEach(function (w) {
      var li = el("li", null, [el("h3", { text: w.text })].concat(resultBlock(w)));
      if (w.pieces) li.appendChild(piecesList(w));
      list.appendChild(li);
    });
    results.appendChild(el("section", { "class": "card" }, [
      el("h2", { text: "Word by word" }),
      el("p", { "class": "note", text: res.allWordsFound
        ? "Every word of your sentence is hiding somewhere in pi!"
        : "Words that are too long are split into the longest pieces found in pi." }),
      list
    ]));
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

  function piecesCard(w) {
    return el("section", { "class": "card" }, [el("h2", { text: "Built from pieces" }), piecesList(w)]);
  }

  function run(updateUrl) {
    var q = input.value;
    if (!P.normalize(q)) {
      results.innerHTML = "";
      statusEl.textContent = q ? "Please type some letters (A–Z)." : "";
      return;
    }
    var enc = selectedEncoding();
    if (updateUrl) {
      var params = new URLSearchParams({ q: q });
      if (enc !== "alpha") params.set("enc", enc);
      history.replaceState(null, "", "?" + params.toString());
    }
    var t = performance.now();
    var res = P.search(digits, q, enc);
    statusEl.textContent = "Searched " + fmt(digits.length) + " digits in " +
      Math.max(1, Math.round(performance.now() - t)) + " ms.";
    render(res);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (digits) run(true);
  });
  form.querySelectorAll("input[name=enc]").forEach(function (r) {
    r.addEventListener("change", function () { if (digits && input.value) run(true); });
  });

  // Pre-fill from ?q=...&enc=... (like pinames.org/index.php?q=a)
  var params = new URLSearchParams(location.search);
  if (params.get("q")) input.value = params.get("q");
  if (params.get("enc") === "keypad") form.querySelector("input[value=keypad]").checked = true;

  button.disabled = true;
  fetch("data/pi.txt")
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .then(function (text) {
      digits = text.replace(/[^0-9]/g, "");
      button.disabled = false;
      statusEl.textContent = "Ready: " + fmt(digits.length) + " digits of pi loaded.";
      if (input.value) run(false);
    })
    .catch(function (err) {
      statusEl.textContent = "Could not load the digits of pi (" + err.message +
        "). If you opened the file directly, run a local web server instead (see README).";
    });
})();
