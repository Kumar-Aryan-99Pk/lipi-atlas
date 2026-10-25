document.addEventListener('DOMContentLoaded', () => {
    // 1. STATE & ENGINE INITIALIZATION
    const state = {
        activeTab: 'explore',
        baseScript: 'devanagari',
        searchQuery: '',
        compareScripts: ['devanagari', 'bengali'],
        matrixCategory: 'all',
        comparatorCategory: 'all',
        data: window.BRAHMIC_DATA,
        transliterator: null
    };

    if (!state.data) {
        console.error("Lipi-Setu Error: BRAHMIC_DATA not found. Please ensure data.js is loaded correctly.");
        return;
    }
    
    if (window.BrahmicTransliterator) {
        state.transliterator = new BrahmicTransliterator(state.data);
    }

    // 2. DOM CACHE
    const dom = {
        tabs: document.querySelectorAll('.tab'),
        sections: document.querySelectorAll('.view-section'),
        themeSelect: document.getElementById('themeSelect'),
        
        baseScriptSelect: document.getElementById('baseScriptSelect'),
        phonemeSearch: document.getElementById('phonemeSearch'),
        infoTitle: document.getElementById('infoTitle'),
        infoDesc: document.getElementById('infoDescription'),
        explorerContainer: document.getElementById('explorerContainer'),
        
        matrixHead: document.getElementById('matrixHead'),
        matrixBody: document.getElementById('matrixBody'),
        
        comparatorSelectors: document.getElementById('comparatorSelectors'),
        comparatorHead: document.getElementById('comparatorHead'),
        comparatorBody: document.getElementById('comparatorBody'),
        addComparatorScriptBtn: document.getElementById('addComparatorScriptBtn'),

        digitInput: document.getElementById('digitInput'),
        digitOutputGrid: document.getElementById('digitOutputGrid'),
        
        translitInput: document.getElementById('translitInput'),
        translitOutputGrid: document.getElementById('translitOutputGrid'),
        
        modal: document.getElementById('compare_modal'),
        modalPhonemeLabel: document.getElementById('modalPhonemeLabel'),
        modalMainChar: document.getElementById('modalMainChar'),
        modalMainScript: document.getElementById('modalMainScript'),
        modalComparisonGrid: document.getElementById('modalComparisonGrid'),
        modalIast: document.getElementById('modalIast'),
        modalIpa: document.getElementById('modalIpa'),
        modalArt: document.getElementById('modalArt'),
        modalManner: document.getElementById('modalManner')
    };

    // 3. BOOTSTRAP
    function init() {
        setupTheme();
        setupNavigationTabs();
        setupCategoryFilters();
        populateScriptSelect();
        
        // Listeners for Explore Tab
        dom.baseScriptSelect.addEventListener('change', (e) => {
            state.baseScript = e.target.value;
            renderExploreView();
        });
        
        dom.phonemeSearch.addEventListener('input', debounce((e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            renderExploreView();
        }, 150));

        // Initial Renders
        renderExploreView();
        renderMatrixView();
        setupComparator();
        setupDigitConverter();
        setupTransliterator();
    }

    function setupTheme() {
        dom.themeSelect.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-theme', e.target.value);
        });
    }

    // Shared filters for both tables. Categories are read from the dataset,
    // so the filters keep working when scripts or phonemes are added later.
    function setupCategoryFilters() {
        document.querySelectorAll('.category-filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                const target = button.dataset.filterTarget;
                const category = button.dataset.category;
                if (!['matrix', 'comparator'].includes(target)) return;
                if (!['all', 'vowel', 'consonant', 'numeral'].includes(category)) return;

                const stateKey = target === 'matrix' ? 'matrixCategory' : 'comparatorCategory';
                if (state[stateKey] === category) return;
                state[stateKey] = category;

                document.querySelectorAll(`.category-filter-btn[data-filter-target="${target}"]`).forEach(item => {
                    const active = item.dataset.category === category;
                    item.classList.toggle('btn-primary', active);
                    item.classList.toggle('btn-outline', !active);
                    item.setAttribute('aria-pressed', String(active));
                });

                if (target === 'matrix') {
                    renderMatrixView();
                } else {
                    renderComparatorView();
                }
            });
        });
    }

    function setupNavigationTabs() {
        dom.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                if (target === state.activeTab) return;
                
                dom.tabs.forEach(t => t.classList.remove('tab-active'));
                tab.classList.add('tab-active');
                
                dom.sections.forEach(sec => {
                    if (sec.id === target) {
                        sec.classList.add('active');
                    } else {
                        sec.classList.remove('active');
                    }
                });
                state.activeTab = target;
            });
        });
    }

    // Populate using HTML optgroups based on language family
    function populateScriptSelect() {
        const groups = {};
        state.data.scripts.forEach(script => {
            const family = script.family.split(' (')[0]; // Condense the label slightly
            if (!groups[family]) groups[family] = [];
            groups[family].push(script);
        });

        const frag = document.createDocumentFragment();
        
        for (const family in groups) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = family;
            
            groups[family].forEach(script => {
                const opt = document.createElement('option');
                opt.value = script.id;
                // opt.textContent = `${script.name} (${script.nativeName})`;
                opt.textContent = `${script.name}`;
                if (script.id === state.baseScript) opt.selected = true;
                optgroup.appendChild(opt);
            });
            frag.appendChild(optgroup);
        }
        
        dom.baseScriptSelect.innerHTML = '';
        dom.baseScriptSelect.appendChild(frag);
    }

    // --- VIEW 1: EXPLORE TAB ---
    function renderExploreView() {
        const script = state.data.scripts.find(s => s.id === state.baseScript);
        if (!script) return;
        
        dom.infoTitle.textContent = `About ${script.name}`;
        dom.infoDesc.textContent = script.description || 'No description available.';

        // Filter phonemes based on Search Query
        let phonemesToRender = state.data.phonemes;
        if (state.searchQuery) {
            phonemesToRender = phonemesToRender.filter(p => 
                p.iast.toLowerCase().includes(state.searchQuery) ||
                p.name.toLowerCase().includes(state.searchQuery) ||
                (state.data.glyphs[p.id] && state.data.glyphs[p.id][state.baseScript]?.includes(state.searchQuery))
            );
        }

        const frag = document.createDocumentFragment();

        // 1. Render Vowels (Enforcing 5 columns format)
        frag.appendChild(buildExploreSection('Vowels (Svara)', phonemesToRender.filter(p => p.cat === 'vowel'), script.id, true));
        
        // 2. Render Consonants (Grouped by Vargas in 5-columns)
        const cPhonemes = phonemesToRender.filter(p => p.cat === 'consonant');
        if (cPhonemes.length > 0) {
            const consonantWrapper = document.createElement('div');
            consonantWrapper.className = 'mb-8';
            consonantWrapper.innerHTML = `<h3 class="text-lg font-semibold border-b border-base-300 pb-2 mb-4">Consonants (Vyañjana)</h3>`;
            
            const vargas = ['ka_varga', 'ca_varga', 'tta_varga', 'ta_varga', 'pa_varga', 'antastha', 'ushma', 'extended'];
            
            vargas.forEach(varga => {
                const group = cPhonemes.filter(p => p.subcat === varga);
                if(group.length > 0) {
                    consonantWrapper.appendChild(buildExploreGrid(group, script.id, true)); // true forces 5-cols
                }
            });
            frag.appendChild(consonantWrapper);
        }

        // 3. Modifiers & Numerals
        frag.appendChild(buildExploreSection('Modifiers (Yogavāha)', phonemesToRender.filter(p => p.cat === 'modifier'), script.id, false));
        frag.appendChild(buildExploreSection('Numerals (Aṅka)', phonemesToRender.filter(p => p.cat === 'numeral'), script.id, false));

        if (phonemesToRender.length === 0) {
            frag.appendChild(document.createTextNode('No matches found for your search.'));
        }

        dom.explorerContainer.innerHTML = '';
        dom.explorerContainer.appendChild(frag);
    }

    function buildExploreSection(title, phonemes, scriptId, useGrid5Cols) {
        if(phonemes.length === 0) return document.createDocumentFragment();
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-8';
        wrapper.innerHTML = `<h3 class="text-lg font-semibold border-b border-base-300 pb-2 mb-4">${title}</h3>`;
        wrapper.appendChild(buildExploreGrid(phonemes, scriptId, useGrid5Cols));
        return wrapper;
    }

    function buildExploreGrid(phonemes, scriptId, useGrid5Cols) {
        const grid = document.createElement('div');
        grid.className = useGrid5Cols ? 'grid-5-cols' : 'phoneme-flex';

        phonemes.forEach(p => {
            const char = (state.data.glyphs[p.id] && state.data.glyphs[p.id][scriptId]) || '-';
            const isMissing = char === '-';
            
            const btn = document.createElement('button');
            // If it's flex, standard w-[4.5rem] applies.
            btn.className = `btn h-auto min-h-[5rem] flex-col gap-1 p-2 transition-colors ${!useGrid5Cols ? 'w-[4.5rem]' : ''} ${
                isMissing ? 'btn-disabled opacity-40' : 'btn-outline border-base-300 hover:bg-primary hover:text-primary-content hover:border-primary'
            }`;
            
            if (!isMissing) btn.onclick = () => openComparisonModal(p.id, scriptId);
            
            btn.innerHTML = `
                <span class="brahmic-text">${char}</span>
                <span class="text-[0.65rem] uppercase tracking-wider font-semibold opacity-70">${p.iast}</span>
            `;
            grid.appendChild(btn);
        });
        return grid;
    }

    // --- VIEW 2: ALPHABET MATRIX ---
    function renderMatrixView() {
        const scripts = state.data.scripts;
        const phonemes = state.data.phonemes.filter(phoneme =>
            state.matrixCategory === 'all' || phoneme.cat === state.matrixCategory
        );

        let headHTML = '<tr><th><div class="w-16">Phoneme</div></th>';
        scripts.forEach(s => {
            headHTML += `<th title="${s.language}"><div class="text-xs font-bold whitespace-nowrap text-center">${s.name}</div></th>`;
        });
        headHTML += '</tr>';
        dom.matrixHead.innerHTML = headHTML;

        const bodyFrag = document.createDocumentFragment();
        phonemes.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<th><strong>${p.iast}</strong></th>`; // Using TH here helps with background styling targeting
            
            scripts.forEach(s => {
                const char = (state.data.glyphs[p.id] && state.data.glyphs[p.id][s.id]) || '';
                const td = document.createElement('td');
                if (char) {
                    td.innerHTML = `<div class="matrix-char text-center" title="${s.name}: ${char} (${p.iast})">${char}</div>`;
                    td.onclick = () => openComparisonModal(p.id, s.id);
                } else {
                    td.innerHTML = `<div class="text-center opacity-30">—</div>`;
                }
                tr.appendChild(td);
            });
            bodyFrag.appendChild(tr);
        });
        
        dom.matrixBody.innerHTML = '';
        dom.matrixBody.appendChild(bodyFrag);
    }

    // --- VIEW 3: COMPARATOR TAB ---
    function setupComparator() {
        dom.addComparatorScriptBtn.onclick = () => {
            if (state.compareScripts.length < 4) {
                const available = state.data.scripts.map(s => s.id).filter(id => !state.compareScripts.includes(id));
                if (available.length > 0) {
                    state.compareScripts.push(available[0]);
                    renderComparatorView();
                }
            }
        };
        renderComparatorView();
    }

    function renderComparatorView() {
        dom.addComparatorScriptBtn.disabled = state.compareScripts.length >= 4;

        // Render Selectors
        dom.comparatorSelectors.className = `grid gap-4 grid-cols-1 sm:grid-cols-${state.compareScripts.length}`;
        dom.comparatorSelectors.innerHTML = '';
        
        state.compareScripts.forEach((scriptId, index) => {
            const selectDiv = document.createElement('div');
            selectDiv.className = 'flex items-center gap-2';
            
            const select = document.createElement('select');
            select.className = 'select select-bordered w-full';
            
            // Build options exactly like populateScriptSelect (grouped)
            const groups = {};
            state.data.scripts.forEach(s => {
                const family = s.family.split(' (')[0];
                if (!groups[family]) groups[family] = [];
                groups[family].push(s);
            });
            
            for (const family in groups) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = family;
                groups[family].forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name;
                    if (s.id === scriptId) opt.selected = true;
                    optgroup.appendChild(opt);
                });
                select.appendChild(optgroup);
            }
            
            select.onchange = (e) => {
                state.compareScripts[index] = e.target.value;
                renderComparatorView();
            };

            selectDiv.appendChild(select);
            
            if (state.compareScripts.length > 2) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-square btn-outline border-base-300 btn-sm hover:btn-error';
                removeBtn.innerHTML = '✕';
                removeBtn.onclick = () => {
                    state.compareScripts.splice(index, 1);
                    renderComparatorView();
                };
                selectDiv.appendChild(removeBtn);
            }
            
            dom.comparatorSelectors.appendChild(selectDiv);
        });

        // Render Table Headers
        let headHTML = '<tr><th class="bg-base-200 border-b border-base-300 w-24">Phoneme</th>';
        state.compareScripts.forEach(scriptId => {
            const script = state.data.scripts.find(s => s.id === scriptId);
            headHTML += `<th class="text-base bg-base-200 border-b border-base-300 border-l border-base-300">${script.name}</th>`;
        });
        headHTML += '</tr>';
        dom.comparatorHead.innerHTML = headHTML;

        // Render only the selected phoneme category. This is recalculated every
        // time the comparator is rendered, including when scripts are added/removed.
        const bodyFrag = document.createDocumentFragment();
        const visiblePhonemes = state.data.phonemes.filter(phoneme =>
            state.comparatorCategory === 'all' || phoneme.cat === state.comparatorCategory
        );
        visiblePhonemes.forEach(p => {
            const rowChars = state.compareScripts.map(sid => (state.data.glyphs[p.id] && state.data.glyphs[p.id][sid]));
            if (rowChars.some(char => char)) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td class="font-bold opacity-70">${p.iast}</td>`;
                
                state.compareScripts.forEach(scriptId => {
                    const char = (state.data.glyphs[p.id] && state.data.glyphs[p.id][scriptId]) || '-';
                    const td = document.createElement('td');
                    td.className = 'text-3xl py-4 border-l border-base-300 ' + (char === '-' ? 'opacity-20' : 'cursor-pointer hover:bg-base-200 transition-colors');
                    td.textContent = char;
                    if (char !== '-') {
                        td.onclick = () => openComparisonModal(p.id, scriptId);
                    }
                    tr.appendChild(td);
                });
                bodyFrag.appendChild(tr);
            }
        });
        
        dom.comparatorBody.innerHTML = '';
        dom.comparatorBody.appendChild(bodyFrag);
    }

    // --- VIEW 4: DIGIT CONVERTER ---
    function setupDigitConverter() {
        dom.digitInput.addEventListener('input', debounce(updateDigits, 100));
        updateDigits(); 
    }

    function updateDigits() {
        const val = dom.digitInput.value.trim() || '0';
        const frag = document.createDocumentFragment();

        state.data.scripts.forEach(s => {
            let converted = '';
            for (const ch of val) {
                if (/[0-9]/.test(ch)) {
                    const pid = `num_${ch}`;
                    const char = (state.data.glyphs[pid] && state.data.glyphs[pid][s.id]) || ch;
                    converted += char;
                } else {
                    converted += ch;
                }
            }

            const card = document.createElement('div');
            card.className = 'card bg-base-100 shadow border border-base-300 transition-all hover:bg-base-200 cursor-pointer';
            card.innerHTML = `
                <div class="card-body p-4 text-center">
                    <div class="text-xs uppercase opacity-70 font-bold mb-2 truncate" title="${s.name}">${s.name}</div>
                    <div class="text-3xl font-medium break-all tracking-wide">${converted}</div>
                </div>
            `;
            
            card.onclick = () => {
                navigator.clipboard.writeText(converted);
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.style.transform = 'scale(1)', 150);
            };

            frag.appendChild(card);
        });

        dom.digitOutputGrid.innerHTML = '';
        dom.digitOutputGrid.appendChild(frag);
    }

    // --- VIEW 5: TRANSLITERATION ENGINE ---
    function setupTransliterator() {
        if (!state.transliterator) {
            dom.translitInput.placeholder = "Engine not found. Ensure transliterate.js is loaded.";
            return;
        }
        // Start with a genuinely empty input; results appear only after typing.
        dom.translitInput.value = '';
        dom.translitInput.addEventListener('input', debounce(updateTransliteration, 200));
        updateTransliteration();
    }

    function updateTransliteration() {
        if (!state.transliterator) return;
        const val = dom.translitInput.value;
        const results = state.transliterator.transliterateAll(val);
        
        const frag = document.createDocumentFragment();
        if (results.iast) frag.appendChild(createTranslitCard('IAST Phonetic', results.iast));

        state.data.scripts.forEach(s => {
            if (results[s.id]) frag.appendChild(createTranslitCard(s.name, results[s.id]));
        });

        dom.translitOutputGrid.innerHTML = '';
        dom.translitOutputGrid.appendChild(frag);
    }

    function createTranslitCard(title, text) {
        const card = document.createElement('div');
        card.className = 'card bg-base-100 shadow border border-base-300';

        const body = document.createElement('div');
        body.className = 'card-body p-4';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-2 border-b border-base-300 pb-2';

        const heading = document.createElement('div');
        heading.className = 'text-[0.65rem] uppercase opacity-70 font-bold tracking-wider';
        heading.textContent = title;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-xs btn-ghost copy-btn tooltip tooltip-left';
        button.setAttribute('data-tip', 'Copy');
        button.setAttribute('aria-label', `Copy ${title} transliteration`);
        button.textContent = '📋';

        const output = document.createElement('div');
        output.className = 'text-2xl font-medium break-words leading-relaxed';
        output.textContent = text;

        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(text);
                button.setAttribute('data-tip', 'Copied!');
                button.textContent = '✓';
                setTimeout(() => {
                    button.setAttribute('data-tip', 'Copy');
                    button.textContent = '📋';
                }, 1500);
            } catch (error) {
                button.setAttribute('data-tip', 'Copy unavailable');
            }
        });

        header.append(heading, button);
        body.append(header, output);
        card.appendChild(body);
        return card;
    }

    // --- MODAL CONTROLLER ---
    function openComparisonModal(phonemeId, sourceScriptId) {
        const phoneme = state.data.phonemes.find(p => p.id === phonemeId);
        const sourceScript = state.data.scripts.find(s => s.id === sourceScriptId);
        if (!phoneme || !sourceScript) return;

        dom.modalPhonemeLabel.textContent = phoneme.name;
        dom.modalIast.textContent = phoneme.iast;
        dom.modalIpa.textContent = `/${phoneme.ipa}/`;
        dom.modalArt.textContent = phoneme.articulation;
        dom.modalManner.textContent = phoneme.manner;

        dom.modalMainChar.textContent = state.data.glyphs[phonemeId][sourceScriptId] || '-';
        dom.modalMainScript.textContent = sourceScript.name;

        const frag = document.createDocumentFragment();
        state.data.scripts.forEach(script => {
            const char = (state.data.glyphs[phonemeId] && state.data.glyphs[phonemeId][script.id]) || '-';
            const isBase = script.id === sourceScriptId;
            
            const card = document.createElement('div');
            card.className = `flex flex-col rounded-xl border p-3 transition-transform ${
                isBase ? 'border-primary bg-primary/10 shadow-sm' : 'border-base-300 bg-base-100 hover:bg-base-200'
            }`;
            
            card.innerHTML = `
                <div class="text-[0.65rem] font-bold text-center mb-2 uppercase opacity-80 truncate" title="${script.name}">${script.name}</div>
                <div class="flex-1 flex items-center justify-center min-h-[50px]">
                    <span class="text-3xl font-medium ${char === '-' ? 'opacity-30' : ''}">${char}</span>
                </div>
            `;
            
            if (char !== '-') {
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    navigator.clipboard.writeText(char);
                    card.style.transform = 'scale(0.9)';
                    setTimeout(() => card.style.transform = 'scale(1)', 150);
                };
                card.title = "Click to copy";
            }
            frag.appendChild(card);
        });

        dom.modalComparisonGrid.innerHTML = '';
        dom.modalComparisonGrid.appendChild(frag);
        dom.modal.showModal();
    }

    // --- UTILITIES ---
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    init();
});