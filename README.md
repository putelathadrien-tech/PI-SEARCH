# π PI Search

Find **names and whole sentences** hidden in the first **1,000,000,000 digits of pi**,
like [pinames.org](https://pinames.org/), but sentences work too.

Type something like `Emma` or `I love pi` and PI Search shows you where it appears in pi,
with the digits around it highlighted.

## How it works

Each letter becomes numbers, and that string of numbers is looked up in pi.
Positions are counted from the first digit after the decimal point (3.**1**415… is position 1).

| Encoding | Rule | Example |
|---|---|---|
| Alphabet (default, same as pinames.org) | A=01, B=02 … Z=26 | `ADA` → `010401` |
| Phone keypad | ABC=2, DEF=3 … WXYZ=9 | `HELLO` → `43556` |

**Sentences:** first the whole sentence is searched (spaces ignored). Long sentences need far
more digits than any computer has, so each word is also searched on its own. If a word is still
too long, it is split into the longest pieces that do appear in pi.

**A billion digits:** the first 10 million digits load right away (5 MB), so most answers are
instant. If something isn't there, the page keeps downloading pi 10 million digits at a time and
stops as soon as everything is found. Searching all the way to a billion downloads about 500 MB,
so the page shows its progress and has a Stop button.

You can link straight to a search: `index.html?q=I+love+pi` or `index.html?q=hello&enc=keypad`.

## Run it locally

The page loads the files in `data/`, so it has to be served over HTTP (opening the file directly won't work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it online (GitHub Pages)

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, then pick the branch and `/ (root)`.

## Files

- `index.html`, `style.css`, `app.js`: the web page
- `search.js`: the search logic (works in the browser and Node)
- `data/pi-000.bin` … `data/pi-099.bin`: 1 billion digits of pi (after the "3."), 10 million per file,
  packed two digits per byte (first digit in the high 4 bits)
- `data/manifest.json`: how many digits and files there are
- `scripts/generate_pi.py`: makes the `data/` files using the Chudnovsky algorithm.
  With `pip install gmpy2` it takes about 10 seconds for 10 million digits and around an hour
  for a billion (needs about 8 GB of memory): `python3 scripts/generate_pi.py 1000000000`
- `test.js`: tests, run with `node test.js`
