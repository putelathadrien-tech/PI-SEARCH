// Run with: node test.js
const assert = require("assert");
const fs = require("fs");
const P = require("./search.js");

const digits = P.unpack(fs.readFileSync(__dirname + "/data/pi-000.bin"));

assert.strictEqual(digits.slice(0, 10), "1415926535");
assert.strictEqual(P.normalize("  Hélène, héllo!! "), "HELENE HELLO");
assert.strictEqual(P.normalize("14/03/1999"), "14 03 1999");
assert.strictEqual(P.encode("ABZ", "alpha"), "010226");
assert.strictEqual(P.encode("HELLO", "keypad"), "43556");

// Numbers are searched as themselves, alone or mixed with letters.
assert.strictEqual(P.encode("1999", "alpha"), "1999");
assert.strictEqual(P.encode("R2D2", "alpha"), "182042");
assert.strictEqual(P.encode("R2D2", "keypad"), "7232");
const n = P.search(digits, "14159", "alpha");
assert.strictEqual(n.whole.code, "14159");
assert.strictEqual(n.whole.position, 1);
const date = P.search(digits, "14/03/1999", "alpha");
assert.strictEqual(date.whole.code, "14031999");
assert.strictEqual(date.words.length, 3);

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

// Packed chunks: two digits per byte, first digit in the high 4 bits.
assert.strictEqual(P.unpack(Uint8Array.from([0x14, 0x15, 0x92])), "141592");
assert.strictEqual(digits.length, 10000000);

// scan() reports positions relative to where the text starts in pi.
assert.deepStrictEqual(P.scan("99141599", 101, ["1415", "777"]), { "1415": 103 });

console.log("All tests passed");
