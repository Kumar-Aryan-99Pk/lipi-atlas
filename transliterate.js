
class BrahmicTransliterator {
  constructor(data) {
    this.data = data ||
      (typeof BRAHMIC_DATA !== 'undefined' ? BRAHMIC_DATA : null) ||
      (typeof window !== 'undefined' ? window.BRAHMIC_DATA : null) ||
      (typeof globalThis !== 'undefined' ? globalThis.BRAHMIC_DATA : null);

    this.phonemeById = new Map();
    this.viramaByScript = new Map();
    this.charInfoByScript = new Map();
    this.matraInfoByScript = new Map();
    this.glyphsByScript = new Map();
    this.matrasByScript = new Map();
    this.numeralMap = new Map();
    this._scriptRanges = [
      [0x0900, 0x097F, 'devanagari'],
      [0x0980, 0x09FF, 'bengali'],
      [0x0A00, 0x0A7F, 'gurmukhi'],
      [0x0A80, 0x0AFF, 'gujarati'],
      [0x0B00, 0x0B7F, 'odia'],
      [0x0B80, 0x0BFF, 'tamil'],
      [0x0C00, 0x0C7F, 'telugu'],
      [0x0C80, 0x0CFF, 'kannada'],
      [0x0D00, 0x0D7F, 'malayalam'],
      [0x0D80, 0x0DFF, 'sinhala'],
      [0x0E00, 0x0E7F, 'thai'],
      [0x0E80, 0x0EFF, 'lao'],
      [0x0F00, 0x0FFF, 'tibetan'],
      [0x1000, 0x109F, 'burmese'],
      [0x1780, 0x17FF, 'khmer'],
      [0x1B00, 0x1B7F, 'balinese'],
      [0x11000, 0x1107F, 'brahmi'],
      [0x11080, 0x110CF, 'kaithi'],
      [0x11180, 0x111DF, 'sharada'],
      [0x11300, 0x1137F, 'grantha']
    ];

    this.initReverseMaps();
    this.initLatinRules();
  }

  initReverseMaps() {
    if (!this.data || !Array.isArray(this.data.phonemes) || !this.data.glyphs) return;

    const scripts = Array.isArray(this.data.scripts) ? this.data.scripts : [];
    for (const script of scripts) {
      this.charInfoByScript.set(script.id, new Map());
      this.matraInfoByScript.set(script.id, new Map());
      this.glyphsByScript.set(script.id, new Map());
      this.matrasByScript.set(script.id, new Map());
    }

    // Keep phoneme definitions and build script-specific glyph maps. Some
    // scripts intentionally reuse a glyph for multiple consonants (Tamil is a
    // common example); retaining the first data-defined mapping avoids the old
    // last-write-wins bug that could turn a basic consonant into an aspirate.
    for (const phoneme of this.data.phonemes) {
      if (!phoneme || !phoneme.id) continue;
      this.phonemeById.set(phoneme.id, phoneme);
      const row = this.data.glyphs[phoneme.id] || {};

      for (const [scriptId, glyph] of Object.entries(row)) {
        if (!glyph) continue;
        if (!this.charInfoByScript.has(scriptId)) this.charInfoByScript.set(scriptId, new Map());
        if (!this.glyphsByScript.has(scriptId)) this.glyphsByScript.set(scriptId, new Map());
        const infoMap = this.charInfoByScript.get(scriptId);
        if (!infoMap.has(glyph)) {
          infoMap.set(glyph, {
            phonemeId: phoneme.id,
            cat: phoneme.cat,
            subcat: phoneme.subcat,
            iast: phoneme.iast,
            scriptId
          });
        }
        if (!this.glyphsByScript.get(scriptId).has(phoneme.id)) {
          this.glyphsByScript.get(scriptId).set(phoneme.id, glyph);
        }
        if (phoneme.cat === 'numeral') {
          const match = phoneme.id.match(/^num_(\d)$/);
          if (match) this.numeralMap.set(glyph, match[1]);
        }
      }
    }

    // Virama is a modifier row but is usually handled as a control over the
    // preceding consonant rather than an independent phoneme token.
    const viramaRow = this.data.glyphs.m_virama || {};
    for (const [scriptId, glyph] of Object.entries(viramaRow)) {
      if (glyph) this.viramaByScript.set(scriptId, glyph);
    }

    // Build per-script matra maps, preserving the first mapping when a glyph
    // is shared by more than one vowel category in a script's orthography.
    for (const [vowelId, scriptRow] of Object.entries(this.data.matras || {})) {
      for (const [scriptId, matra] of Object.entries(scriptRow || {})) {
        if (!matra) continue;
        if (!this.matraInfoByScript.has(scriptId)) this.matraInfoByScript.set(scriptId, new Map());
        if (!this.matrasByScript.has(scriptId)) this.matrasByScript.set(scriptId, new Map());
        if (!this.matraInfoByScript.get(scriptId).has(matra)) {
          this.matraInfoByScript.get(scriptId).set(matra, { vowelId, scriptId });
        }
        this.matrasByScript.get(scriptId).set(vowelId, matra);
      }
    }

    // Pre-sort match strings by length so combined glyphs (for example a
    // consonant plus combining mark) are consumed before their shorter prefix.
    this.glyphMatchersByScript = new Map();
    this.matraMatchersByScript = new Map();
    for (const [scriptId, map] of this.charInfoByScript) {
      this.glyphMatchersByScript.set(
        scriptId,
        [...map.keys()].sort((a, b) => b.length - a.length)
      );
    }
    for (const [scriptId, map] of this.matraInfoByScript) {
      this.matraMatchersByScript.set(
        scriptId,
        [...map.keys()].sort((a, b) => b.length - a.length)
      );
    }
    this.viramaMatchersByScript = new Map();
    for (const [scriptId, glyph] of this.viramaByScript) {
      this.viramaMatchersByScript.set(scriptId, [glyph]);
    }
  }

  initLatinRules() {
    // Match clusters before individual consonants. The following vowel, if any,
    // is consumed separately and attached to the cluster's second consonant.
    this.conjunctRules = [
      { text: 'ksh', first: 'c_ka', second: 'c_ssa' },
      { text: 'kṣ', first: 'c_ka', second: 'c_ssa' },
      { text: 'jny', first: 'c_ja', second: 'c_nya' },
      { text: 'jñ', first: 'c_ja', second: 'c_nya' },
      { text: 'gya', first: 'c_ja', second: 'c_nya' }
    ].sort((a, b) => b.text.length - a.text.length);

    const consonants = [
      ['chh', 'c_cha'], ['tth', 'c_ttha'], ['ddh', 'c_ddha'],
      ['kh', 'c_kha'], ['gh', 'c_gha'], ['ṅ', 'c_nga'], ['ng', 'c_nga'],
      ['ch', 'c_cha'], ['jh', 'c_jha'], ['ñ', 'c_nya'], ['ny', 'c_nya'],
      ['ṭh', 'c_ttha'], ['ḍh', 'c_ddha'], ['tt', 'c_tta'], ['ṭ', 'c_tta'],
      ['dd', 'c_dda'], ['ḍ', 'c_dda'], ['nn', 'c_nna'], ['ṇ', 'c_nna'],
      ['th', 'c_tha'], ['dh', 'c_dha'], ['ph', 'c_pha'], ['bh', 'c_bha'],
      ['sh', 'c_sha'], ['ś', 'c_sha'], ['ṣ', 'c_ssa'], ['zh', 'c_zha'],
      ['ḻ', 'c_zha'], ['rr', 'c_rra'], ['ṟ', 'c_rra'], ['ll', 'c_lla'],
      ['ḷ', 'c_lla'], ['k', 'c_ka'], ['g', 'c_ga'], ['c', 'c_ca'],
      ['j', 'c_ja'], ['t', 'c_ta'], ['d', 'c_da'], ['n', 'c_na'],
      ['p', 'c_pa'], ['b', 'c_ba'], ['m', 'c_ma'], ['y', 'c_ya'],
      ['r', 'c_ra'], ['l', 'c_la'], ['v', 'c_va'], ['w', 'c_va'],
      ['s', 'c_sa'], ['h', 'c_ha'], ['z', 'c_za'], ['f', 'c_fa'],
      ['q', 'c_ka']
    ];
    this.consonantRules = consonants
      .map(([text, id]) => ({ text, id }))
      .sort((a, b) => b.text.length - a.text.length);

    // Uppercase A/I/U are intentionally not special: normal sentence casing
    // should not change vowel length. Use doubled vowels or macrons instead.
    this.vowelRules = [
      ['ai', 'v_ai'], ['au', 'v_au'],
      ['aa', 'v_aa'], ['ā', 'v_aa'],
      ['ii', 'v_ii'], ['ee', 'v_ii'], ['ī', 'v_ii'],
      ['uu', 'v_uu'], ['oo', 'v_uu'], ['ū', 'v_uu'],
      ['ṝ', 'v_rr'], ['ṛ', 'v_r'], ['ḹ', 'v_ll'], ['ḷ', 'v_l'],
      ['ē', 'v_e'], ['ō', 'v_o'], ['e', 'v_e'], ['o', 'v_o'],
      ['a', 'v_a'], ['i', 'v_i'], ['u', 'v_u']
    ].map(([text, id]) => ({ text, id }))
      .sort((a, b) => b.text.length - a.text.length);

    this.modifierRules = [
      ['m̐', 'm_chandrabindu'],
      ['ṃ', 'm_anusvara'], ['ṁ', 'm_anusvara'], ['ḥ', 'm_visarga']
    ].map(([text, id]) => ({ text, id }))
      .sort((a, b) => b.text.length - a.text.length);
  }

  getScriptForChar(char) {
    if (!char) return null;
    const cp = char.codePointAt(0);
    for (const [start, end, id] of this._scriptRanges) {
      if (cp >= start && cp <= end) return id;
    }
    return null;
  }

  detectScript(text) {
    if (typeof text !== 'string' || !text) return 'latin';
    for (const char of text.normalize('NFC')) {
      const scriptId = this.getScriptForChar(char);
      if (scriptId) return scriptId;
    }
    return 'latin';
  }

  /**
   * Convert to abstract phonetic tokens. Mixed-script input is split into
   * runs, so Latin text alongside Brahmic text is no longer left half-unread.
   */
  tokenize(text) {
    if (typeof text !== 'string' || !text) return [];
    const normalized = text.normalize('NFC');
    const tokens = [];
    let run = '';
    let runType = null;

    const flush = () => {
      if (!run) return;
      if (runType) tokens.push(...this.tokenizeIndic(run, runType));
      else tokens.push(...this.tokenizeLatin(run));
      run = '';
    };

    for (const char of normalized) {
      // Unicode joiners are formatting controls, not phonetic tokens. Skip
      // them before splitting runs so they cannot become standalone Latin text.
      if (char === '\u200C' || char === '\u200D') continue;
      const scriptId = this.getScriptForChar(char);
      const nextType = scriptId && this.charInfoByScript.has(scriptId) ? scriptId : null;
      if (run && nextType !== runType) flush();
      runType = nextType;
      run += char;
    }
    flush();
    return tokens;
  }

  _matchRule(text, index, rules) {
    const rest = text.slice(index).toLowerCase();
    for (const rule of rules) {
      if (rest.startsWith(rule.text.toLowerCase())) return rule;
    }
    return null;
  }

  _matchVowel(text, index) {
    return this._matchRule(text, index, this.vowelRules);
  }

  tokenizeLatin(text) {
    const tokens = [];
    const normalized = String(text || '').normalize('NFC');
    let i = 0;

    while (i < normalized.length) {
      const rest = normalized.slice(i);
      const whitespace = rest.match(/^\s+/u);
      if (whitespace) {
        tokens.push({ type: 'other', char: whitespace[0] });
        i += whitespace[0].length;
        continue;
      }

      const digit = rest.match(/^[0-9]/u);
      if (digit) {
        tokens.push({ type: 'numeral', id: `num_${digit[0]}`, char: digit[0] });
        i += digit[0].length;
        continue;
      }

      // Preserve punctuation and symbols verbatim (including emoji). Unicode
      // property escapes cover more than a short hand-maintained ASCII list.
      const symbol = Array.from(rest)[0];
      if (/^[\p{P}\p{S}]$/u.test(symbol)) {
        tokens.push({ type: 'other', char: symbol });
        i += symbol.length;
        continue;
      }

      const modifier = this._matchRule(normalized, i, this.modifierRules);
      if (modifier) {
        tokens.push({ type: 'modifier', id: modifier.id });
        i += modifier.text.length;
        continue;
      }

      const conjunct = this._matchRule(normalized, i, this.conjunctRules);
      if (conjunct) {
        const afterCluster = i + conjunct.text.length;
        const vowel = this._matchVowel(normalized, afterCluster);
        tokens.push({ type: 'consonant', id: conjunct.first, vowel: null });
        tokens.push({
          type: 'consonant',
          id: conjunct.second,
          vowel: vowel ? vowel.id : null
        });
        i = afterCluster + (vowel ? vowel.text.length : 0);
        continue;
      }

      // Independent vowel must be checked before single-letter consonants.
      const vowel = this._matchVowel(normalized, i);
      if (vowel) {
        tokens.push({ type: 'vowel', id: vowel.id });
        i += vowel.text.length;
        continue;
      }

      const consonant = this._matchRule(normalized, i, this.consonantRules);
      if (consonant) {
        const afterConsonant = i + consonant.text.length;
        const followingVowel = this._matchVowel(normalized, afterConsonant);
        tokens.push({
          type: 'consonant',
          id: consonant.id,
          vowel: followingVowel ? followingVowel.id : null
        });
        i = afterConsonant + (followingVowel ? followingVowel.text.length : 0);
        continue;
      }

      // Consume one full Unicode code point for unknown input, not half a
      // surrogate pair. Unknown text is always preserved as entered.
      tokens.push({ type: 'other', char: symbol });
      i += symbol.length;
    }
    return tokens;
  }

  _matchFromList(text, index, matchers) {
    const rest = text.slice(index);
    for (const matcher of matchers || []) {
      if (rest.startsWith(matcher)) return matcher;
    }
    return null;
  }

  tokenizeIndic(text, sourceScript) {
    const tokens = [];
    const normalized = String(text || '').normalize('NFC');
    const scriptId = sourceScript || this.detectScript(normalized);
    const glyphInfo = this.charInfoByScript.get(scriptId) || new Map();
    const matraInfo = this.matraInfoByScript.get(scriptId) || new Map();
    const glyphMatchers = this.glyphMatchersByScript.get(scriptId) || [];
    const matraMatchers = this.matraMatchersByScript.get(scriptId) || [];
    const virama = this.viramaByScript.get(scriptId) || '';
    let i = 0;

    while (i < normalized.length) {
      const rest = normalized.slice(i);
      // Joiners affect glyph shaping, not the abstract phoneme sequence.
      // Dropping them avoids leaking zero-width controls into IAST or another script.
      if (rest.startsWith('\u200C') || rest.startsWith('\u200D')) {
        i += 1;
        continue;
      }

      const whitespace = rest.match(/^\s+/u);
      if (whitespace) {
        tokens.push({ type: 'other', char: whitespace[0] });
        i += whitespace[0].length;
        continue;
      }

      const viramaText = this._matchFromList(normalized, i, virama ? [virama] : []);
      if (viramaText) {
        const previous = tokens[tokens.length - 1];
        if (previous && previous.type === 'consonant') previous.vowel = null;
        i += viramaText.length;
        continue;
      }

      const matraText = this._matchFromList(normalized, i, matraMatchers);
      if (matraText) {
        const info = matraInfo.get(matraText);
        const previous = tokens[tokens.length - 1];
        if (previous && previous.type === 'consonant') {
          previous.vowel = info.vowelId;
        } else {
          tokens.push({ type: 'vowel', id: info.vowelId });
        }
        i += matraText.length;
        continue;
      }

      const glyphText = this._matchFromList(normalized, i, glyphMatchers);
      if (glyphText) {
        const info = glyphInfo.get(glyphText);
        if (info.cat === 'consonant') {
          tokens.push({ type: 'consonant', id: info.phonemeId, vowel: 'v_a' });
        } else if (info.cat === 'vowel') {
          tokens.push({ type: 'vowel', id: info.phonemeId });
        } else if (info.cat === 'modifier') {
          tokens.push({ type: 'modifier', id: info.phonemeId });
        } else if (info.cat === 'numeral') {
          const digit = info.phonemeId.match(/^num_(\d)$/);
          tokens.push({ type: 'numeral', id: info.phonemeId, char: digit ? digit[1] : glyphText });
        } else {
          tokens.push({ type: 'other', char: glyphText });
        }
        i += glyphText.length;
        continue;
      }

      const digit = rest.match(/^[0-9]/u);
      if (digit) {
        tokens.push({ type: 'numeral', id: `num_${digit[0]}`, char: digit[0] });
        i += digit[0].length;
        continue;
      }

      const char = Array.from(rest)[0];
      tokens.push({ type: 'other', char });
      i += char.length;
    }
    return tokens;
  }

  _scriptGlyph(scriptId, phonemeId) {
    return this.glyphsByScript.get(scriptId)?.get(phonemeId) || '';
  }

  _scriptMatra(scriptId, vowelId) {
    return this.matrasByScript.get(scriptId)?.get(vowelId) || '';
  }

  _isPreposedVowel(scriptId, matra) {
    if (!matra) return false;
    const patterns = {
      thai: /^[\u0E40-\u0E44]/u,
      lao: /^[\u0EC0-\u0EC4]/u,
      khmer: /^[\u17C1-\u17C5]/u,
      burmese: /^\u1031/u
    };
    return Boolean(patterns[scriptId]?.test(matra));
  }

  _iastFallback(phonemeId, token) {
    const phoneme = this.phonemeById.get(phonemeId);
    if (!phoneme) return token?.char || '';
    return phoneme.iast || token?.char || '';
  }

  render(tokens, targetScriptId) {
    if (!Array.isArray(tokens) || tokens.length === 0) return '';
    if (targetScriptId === 'iast' || targetScriptId === 'latin') return this.renderIAST(tokens);
    if (!this.data || !this.glyphsByScript.has(targetScriptId)) return this.renderIAST(tokens);

    const virama = this.viramaByScript.get(targetScriptId) || '';
    let result = '';

    for (const token of tokens) {
      if (token.type === 'consonant') {
        const consonantGlyph = this._scriptGlyph(targetScriptId, token.id);
        if (!consonantGlyph) {
          result += this.renderIAST([token]);
          continue;
        }

        if (token.vowel === null) {
          result += consonantGlyph + virama;
          continue;
        }
        if (token.vowel === 'v_a') {
          result += consonantGlyph;
          continue;
        }

        const matra = this._scriptMatra(targetScriptId, token.vowel);
        if (!matra) {
          // If this script lacks the dependent vowel, try an independent vowel
          // glyph before falling back to IAST.
          const independent = this._scriptGlyph(targetScriptId, token.vowel);
          result += consonantGlyph + (independent || this._iastFallback(token.vowel, token));
        } else if (this._isPreposedVowel(targetScriptId, matra)) {
          result += matra + consonantGlyph;
        } else {
          result += consonantGlyph + matra;
        }
      } else if (token.type === 'vowel' || token.type === 'modifier') {
        const glyph = this._scriptGlyph(targetScriptId, token.id);
        result += glyph || this._iastFallback(token.id, token);
      } else if (token.type === 'numeral') {
        result += this._scriptGlyph(targetScriptId, token.id) || token.char || token.id.replace(/^num_/, '');
      } else {
        result += token.char || '';
      }
    }
    return result;
  }

  renderIAST(tokens) {
    let result = '';
    for (const token of tokens || []) {
      if (token.type === 'consonant') {
        const phoneme = this.phonemeById.get(token.id);
        let base = phoneme?.iast || '';
        // Dataset consonant labels generally include an inherent 'a'; emit
        // only the consonant base before applying the token's vowel state.
        if (base.endsWith('a')) base = base.slice(0, -1);

        if (token.vowel === null) result += base;
        else if (token.vowel === 'v_a') result += base + 'a';
        else result += base + (this.phonemeById.get(token.vowel)?.iast || '');
      } else if (token.type === 'vowel' || token.type === 'modifier') {
        result += this.phonemeById.get(token.id)?.iast || '';
      } else if (token.type === 'numeral') {
        result += token.id?.startsWith('num_') ? token.id.slice(4) : (token.char || '');
      } else {
        result += token.char || '';
      }
    }
    return result;
  }

  /** Convert input into IAST plus every script declared in the dataset. */
  transliterateAll(text) {
    if (typeof text !== 'string' || !text.trim() || !this.data || !Array.isArray(this.data.scripts)) {
      return {};
    }
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return {};

    const results = { iast: this.render(tokens, 'iast') };
    for (const script of this.data.scripts) {
      results[script.id] = this.render(tokens, script.id);
    }
    return results;
  }
}

// CommonJS for Node-based tests; browser global for the app.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrahmicTransliterator;
} else if (typeof window !== 'undefined') {
  window.BrahmicTransliterator = BrahmicTransliterator;
}
