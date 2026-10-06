(function () {
  "use strict";

  var P = window.PiSearch;
  var form = document.getElementById("search-form");
  var input = document.getElementById("q");
  var button = document.getElementById("go");
  var statusEl = document.getElementById("status");
  var results = document.getElementById("results");
  var coinsEl = document.getElementById("coins");
  var digits = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SUITS = [["♥", true], ["♠", false], ["♦", true], ["♣", false]];

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

  function chips(letters) {
    return el("div", { "class": "chips" }, letters.map(function (l) {
      return el("div", { "class": "chip", title: l.letter + " = " + l.code },
        [el("b", { text: l.letter }), el("small", { text: l.code })]);
    }));
  }

  function ticker(r, radius) {
    var c = P.context(digits, r.position, r.code.length, radius);
    return el("div", { "class": "ticker" }, [
      (c.startPos === 1 ? "3." : "…") + c.before,
      el("mark", { text: c.match }),
      c.after + "…"
    ]);
  }

  function timesText(r) {
    if (r.capped) return fmt(r.count) + "+ times";
    return r.count === 1 ? "once" : fmt(r.count) + " times";
  }

  /** Slot-machine reels that spin and land on the digits of `number`. */
  function reels(number) {
    var box = el("div", { "class": "reels", "aria-label": "Position " + fmt(number) });
    var reelIndex = 0;
    fmt(number).split("").forEach(function (ch) {
      if (ch === ",") { box.appendChild(el("div", { "class": "reel comma", text: "," })); return; }
      var spins = reduceMotion ? 0 : 12 + reelIndex * 4;
      var strip = el("div", { "class": "strip" });
      for (var i = 0; i < spins; i++) strip.appendChild(el("span", { text: String(Math.floor(Math.random() * 10)) }));
      strip.appendChild(el("span", { text: ch }));
      var reel = el("div", { "class": "reel" }, [strip]);
      box.appendChild(reel);
      if (spins) {
        var duration = 0.9 + reelIndex * 0.25;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            strip.style.transition = "transform " + duration + "s cubic-bezier(.15,.85,.35,1.05)";
            strip.style.transform = "translateY(-" + (spins * 1.4) + "em)";
          });
        });
      }
      reelIndex++;
    });
    box.dataset.duration = reduceMotion ? 0 : 0.9 + (reelIndex - 1) * 0.25;
    return box;
  }

  function rainCoins() {
    if (reduceMotion) return;
    for (var i = 0; i < 40; i++) {
      var coin = el("div", { "class": "coin", text: "π" });
      coin.style.left = Math.random() * 100 + "vw";
      coin.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
      coin.style.animationDelay = Math.random() * 0.8 + "s";
      coinsEl.appendChild(coin);
    }
    setTimeout(function () { coinsEl.innerHTML = ""; }, 4600);
  }

  function machine(res) {
    var w = res.whole;
    var box = el("section", { "class": "machine" }, [
      el("h2", { text: (res.isSentence ? "Sentence: " : "") + "“" + res.query + "”" }),
      chips(w.letters)
    ]);
    if (w.position === -1) {
      box.appendChild(el("div", { "class": "nope", text: "No luck this time" }));
      box.appendChild(el("p", { "class": "result-line", text: res.isSentence
        ? "The whole sentence (" + w.code.length + " digits) isn't in the first " + fmt(digits.length) + " digits. But look at the cards below!"
        : "Not in the first " + fmt(digits.length) + " digits. Here is how pi can still spell it:" }));
      return box;
    }
    var r = reels(w.position);
    box.appendChild(el("div", { "class": "reels-label", text: "Found at position" }));
    box.appendChild(r);
    var reveal = el("div", null, [
      el("div", { "class": "jackpot", text: "JACKPOT!" }),
      el("p", { "class": "result-line" }, [
        "It appears ", el("b", { text: timesText(w) }), " in the first " + fmt(digits.length) + " digits of pi."
      ]),
      ticker(w, 24)
    ]);
    reveal.style.visibility = "hidden";
    box.appendChild(reveal);
    setTimeout(function () {
      reveal.style.visibility = "";
      rainCoins();
    }, Number(r.dataset.duration) * 1000 + 100);
    return box;
  }

  function wordCard(w, i) {
    var suit = SUITS[i % SUITS.length];
    var card = el("article", { "class": "card" + (suit[1] ? " red" : "") }, [
      el("span", { "class": "suit tl", text: suit[0] }),
      el("span", { "class": "suit br", text: suit[0] }),
      el("h3", { text: w.text }),
      chips(w.letters)
    ]);
    card.style.animationDelay = i * 0.12 + "s";
    if (w.position !== -1) {
      card.appendChild(el("div", { "class": "win", text: "WIN ♛ position" }));
      card.appendChild(el("div", { "class": "pos", text: fmt(w.position) }));
      card.appendChild(ticker(w, 8));
    } else {
      card.appendChild(el("div", { "class": "lose", text: "Too long! Split into pieces:" }));
      card.appendChild(piecesList(w));
    }
    return card;
  }

  function piecesList(w) {
    return el("ul", null, w.pieces.map(function (p) {
      return el("li", null, [el("b", { text: p.text }), " (" + p.code + ") at ", el("b", { text: fmt(p.position) })]);
    }));
  }

  function render(res) {
    results.innerHTML = "";
    coinsEl.innerHTML = "";
    if (!res) return;
    results.appendChild(machine(res));

    if (!res.isSentence) {
      if (res.whole.position === -1) {
        results.appendChild(el("div", { "class": "cards" }, [wordCard(res.words[0], 0)]));
      }
      return;
    }
    results.appendChild(el("h2", { "class": "deal-title", text: "♠ ♥ The Deal: word by word ♦ ♣" }));
    results.appendChild(el("p", { "class": "deal-note", text: res.allWordsFound
      ? "Every word of your sentence is hiding somewhere in pi!"
      : "Words that are too long get split into the longest pieces found in pi." }));
    results.appendChild(el("div", { "class": "cards" }, res.words.map(wordCard)));
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
      statusEl.textContent = "The table is open: " + fmt(digits.length) + " digits of pi are ready.";
      if (input.value) run(false);
    })
    .catch(function (err) {
      statusEl.textContent = "Could not load the digits of pi (" + err.message +
        "). If you opened the file directly, run a local web server instead (see README).";
    });
})();
