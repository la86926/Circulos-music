(() => {
  'use strict';

  const KEYS = [
    { tonic: 'C',  scale: ['C','D','E','F','G','A','B'] },
    { tonic: 'G',  scale: ['G','A','B','C','D','E','F#'] },
    { tonic: 'D',  scale: ['D','E','F#','G','A','B','C#'] },
    { tonic: 'A',  scale: ['A','B','C#','D','E','F#','G#'] },
    { tonic: 'E',  scale: ['E','F#','G#','A','B','C#','D#'] },
    { tonic: 'B',  scale: ['B','C#','D#','E','F#','G#','A#'] },
    { tonic: 'F#', scale: ['F#','G#','A#','B','C#','D#','E#'] },
    { tonic: 'Db', scale: ['Db','Eb','F','Gb','Ab','Bb','C'] },
    { tonic: 'Ab', scale: ['Ab','Bb','C','Db','Eb','F','G'] },
    { tonic: 'Eb', scale: ['Eb','F','G','Ab','Bb','C','D'] },
    { tonic: 'Bb', scale: ['Bb','C','D','Eb','F','G','A'] },
    { tonic: 'F',  scale: ['F','G','A','Bb','C','D','E'] }
  ];

  const QUALITIES = ['major','minor','minor','major','major','minor','diminished'];
  const DEGREES = ['I','ii','iii','IV','V','vi','vii°'];
  const FUNCTIONS = ['Tónica','Supertónica','Mediante','Subdominante','Dominante','Superdominante','Sensible'];
  const PC = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, Fb:4, 'E#':5, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11, Cb:11 };
  const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const LATIN = { C:'DO', D:'RE', E:'MI', F:'FA', G:'SOL', A:'LA', B:'SI' };
  const OPEN_VOICINGS = {
    'C:major': { name:'Abierto tradicional', description:'Forma de DO abierta', frets:[null,3,2,0,1,0] },
    'G:major': { name:'Abierto tradicional', description:'Forma de SOL abierta', frets:[3,2,0,0,0,3] },
    'D:major': { name:'Abierto tradicional', description:'Forma de RE abierta', frets:[null,null,0,2,3,2] },
    'A:major': { name:'Abierto tradicional', description:'Forma de LA abierta', frets:[null,0,2,2,2,0] },
    'E:major': { name:'Abierto tradicional', description:'Forma de MI abierta', frets:[0,2,2,1,0,0] },
    'A:minor': { name:'Abierto tradicional', description:'Forma de LA menor', frets:[null,0,2,2,1,0] },
    'E:minor': { name:'Abierto tradicional', description:'Forma de MI menor', frets:[0,2,2,0,0,0] },
    'D:minor': { name:'Abierto tradicional', description:'Forma de RE menor', frets:[null,null,0,2,3,1] }
  };

  const state = {
    keyIndex: 0,
    nomenclature: 'latin',
    instrument: 'piano',
    selectedDegree: 0,
    inversion: 0,
    guitarVoicing: 0,
    theme: localStorage.getItem('circulos-theme') || 'system',
    progression: []
  };

  const el = Object.fromEntries([
    'toneSelector','scaleTitle','scaleNotes','chordsTitle','diatonicGrid','selectedDegreeLabel','selectedChordTitle',
    'selectedChordNotes','pianoKeyboard','pianoVoicingText','guitarVoicings','pianoPanel','guitarPanel','statusKey',
    'statusChord','statusPosition','themeBtn','playChordBtn','playScaleBtn','customProgression','applyProgressionBtn',
    'playProgressionBtn','progressionChips','tempoInput','toast'
  ].map(id => [id, document.getElementById(id)]));

  let audioContext = null;
  let progressionTimer = null;

  function notePc(note) { return PC[note]; }
  function keyData() { return KEYS[state.keyIndex]; }
  function currentChords() { return buildDiatonicChords(keyData()); }
  function selectedChord() { return currentChords()[state.selectedDegree]; }

  function formatNote(note) {
    if (state.nomenclature === 'english') return note.replace('#','♯').replace('b','♭');
    const letter = note[0];
    const accidental = note.slice(1).replace('#','♯').replace('b','♭');
    return `${LATIN[letter] || letter}${accidental}`;
  }

  function qualityLabel(quality) {
    return quality === 'major' ? 'Mayor' : quality === 'minor' ? 'Menor' : 'Disminuido';
  }

  function chordSymbol(chord) {
    const root = formatNote(chord.root);
    if (chord.quality === 'minor') return `${root}m`;
    if (chord.quality === 'diminished') return `${root}°`;
    return root;
  }

  function chordLongName(chord) { return `${formatNote(chord.root)} ${qualityLabel(chord.quality).toLowerCase()}`; }

  function buildDiatonicChords(key) {
    return key.scale.map((root, i) => ({
      root,
      rootPc: notePc(root),
      quality: QUALITIES[i],
      degree: DEGREES[i],
      functionName: FUNCTIONS[i],
      notes: [key.scale[i], key.scale[(i + 2) % 7], key.scale[(i + 4) % 7]]
    }));
  }

  function chromaticName(pc, preferFlat = false) { return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[(pc + 12) % 12]; }

  function renderToneSelector() {
    el.toneSelector.innerHTML = KEYS.map((key, index) => `
      <button class="tone-btn ${index === state.keyIndex ? 'active' : ''}" data-key-index="${index}" type="button">
        ${formatNote(key.tonic)}
      </button>`).join('');
    el.toneSelector.querySelectorAll('.tone-btn').forEach(btn => btn.addEventListener('click', () => {
      state.keyIndex = Number(btn.dataset.keyIndex);
      state.selectedDegree = 0;
      state.inversion = 0;
      state.guitarVoicing = 0;
      renderAll();
    }));
  }

  function renderScale() {
    const key = keyData();
    el.scaleTitle.textContent = `Escala de ${formatNote(key.tonic)} mayor`;
    el.scaleNotes.innerHTML = key.scale.map((note, index) => `
      <div class="scale-note"><small>Grado ${index + 1}</small><strong>${formatNote(note)}</strong></div>`).join('');
  }

  function renderDiatonicChords() {
    const chords = currentChords();
    el.chordsTitle.textContent = `Los 7 acordes de ${formatNote(keyData().tonic)} mayor`;
    el.diatonicGrid.innerHTML = chords.map((chord, index) => `
      <button class="chord-card ${index === state.selectedDegree ? 'active' : ''}" data-degree-index="${index}" type="button">
        <span class="degree-badge">${chord.degree}</span>
        <span class="play-dot"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z"/></svg></span>
        <strong class="chord-card-name">${chordSymbol(chord)}</strong>
        <span class="chord-quality">${qualityLabel(chord.quality)}</span>
        <span class="chord-function">${chord.functionName}</span>
        <span class="chord-card-notes">${chord.notes.map(formatNote).join(' · ')}</span>
      </button>`).join('');
    el.diatonicGrid.querySelectorAll('.chord-card').forEach(card => card.addEventListener('click', () => {
      state.selectedDegree = Number(card.dataset.degreeIndex);
      state.inversion = 0;
      state.guitarVoicing = 0;
      renderAll();
      playSelectedChord();
      document.getElementById('instrumento').scrollIntoView({ behavior:'smooth', block:'start' });
    }));
  }

  function chordIntervals(quality) {
    return quality === 'major' ? [0,4,7] : quality === 'minor' ? [0,3,7] : [0,3,6];
  }

  function pianoVoicingMidi(chord, inversion = state.inversion) {
    const notes = chordIntervals(chord.quality).map(interval => 60 + chord.rootPc + interval);
    while (notes[0] >= 72) notes.forEach((_, i) => notes[i] -= 12);
    for (let i = 0; i < inversion; i++) notes.push(notes.shift() + 12);
    return notes;
  }

  function buildPiano() {
    const chord = selectedChord();
    const voicing = pianoVoicingMidi(chord);
    const voicingSet = new Set(voicing);
    const chordPcs = new Set(chord.notes.map(notePc));
    const rootPc = chord.rootPc;
    const whitePcs = new Set([0,2,4,5,7,9,11]);
    const labels = state.nomenclature === 'latin' ? ['DO','DO♯','RE','RE♯','MI','FA','FA♯','SOL','SOL♯','LA','LA♯','SI'] : ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
    const startMidi = 48;
    const endMidi = 84;
    const whites = [];
    for (let midi = startMidi; midi <= endMidi; midi++) if (whitePcs.has(midi % 12)) whites.push(midi);
    const whiteWidth = 56;
    el.pianoKeyboard.innerHTML = '';

    whites.forEach((midi, index) => {
      const pc = midi % 12;
      const key = document.createElement('button');
      key.type = 'button';
      key.className = `white-key${chordPcs.has(pc) ? ' chord-tone' : ''}${voicingSet.has(midi) ? ' voicing-tone' : ''}${pc === rootPc ? ' root-tone' : ''}`;
      key.textContent = labels[pc];
      key.dataset.midi = midi;
      key.addEventListener('click', () => playMidi([midi], .7));
      el.pianoKeyboard.appendChild(key);

      if ([0,2,5,7,9].includes(pc) && midi + 1 <= endMidi) {
        const blackMidi = midi + 1;
        const blackPc = blackMidi % 12;
        const black = document.createElement('button');
        black.type = 'button';
        black.className = `black-key${chordPcs.has(blackPc) ? ' chord-tone' : ''}${voicingSet.has(blackMidi) ? ' voicing-tone' : ''}${blackPc === rootPc ? ' root-tone' : ''}`;
        black.style.left = `${(index + 1) * whiteWidth - 17}px`;
        black.textContent = labels[blackPc];
        black.dataset.midi = blackMidi;
        black.addEventListener('click', () => playMidi([blackMidi], .7));
        el.pianoKeyboard.appendChild(black);
      }
    });
    el.pianoKeyboard.style.minWidth = `${whites.length * whiteWidth + 8}px`;

    const orderedNames = voicing.map(midi => formatNote(chromaticName(midi % 12, keyData().tonic.includes('b'))));
    el.pianoVoicingText.textContent = orderedNames.join(' · ');
    document.querySelectorAll('[data-inversion]').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.inversion) === state.inversion));
  }

  function openVoicingFor(chord) {
    return OPEN_VOICINGS[`${chord.root}:${chord.quality}`] || null;
  }

  function normalizeFret(fret) { return fret === 0 ? 12 : fret; }

  function barreVoicings(chord) {
    if (chord.quality === 'diminished') return diminishedVoicings(chord);
    const rE = normalizeFret((chord.rootPc - 4 + 12) % 12);
    const rA = normalizeFret((chord.rootPc - 9 + 12) % 12);
    const isMajor = chord.quality === 'major';
    const eShape = isMajor ? [rE,rE+2,rE+2,rE+1,rE,rE] : [rE,rE+2,rE+2,rE,rE,rE];
    const aShape = isMajor ? [null,rA,rA+2,rA+2,rA+2,rA] : [null,rA,rA+2,rA+2,rA+1,rA];
    return [
      { name:`Cejilla · forma E`, description:`Raíz en 6.ª cuerda · traste ${rE}`, frets:eShape, barre:{ fret:rE, from:0, to:5 } },
      { name:`Cejilla · forma A`, description:`Raíz en 5.ª cuerda · traste ${rA}`, frets:aShape, barre:{ fret:rA, from:1, to:5 } }
    ];
  }

  function diminishedVoicings(chord) {
    const rA = normalizeFret((chord.rootPc - 9 + 12) % 12);
    let rD = normalizeFret((chord.rootPc - 2 + 12) % 12);
    if (rD < 4) rD += 12;
    return [
      { name:'Triada móvil', description:`Raíz en 5.ª cuerda · traste ${rA}`, frets:[null,rA,rA+1,rA+2,rA+1,null] },
      { name:'Triada aguda', description:`Raíz en 4.ª cuerda · traste ${rD}`, frets:[null,null,rD,rD-2,rD-3,rD-2] }
    ];
  }

  function compactTriads(chord) {
    const target = new Set(chordIntervals(chord.quality).map(i => (chord.rootPc + i) % 12));
    const tuning = [7,11,4];
    const found = [];
    for (let g = 0; g <= 12; g++) for (let b = 0; b <= 12; b++) for (let e = 0; e <= 12; e++) {
      const frets = [g,b,e];
      const pcs = frets.map((f, i) => (tuning[i] + f) % 12);
      if (!pcs.every(pc => target.has(pc)) || new Set(pcs).size !== 3) continue;
      const span = Math.max(...frets) - Math.min(...frets);
      if (span > 4) continue;
      found.push({ frets, span, min:Math.min(...frets), max:Math.max(...frets) });
    }
    found.sort((a,b) => (a.span - b.span) || (a.max - b.max));
    const chosen = [];
    for (const item of found) {
      if (chosen.some(c => Math.abs(c.min - item.min) < 3)) continue;
      chosen.push(item);
      if (chosen.length === 2) break;
    }
    return chosen.map((item, index) => ({
      name:`Triada compacta ${index + 1}`,
      description:`Tres cuerdas agudas · zona del traste ${Math.max(1, item.min)}`,
      frets:[null,null,null,...item.frets]
    }));
  }

  function guitarVoicingsFor(chord) {
    const result = [];
    const open = openVoicingFor(chord);
    if (open) result.push(open);
    result.push(...barreVoicings(chord));
    result.push(...compactTriads(chord).slice(0, open ? 1 : 2));
    return result.slice(0, 4);
  }

  function guitarMidi(voicing) {
    const tuning = [40,45,50,55,59,64];
    return voicing.frets.map((fret, index) => fret === null ? null : tuning[index] + fret).filter(Number.isFinite);
  }

  function diagramSvg(voicing, chord) {
    const frets = voicing.frets;
    const positive = frets.filter(f => Number.isFinite(f) && f > 0);
    let startFret = positive.length ? Math.min(...positive) : 1;
    if (startFret <= 3 && Math.max(...positive, 0) <= 5) startFret = 1;
    const endFret = startFret + 4;
    const width = 220, height = 250, left = 35, top = 38, stringGap = 30, fretGap = 36;
    const rootPc = chord.rootPc;
    const tuningPc = [4,9,2,7,11,4];
    let svg = `<svg class="chord-diagram" viewBox="0 0 ${width} ${height}" role="img" aria-label="Diagrama de ${chordLongName(chord)}">`;
    for (let s = 0; s < 6; s++) svg += `<line class="diagram-string" x1="${left+s*stringGap}" y1="${top}" x2="${left+s*stringGap}" y2="${top+5*fretGap}"/>`;
    for (let f = 0; f <= 5; f++) svg += `<line class="${startFret === 1 && f === 0 ? 'diagram-nut' : 'diagram-fret'}" x1="${left}" y1="${top+f*fretGap}" x2="${left+5*stringGap}" y2="${top+f*fretGap}"/>`;
    if (startFret > 1) svg += `<text class="diagram-label" x="8" y="${top+fretGap*.7}">${startFret}</text>`;

    if (voicing.barre && voicing.barre.fret >= startFret && voicing.barre.fret <= endFret) {
      const y = top + (voicing.barre.fret - startFret + .5) * fretGap;
      svg += `<line class="diagram-barre" x1="${left+voicing.barre.from*stringGap}" y1="${y}" x2="${left+voicing.barre.to*stringGap}" y2="${y}"/>`;
    }

    frets.forEach((fret, s) => {
      const x = left + s * stringGap;
      if (fret === null) { svg += `<text class="diagram-label" x="${x}" y="22" text-anchor="middle">×</text>`; return; }
      if (fret === 0) { svg += `<text class="diagram-label" x="${x}" y="22" text-anchor="middle">○</text>`; return; }
      if (fret < startFret || fret > endFret) return;
      const y = top + (fret - startFret + .5) * fretGap;
      const pc = (tuningPc[s] + fret) % 12;
      const rootClass = pc === rootPc ? 'diagram-root' : 'diagram-dot';
      svg += `<circle class="${rootClass}" cx="${x}" cy="${y}" r="10"/>`;
      if (pc === rootPc) svg += `<text class="diagram-dot-text" x="${x}" y="${y}">R</text>`;
    });
    svg += `<text class="diagram-label" x="${left}" y="${height-10}">6.ª</text><text class="diagram-label" x="${left+5*stringGap}" y="${height-10}" text-anchor="end">1.ª</text></svg>`;
    return svg;
  }

  function renderGuitar() {
    const chord = selectedChord();
    const voicings = guitarVoicingsFor(chord);
    if (state.guitarVoicing >= voicings.length) state.guitarVoicing = 0;
    el.guitarVoicings.innerHTML = voicings.map((voicing, index) => `
      <article class="voicing-card ${index === state.guitarVoicing ? 'active' : ''}" data-voicing-index="${index}">
        <div class="voicing-card-head">
          <div><h4>${voicing.name}</h4><p>${voicing.description}</p></div>
          <button class="voicing-play" data-play-voicing="${index}" type="button" aria-label="Probar esta posición">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z"/></svg>
          </button>
        </div>
        ${diagramSvg(voicing, chord)}
      </article>`).join('');
    el.guitarVoicings.querySelectorAll('.voicing-card').forEach(card => card.addEventListener('click', event => {
      if (event.target.closest('.voicing-play')) return;
      state.guitarVoicing = Number(card.dataset.voicingIndex);
      renderGuitar();
      updateStatus();
    }));
    el.guitarVoicings.querySelectorAll('[data-play-voicing]').forEach(btn => btn.addEventListener('click', () => {
      state.guitarVoicing = Number(btn.dataset.playVoicing);
      renderGuitar();
      updateStatus();
      playMidi(guitarMidi(voicings[state.guitarVoicing]), 1.15, true);
    }));
  }

  function renderSelectedChord() {
    const chord = selectedChord();
    el.selectedDegreeLabel.textContent = `Grado ${chord.degree} · ${chord.functionName}`;
    el.selectedChordTitle.textContent = chordLongName(chord);
    el.selectedChordNotes.textContent = `Notas: ${chord.notes.map(formatNote).join(' · ')}`;
    buildPiano();
    renderGuitar();
  }

  function setInstrument(instrument) {
    state.instrument = instrument;
    document.querySelectorAll('[data-instrument]').forEach(btn => btn.classList.toggle('active', btn.dataset.instrument === instrument));
    el.pianoPanel.classList.toggle('hidden', instrument !== 'piano');
    el.guitarPanel.classList.toggle('hidden', instrument !== 'guitar');
    updateStatus();
  }

  function updateStatus() {
    const chord = selectedChord();
    el.statusKey.textContent = `${formatNote(keyData().tonic)} mayor`;
    el.statusChord.textContent = chordLongName(chord);
    if (state.instrument === 'piano') {
      el.statusPosition.textContent = ['Fundamental','1.ª inversión','2.ª inversión'][state.inversion];
    } else {
      const voicing = guitarVoicingsFor(chord)[state.guitarVoicing];
      el.statusPosition.textContent = voicing ? voicing.name : 'Guitarra';
    }
  }

  function ensureAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function playMidi(midis, duration = 1, arpeggio = false) {
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    midis.forEach((midi, index) => {
      const start = now + (arpeggio ? index * .045 : 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.035, .13 / Math.sqrt(midis.length)), start + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + .03);
    });
  }

  function playSelectedChord() {
    const chord = selectedChord();
    if (state.instrument === 'guitar') {
      const voicing = guitarVoicingsFor(chord)[state.guitarVoicing];
      playMidi(guitarMidi(voicing), 1.2, true);
    } else {
      playMidi(pianoVoicingMidi(chord), 1.2);
    }
  }

  function playScale() {
    const key = keyData();
    const base = 60 + notePc(key.tonic);
    const midis = key.scale.map(note => {
      let midi = 60 + notePc(note);
      while (midi < base) midi += 12;
      return midi;
    });
    midis.push(base + 12);
    midis.forEach((midi, index) => setTimeout(() => playMidi([midi], .48), index * 340));
  }

  function parseChordToken(token) {
    let raw = token.trim().replace(/[–—,;|]+/g, '').replace(/♯/g,'#').replace(/♭/g,'b');
    if (!raw) return null;
    const upper = raw.toUpperCase();
    const latinRoots = [['SOL','G'],['DO','C'],['RE','D'],['MI','E'],['FA','F'],['LA','A'],['SI','B']];
    let root = null;
    let rest = raw;
    for (const [latin, english] of latinRoots) {
      if (upper.startsWith(latin)) {
        root = english;
        rest = raw.slice(latin.length);
        break;
      }
    }
    if (!root) {
      const match = raw.match(/^([A-Ga-g])([#b]?)(.*)$/);
      if (!match) return null;
      root = match[1].toUpperCase() + match[2];
      rest = match[3];
    } else if (/^[#b]/.test(rest)) {
      root += rest[0];
      rest = rest.slice(1);
    }
    if (!(root in PC)) return null;
    const suffix = rest.toLowerCase();
    const quality = suffix.includes('dim') || suffix.includes('°') || suffix === 'o' ? 'diminished' : suffix.startsWith('m') ? 'minor' : 'major';
    const intervals = chordIntervals(quality);
    const preferFlat = root.includes('b');
    return {
      root,
      rootPc: notePc(root),
      quality,
      degree:'',
      functionName:'Progresión libre',
      notes: intervals.map(i => chromaticName(notePc(root) + i, preferFlat))
    };
  }

  function applyProgression(showMessage = true) {
    const tokens = el.customProgression.value.split(/\s+/).map(parseChordToken).filter(Boolean);
    if (!tokens.length) {
      showToast('No pude reconocer los acordes. Prueba: DO LAm FA SOL');
      return;
    }
    state.progression = tokens;
    renderProgression();
    if (showMessage) showToast(`${tokens.length} acordes preparados`);
  }

  function renderProgression(activeIndex = -1) {
    el.progressionChips.innerHTML = state.progression.map((chord, index) => `<span class="progression-chip ${index === activeIndex ? 'playing' : ''}">${chordSymbol(chord)}</span>`).join('');
  }

  function playProgression() {
    if (!state.progression.length) applyProgression(false);
    if (!state.progression.length) return;
    if (progressionTimer) {
      clearInterval(progressionTimer);
      progressionTimer = null;
      renderProgression();
      el.playProgressionBtn.lastChild.textContent = ' Reproducir';
      return;
    }
    const bpm = Math.min(220, Math.max(40, Number(el.tempoInput.value) || 92));
    const beatMs = 60000 / bpm * 2;
    let index = 0;
    const tick = () => {
      const chord = state.progression[index];
      renderProgression(index);
      playMidi(pianoVoicingMidi(chord, 0), Math.min(1.4, beatMs / 1000 * .8));
      index++;
      if (index >= state.progression.length) {
        setTimeout(() => renderProgression(), beatMs * .75);
        clearInterval(progressionTimer);
        progressionTimer = null;
        el.playProgressionBtn.lastChild.textContent = ' Reproducir';
      }
    };
    el.playProgressionBtn.lastChild.textContent = ' Detener';
    tick();
    progressionTimer = setInterval(tick, beatMs);
  }

  function applyTheme() {
    const resolved = state.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.theme;
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', resolved === 'dark' ? '#101210' : '#f6f6f3');
  }

  function cycleTheme() {
    state.theme = state.theme === 'system' ? 'light' : state.theme === 'light' ? 'dark' : 'system';
    localStorage.setItem('circulos-theme', state.theme);
    applyTheme();
    showToast(`Apariencia: ${state.theme === 'system' ? 'sistema' : state.theme === 'light' ? 'clara' : 'oscura'}`);
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.toast.classList.remove('show'), 1900);
  }

  function renderAll() {
    renderToneSelector();
    renderScale();
    renderDiatonicChords();
    renderSelectedChord();
    setInstrument(state.instrument);
    updateStatus();
  }

  document.querySelectorAll('[data-nomenclature]').forEach(btn => btn.addEventListener('click', () => {
    state.nomenclature = btn.dataset.nomenclature;
    document.querySelectorAll('[data-nomenclature]').forEach(item => item.classList.toggle('active', item === btn));
    renderAll();
    renderProgression();
  }));
  document.querySelectorAll('[data-instrument]').forEach(btn => btn.addEventListener('click', () => setInstrument(btn.dataset.instrument)));
  document.querySelectorAll('[data-inversion]').forEach(btn => btn.addEventListener('click', () => {
    state.inversion = Number(btn.dataset.inversion);
    buildPiano();
    updateStatus();
    playSelectedChord();
  }));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(item => item.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior:'smooth', block:'start' });
  }));
  document.getElementById('scrollTopBtn').addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
  el.themeBtn.addEventListener('click', cycleTheme);
  el.playChordBtn.addEventListener('click', playSelectedChord);
  el.playScaleBtn.addEventListener('click', playScale);
  el.applyProgressionBtn.addEventListener('click', () => applyProgression());
  el.customProgression.addEventListener('keydown', event => { if (event.key === 'Enter') applyProgression(); });
  el.playProgressionBtn.addEventListener('click', playProgression);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.theme === 'system') applyTheme(); });

  applyTheme();
  applyProgression(false);
  renderAll();
})();
