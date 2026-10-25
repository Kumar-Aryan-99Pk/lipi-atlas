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

## Technology

- HTML5, CSS, and vanilla JavaScript
- Tailwind CSS (CDN)
- DaisyUI 3.9 (CDN)
- Inter font from Google Fonts
