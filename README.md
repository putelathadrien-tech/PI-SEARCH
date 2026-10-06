# π PI Search

Find **names and whole sentences** hidden in the first **10,000,000 digits of pi**,
like [pinames.org](https://pinames.org/), but sentences work too.

Styled like a royal casino: type something like `Emma` or `I love pi`, hit **SPIN**, and the slot machine shows where it appears in pi,
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

You can link straight to a search: `index.html?q=I+love+pi` or `index.html?q=hello&enc=keypad`.

## Run it locally

The page loads `data/pi.txt`, so it has to be served over HTTP (opening the file directly won't work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it online (GitHub Pages)

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, then pick the branch and `/ (root)`.

## Files

- `index.html`, `style.css`, `app.js`: the web page
- `search.js`: the search logic (works in the browser and Node)
- `data/pi.txt`: 10 million digits of pi (after the "3.")
- `scripts/generate_pi.py`: makes `data/pi.txt` using the Chudnovsky algorithm
  (`pip install gmpy2` makes it fast: about 10 seconds for 10 million digits)
- `test.js`: tests, run with `node test.js`
