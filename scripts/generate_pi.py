#!/usr/bin/env python3
"""Generate the decimal digits of pi (after the "3.") into data/pi.txt.

Uses the Chudnovsky algorithm with binary splitting. Installing gmpy2
(`pip install gmpy2`) makes it dramatically faster, but it also works
with plain Python integers.

Usage: python3 scripts/generate_pi.py [digits] [output]
"""
import math
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


def pi_digits(n):
    guard = 20
    terms = int((n + guard) / 14.181647462725477) + 1
    _, q, t = bs(0, terms)
    one = mpz(10) ** (n + guard)
    sqrt_c = isqrt(10005 * one * one)
    pi = (q * 426880 * sqrt_c) // t
    s = str(pi)
    return s[1:n + 1]  # drop the leading "3"


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000_000
    out = sys.argv[2] if len(sys.argv) > 2 else "data/pi.txt"
    start = time.time()
    digits = pi_digits(n)
    with open(out, "w") as f:
        f.write(digits)
    print(f"Wrote {len(digits):,} digits to {out} in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
