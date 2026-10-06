// Run with: node test.js
const assert = require("assert");
const fs = require("fs");
const P = require("./search.js");

const digits = fs.readFileSync(__dirname + "/data/pi.txt", "utf8");

assert.strictEqual(digits.slice(0, 10), "1415926535");
assert.strictEqual(P.normalize("  Hélène, héllo!! "), "HELENE HELLO");
assert.strictEqual(P.encode("ABZ", "alpha"), "010226");
assert.strictEqual(P.encode("HELLO", "keypad"), "43556");

// "1415" starts at position 1 (first digit after "3.").
assert.strictEqual(P.find(digits, "1415").position, 1);
assert.strictEqual(P.find(digits, "x").position, -1);

const a = P.search(digits, "a", "alpha");
assert.strictEqual(a.whole.code, "01");
assert.strictEqual(digits.slice(a.whole.position - 1, a.whole.position + 1), "01");

const s = P.search(digits, "I love pi very much", "alpha");
assert.ok(s.isSentence);
assert.strictEqual(s.words.length, 5);
s.words.forEach((w) => {
  if (w.position === -1) {
    assert.ok(w.pieces.length > 1);
    assert.strictEqual(w.pieces.map((p) => p.text).join(""), w.text);
    w.pieces.forEach((p) => assert.ok(p.position > 0));
  }
});

const k = P.search(digits, "Hello world", "keypad");
assert.ok(k.allWordsFound);

const c = P.context(digits, 1, 4, 5);
assert.deepStrictEqual(c, { before: "", match: "1415", after: "92653", startPos: 1 });

console.log("All tests passed");
