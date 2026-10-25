# LipiAtlas

### A Living Atlas of Brahmic Scripts

LipiAtlas is a lightweight, browser-based explorer for discovering and comparing Brahmic and Brahmic-derived writing systems. Browse individual characters, compare glyphs across scripts, convert numerals, and experiment with rule-based transliteration—all in one place.

## Features

- **Alphabet Explorer** — Browse vowels, consonants, modifiers, and numerals for a selected script, with searchable phoneme information.
- **Alphabet Matrix** — Compare glyphs across scripts in a single table. Filter rows by all characters, vowels, consonants, or digits.
- **Side-by-Side Comparator** — Compare between two and four scripts at once, with the same category filters.
- **Digit Converter** — Enter numbers and view their corresponding numeral forms across supported scripts.
- **Live Transliteration** — Convert Latin/IAST input or supported script text into the script representations supplied by the dataset.
- **Multiple themes** — Choose Light, GitHub Dark, Dracula, or Retro. The selected theme is saved in browser local storage and restored on your next visit.
- **Responsive interface** — Use the explorer, tables, and converters on desktop or mobile screens.
- **Shareable in-page navigation** — App sections use URL fragments, such as `#explore`, `#matrix`, `#comparator`, `#digits`, and `#transliterate`.

## Scripts included

The bundled dataset currently contains 20 script entries:

- Devanagari
- Punjabi (Gurmukhi)
- Bengali (Bangla-Assamese)
- Odia
- Gujarati
- Tamil
- Telugu
- Kannada
- Malayalam
- Sinhala
- Thai
- Lao
- Khmer
- Tibetan
- Burmese (Myanmar)
- Kaithi
- Ashokan Brahmi
- Grantha
- Sharada
- Balinese

Coverage varies by script and character. Where a script does not have a reliable direct equivalent, the dataset may leave the entry blank or provide a documented approximation.

## Getting started

LipiAtlas is a static front-end project; no backend or build step is required.

### Run locally

1. Download or clone this repository.
2. Keep the application files together in the same directory:
   - `index.html`
   - `style.css`
   - `script.js`
   - `data.js`
   - `transliterate.js`
3. Start a local static server from that directory. For example, with Python:

   ```bash
   python -m http.server 8000
   ```

4. Open [http://localhost:8000](http://localhost:8000) in your browser.

A modern browser is recommended. The interface loads Tailwind CSS, DaisyUI, and the Inter font from external CDNs, so an internet connection is needed for those resources.

### Deploy with GitHub Pages

1. Push the project files to the root of a GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Under the build and deployment settings, select **Deploy from a branch**.
4. Choose your publishing branch and the repository root folder, then save.
5. Open the published URL after GitHub Pages finishes deployment.

Because the site is static, no server-side runtime or build command is needed.

## Project structure

```text
LipiAtlas/
├── index.html          # Page layout and app entry point
├── style.css           # Theme-aware styling and responsive layout
├── script.js           # Navigation, rendering, filters, and UI behavior
├── data.js             # Script metadata, phonemes, glyphs, and vowel signs
├── transliterate.js    # Rule-based transliteration engine
└── README.md           # Project documentation
```

## How transliteration works

The transliteration engine maps text to phonetic tokens and renders those tokens using the mappings available in `data.js`. It supports Latin/IAST-style input and characters from supported scripts.

**LipiAtlas transliterates text; it does not translate its meaning.** Results depend on the rule set and available glyph data. Roman spellings can be ambiguous, and script orthographies do not always map one-to-one, so transliteration should be treated as a useful approximation rather than a universal linguistic conversion.

## Contributing

Contributions and corrections are welcome. When reporting a problem, please include:

- The script and character or word involved.
- The input you entered and the output you expected.
- The output LipiAtlas produced, plus a screenshot if it helps explain the issue.

For data corrections, verify the script mapping before changing `data.js`. Keep the UI responsive, preserve theme support, and test the relevant explorer, matrix, comparator, or transliteration behavior before submitting a change.

## Technology

- HTML5, CSS, and vanilla JavaScript
- Tailwind CSS (CDN)
- DaisyUI 3.9 (CDN)
- Inter font from Google Fonts

## License

No `LICENSE` file is currently included. Until a license is added, reuse and redistribution are not explicitly granted. Add a license file to make the project's licensing terms clear.
