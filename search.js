/*
 * PI Search core logic. Works in the browser (window.PiSearch) and in Node
 * (module.exports) so it can be tested without a browser.
 */
(function (root) {
  "use strict";

  // Phone keypad (T9): one digit per letter.
  var KEYPAD = {
    A: 2, B: 2, C: 2, D: 3, E: 3, F: 3, G: 4, H: 4, I: 4,
    J: 5, K: 5, L: 5, M: 6, N: 6, O: 6, P: 7, Q: 7, R: 7, S: 7,
    T: 8, U: 8, V: 8, W: 9, X: 9, Y: 9, Z: 9
  };

  var ENCODINGS = {
    alpha: {
      label: "Alphabet (A=01 … Z=26)",
      letter: function (ch) {
        var n = ch.charCodeAt(0) - 64;
        return n < 10 ? "0" + n : String(n);
      }
    },
    keypad: {
      label: "Phone keypad (ABC=2 … WXYZ=9)",
      letter: function (ch) { return String(KEYPAD[ch]); }
    }
  };

  /** Uppercase, strip accents and keep only letters and single spaces. */
  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]+/g, " ")
      .trim();
  }

  function encode(word, encoding) {
    var enc = ENCODINGS[encoding] || ENCODINGS.alpha;
    var out = "";
    for (var i = 0; i < word.length; i++) out += enc.letter(word[i]);
    return out;
  }

  /** Per-letter breakdown, e.g. [{letter:"A", code:"01"}, ...]. */
  function breakdown(word, encoding) {
    return word.split("").map(function (ch) {
      return { letter: ch, code: encode(ch, encoding) };
    });
  }

  /**
   * Find a digit string in pi. Returns the 1-based position of the first
   * digit after the decimal point ("3." is not counted), or -1, plus how
   * many times it occurs (counting stops at `maxCount`).
   */
  function find(digits, code, maxCount) {
    maxCount = maxCount || 1000;
    var first = digits.indexOf(code);
    if (first === -1) return { position: -1, count: 0 };
    var count = 1;
    var i = first;
    while (count < maxCount && (i = digits.indexOf(code, i + 1)) !== -1) count++;
    return { position: first + 1, count: count, capped: count >= maxCount };
  }

  function lookup(digits, text, encoding) {
    var code = encode(text, encoding);
    var res = find(digits, code);
    return {
      text: text,
      code: code,
      position: res.position,
      count: res.count,
      capped: !!res.capped,
      letters: breakdown(text, encoding)
    };
  }

  /**
   * When a word is too long to be found in the digits we have, split it into
   * the longest pieces that can be found, left to right.
   */
  function splitIntoPieces(digits, word, encoding) {
    var pieces = [];
    var start = 0;
    while (start < word.length) {
      var found = null;
      for (var end = word.length; end > start; end--) {
        var r = lookup(digits, word.slice(start, end), encoding);
        if (r.position !== -1) { found = r; break; }
      }
      if (!found) {
        // Cannot happen with the full digit set, but guard anyway.
        found = lookup(digits, word[start], encoding);
        end = start + 1;
      }
      pieces.push(found);
      start = start + found.text.length;
    }
    return pieces;
  }

  /**
   * Search a name or a sentence.
   *  - `whole`: the full text (spaces removed) as one string of digits
   *  - `words`: each word on its own; words that are not found whole are
   *    split into the longest pieces that are found.
   */
  function search(digits, query, encoding) {
    encoding = ENCODINGS[encoding] ? encoding : "alpha";
    var clean = normalize(query);
    if (!clean) return null;
    var words = clean.split(" ");
    var whole = lookup(digits, words.join(""), encoding);
    whole.display = clean;
    var perWord = words.map(function (w) {
      var r = lookup(digits, w, encoding);
      r.pieces = r.position === -1 ? splitIntoPieces(digits, w, encoding) : null;
      return r;
    });
    return {
      query: clean,
      encoding: encoding,
      isSentence: words.length > 1,
      whole: whole,
      words: perWord,
      allWordsFound: perWord.every(function (w) { return w.position !== -1; })
    };
  }

  /** Digits around a hit: { before, match, after, startPos }. */
  function context(digits, position, length, radius) {
    radius = radius || 20;
    var i = position - 1;
    var from = Math.max(0, i - radius);
    return {
      before: digits.slice(from, i),
      match: digits.slice(i, i + length),
      after: digits.slice(i + length, i + length + radius),
      startPos: from + 1
    };
  }

  var api = {
    ENCODINGS: ENCODINGS,
    normalize: normalize,
    encode: encode,
    breakdown: breakdown,
    find: find,
    search: search,
    context: context
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PiSearch = api;
})(this);
