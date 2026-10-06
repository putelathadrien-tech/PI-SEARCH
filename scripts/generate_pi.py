#!/usr/bin/env python3
"""Generate the decimal digits of pi (after the "3.") for PI Search.

Uses the Chudnovsky algorithm with binary splitting. Installing gmpy2
(`pip install gmpy2`) makes it dramatically faster: about 10 seconds for
10 million digits and roughly an hour for 1 billion.

The digits are written as packed chunk files in data/: pi-000.bin, pi-001.bin, ...
Each byte holds two digits (first digit in the high 4 bits), and each chunk
holds CHUNK digits. data/manifest.json describes the set.

Usage: python3 scripts/generate_pi.py [digits] [outdir] [chunk]
"""
import json
import math
import os
import sys
import time

try:
    from gmpy2 import mpz, isqrt
except ImportError:  # pragma: no cover - fallback without gmpy2
    mpz = int
    isqrt = math.isqrt

C3_OVER_24 = mpz(640320) ** 3 // 24


def bs(a, b):
    """Binary splitting for the Chudnovsky series terms a..b."""
    if b - a == 1:
        if a == 0:
            p = q = mpz(1)
        else:
            p = mpz((6 * a - 5) * (2 * a - 1) * (6 * a - 1))
            q = mpz(a) * a * a * C3_OVER_24
        t = p * (13591409 + 545140134 * a)
        if a & 1:
            t = -t
        return p, q, t
    m = (a + b) // 2
    p1, q1, t1 = bs(a, m)
    p2, q2, t2 = bs(m, b)
    return p1 * p2, q1 * q2, q2 * t1 + p1 * t2


def pi_digits(n, log=print):
    guard = 30
    terms = int((n + guard) / 14.181647462725477) + 1
    log(f"Summing {terms:,} series terms…")
    _, q, t = bs(0, terms)
    log("Square root…")
    one = mpz(10) ** (n + guard)
    sqrt_c = isqrt(10005 * one * one)
    del one
    log("Dividing…")
    pi = (q * 426880 * sqrt_c) // t
    del q, t, sqrt_c
    log("Converting to decimal…")
    return str(pi)[1:n + 1]  # drop the leading "3"


def pack(digits):
    """Two digits per byte, first digit in the high nibble."""
    if len(digits) % 2:
        digits += "0"
    hi = bytes.fromhex(digits)  # "14" -> 0x14: exactly the nibble layout we want
    return hi


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000_000
    outdir = sys.argv[2] if len(sys.argv) > 2 else "data"
    chunk = int(sys.argv[3]) if len(sys.argv) > 3 else 10_000_000
    start = time.time()

    def log(msg):
        print(f"[{time.time() - start:7.1f}s] {msg}", flush=True)

    digits = pi_digits(n, log)
    os.makedirs(outdir, exist_ok=True)
    count = 0
    for i in range(0, n, chunk):
        with open(os.path.join(outdir, f"pi-{count:03d}.bin"), "wb") as f:
            f.write(pack(digits[i:i + chunk]))
        count += 1
    with open(os.path.join(outdir, "manifest.json"), "w") as f:
        json.dump({"digits": n, "chunkDigits": chunk, "chunks": count}, f)
        f.write("\n")
    log(f"Wrote {n:,} digits in {count} chunks to {outdir}/")


if __name__ == "__main__":
    main()
