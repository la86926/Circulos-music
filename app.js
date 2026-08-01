(() => {
'use strict';
const NOTE_NAMES_EN_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_EN_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_NAMES_LAT_SHARP = ['DO', 'DO#', 'RE', 'RE#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];
const NOTE_NAMES_LAT_FLAT = ['DO', 'REb', 'RE', 'MIb', 'MI', 'FA', 'SOLb', 'SOL', 'LAb', 'LA', 'SIb', 'SI'];
const KEYS = [
{ id: 'C', pc: 0, flat: false }, { id: 'G', pc: 7, flat: false }, { id: 'D', pc: 2, flat: false },
{ id: 'A', pc: 9, flat: false }, { id: 'E', pc: 4, flat: false }, { id: 'B', pc: 11, flat: false },
{ id: 'F#', pc: 6, flat: false }, { id: 'Db', pc: 1, flat: true }, { id: 'Ab', pc: 8, flat: true },
{ id: 'Eb', pc: 3, flat: true }, { id: 'Bb', pc: 10, flat: true }, { id: 'F', pc: 5, flat: true }
];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
const DEGREE_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const DEGREE_ROLES = ['Tónica', 'Supertónica', 'Mediante', 'Subdominante', 'Dominante', 'Submediante', 'Sensible'];
const CIRCLE_PATTERNS = {
3: { degrees: [0, 3, 4], label: 'I – IV – V' },
4: { degrees: [0, 5, 3, 4], label: 'I – vi – IV – V' },
7: { degrees: [0, 1, 2, 3, 4, 5, 6], label: 'I – ii – iii – IV – V – vi – vii°' }
};
const CHORD_INTERVALS = {
'': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11],
m7: [0, 3, 7, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8],
sus2: [0, 2, 7], sus4: [0, 5, 7], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9]
};
const GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const GUITAR_STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];
const state = {
nomenclature: localStorage.getItem('cm_nomenclature') || 'latin',
instrument: localStorage.getItem('cm_instrument') || 'piano',
theme: localStorage.getItem('cm_theme') || 'system',
keyId: localStorage.getItem('cm_key') || 'C',
circleSize: Number(localStorage.getItem('cm_circle_size')) || 4,
custom: false,
progression: [],
activeIndex: 0,
isPlaying: false,
playToken: 0
};
const els = {
html: document.documentElement,
themeBtn: document.getElementById('themeBtn'),
themeIcon: document.getElementById('themeIcon'),
toneSelector: document.getElementById('toneSelector'),
customProgression: document.getElementById('customProgression'),
applyCustomBtn: document.getElementById('applyCustomBtn'),
resetCircleBtn: document.getElementById('resetCircleBtn'),
circleGrid: document.getElementById('circleGrid'),
circleTitle: document.getElementById('circleTitle'),
circleSubtitle: document.getElementById('circleSubtitle'),
statusKey: document.getElementById('statusKey'),
statusInstrument: document.getElementById('statusInstrument'),
statusChord: document.getElementById('statusChord'),
nowPlaying: document.getElementById('nowPlaying'),
tempoInput: document.getElementById('tempoInput'),
playProgressionBtn: document.getElementById('playProgressionBtn'),
playProgressionText: document.getElementById('playProgressionText'),
playProgressionIcon: document.getElementById('playProgressionIcon'),
copyBtn: document.getElementById('copyBtn'),
playChordBtn: document.getElementById('playChordBtn'),
pianoView: document.getElementById('pianoView'),
guitarView: document.getElementById('guitarView'),
pianoKeyboard: document.getElementById('pianoKeyboard'),
guitarFretboard: document.getElementById('guitarFretboard'),
visualTitle: document.getElementById('visualTitle'),
visualSubtitle: document.getElementById('visualSubtitle'),
instrumentHelper: document.getElementById('instrumentHelper'),
toast: document.getElementById('toast')
};
let audioContext = null;
let toastTimer = null;
function mod(n, m) { return ((n % m) + m) % m; }
function getAudioContext() {
if (!audioContext) {
const AudioCtx = window.AudioContext || window.webkitAudioContext;
if (!AudioCtx) return null;
audioContext = new AudioCtx();
}
if (audioContext.state === 'suspended') audioContext.resume();
return audioContext;
}
function midiToFrequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
function playTone(midi, startTime, duration = 1.15, instrument = state.instrument, gainAmount = .08) {
const ctx = getAudioContext();
if (!ctx) return;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
const filter = ctx.createBiquadFilter();
const now = Math.max(ctx.currentTime, startTime || ctx.currentTime);
osc.frequency.setValueAtTime(midiToFrequency(midi), now);
osc.type = instrument === 'guitar' ? 'triangle' : 'sine';
filter.type = 'lowpass';
filter.frequency.setValueAtTime(instrument === 'guitar' ? 1800 : 3200, now);
gain.gain.setValueAtTime(.0001, now);
gain.gain.exponentialRampToValueAtTime(gainAmount, now + (instrument === 'guitar' ? .008 : .025));
if (instrument === 'guitar') {
gain.gain.exponentialRampToValueAtTime(.018, now + .2);
gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
} else {
gain.gain.exponentialRampToValueAtTime(.045, now + .12);
gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
}
osc.connect(filter).connect(gain).connect(ctx.destination);
osc.start(now);
osc.stop(now + duration + .05);
}
function playChord(chord, when = null, duration = 1.25) {
const ctx = getAudioContext();
if (!ctx || !chord) return;
const start = when || ctx.currentTime;
const baseMidi = state.instrument === 'guitar' ? 48 : 60;
chord.intervals.forEach((interval, index) => {
let midi = baseMidi + chord.rootPc + interval;
while (midi < (state.instrument === 'guitar' ? 45 : 57)) midi += 12;
while (midi > (state.instrument === 'guitar' ? 67 : 76)) midi -= 12;
playTone(midi, start + (state.instrument === 'guitar' ? index * .035 : index * .012), duration, state.instrument, state.instrument === 'guitar' ? .065 : .07);
});
}
function getPreferredFlat() {
if (state.custom && state.progression[state.activeIndex]) return Boolean(state.progression[state.activeIndex].flat);
return KEYS.find(k => k.id === state.keyId)?.flat || false;
}
function noteName(pc, flat = getPreferredFlat(), nomenclature = state.nomenclature) {
const idx = mod(pc, 12);
if (nomenclature === 'latin') return (flat ? NOTE_NAMES_LAT_FLAT : NOTE_NAMES_LAT_SHARP)[idx];
return (flat ? NOTE_NAMES_EN_FLAT : NOTE_NAMES_EN_SHARP)[idx];
}
function qualitySuffix(quality) {
const map = {
'': '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', dim: 'dim', dim7: 'dim7',
aug: 'aug', sus2: 'sus2', sus4: 'sus4', '6': '6', m6: 'm6'
};
return map[quality] ?? quality;
}
function chordDisplay(chord) { return noteName(chord.rootPc, chord.flat) + qualitySuffix(chord.quality); }
function chordNoteNames(chord) {
return chord.intervals.map(i => noteName(chord.rootPc + i, chord.flat)).join('–');
}
function buildChord(rootPc, quality = '', options = {}) {
const normalizedQuality = CHORD_INTERVALS[quality] ? quality : '';
return {
rootPc: mod(rootPc, 12),
quality: normalizedQuality,
intervals: CHORD_INTERVALS[normalizedQuality],
flat: Boolean(options.flat),
degree: options.degree || '',
role: options.role || 'Acorde personalizado'
};
}
function buildAutomaticProgression() {
const key = KEYS.find(k => k.id === state.keyId) || KEYS[0];
const pattern = CIRCLE_PATTERNS[state.circleSize] || CIRCLE_PATTERNS[4];
state.progression = pattern.degrees.map(degreeIndex => {
const rootPc = mod(key.pc + MAJOR_STEPS[degreeIndex], 12);
return buildChord(rootPc, DIATONIC_QUALITIES[degreeIndex], {
flat: key.flat,
degree: DEGREE_ROMANS[degreeIndex],
role: DEGREE_ROLES[degreeIndex]
});
});
state.activeIndex = Math.min(state.activeIndex, state.progression.length - 1);
}
function normalizeToken(raw) {
return raw.trim().replace(/[()\[\]]/g, '').replace(/♯/g, '#').replace(/♭/g, 'b');
}
function parseChordToken(raw) {
let token = normalizeToken(raw);
if (!token) return null;
const latinMatch = token.match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?(.*)$/i);
const englishMatch = token.match(/^([A-Ga-g])(#|b)?(.*)$/);
let baseName = '';
let accidental = '';
let suffix = '';
let rootPc = null;
if (latinMatch) {
baseName = latinMatch[1].toUpperCase();
accidental = latinMatch[2] || '';
suffix = latinMatch[3] || '';
const baseMap = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };
rootPc = baseMap[baseName];
} else if (englishMatch) {
baseName = englishMatch[1].toUpperCase();
accidental = englishMatch[2] || '';
suffix = englishMatch[3] || '';
const baseMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
rootPc = baseMap[baseName];
} else {
return null;
}
if (accidental === '#') rootPc += 1;
if (accidental === 'b') rootPc -= 1;
const s = suffix.trim().replace(/^-/, '').toLowerCase();
const qualityMap = {
'': '', m: 'm', min: 'm', menor: 'm', '7': '7', maj7: 'maj7', 'm7': 'm7', min7: 'm7',
dim: 'dim', '°': 'dim', disminuido: 'dim', dim7: 'dim7', aug: 'aug', '+': 'aug',
sus2: 'sus2', sus4: 'sus4', sus: 'sus4', '6': '6', m6: 'm6'
};
const quality = qualityMap[s];
if (quality === undefined) return null;
return buildChord(rootPc, quality, { flat: accidental === 'b', role: 'Acorde personalizado' });
}
function parseProgression(value) {
const tokens = value
.replace(/[|/]+/g, ' ')
.replace(/[–—,;]+/g, ' ')
.split(/\s+/)
.filter(Boolean);
return { tokens, chords: tokens.map(parseChordToken) };
}
function renderToneSelector() {
els.toneSelector.innerHTML = '';
KEYS.forEach(key => {
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'tone-btn' + (key.id === state.keyId ? ' active' : '');
btn.textContent = noteName(key.pc, key.flat);
btn.setAttribute('aria-label', 'Tonalidad ' + noteName(key.pc, key.flat));
btn.addEventListener('click', () => {
state.keyId = key.id;
state.custom = false;
state.activeIndex = 0;
localStorage.setItem('cm_key', state.keyId);
buildAutomaticProgression();
renderAll();
stopProgression();
});
els.toneSelector.appendChild(btn);
});
}
function renderCircle() {
els.circleGrid.innerHTML = '';
if (!state.progression.length) {
els.circleGrid.innerHTML = '<div class="empty-message">No hay acordes para mostrar.</div>';
return;
}
state.progression.forEach((chord, index) => {
const card = document.createElement('button');
card.type = 'button';
card.className = 'chord-card' + (index === state.activeIndex ? ' active' : '');
card.innerHTML = `
<span class="degree">${chord.degree || String(index + 1)}</span>
<span class="play-chip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z"/></svg></span>
<strong class="chord-name">${escapeHtml(chordDisplay(chord))}</strong>
<span class="chord-role">${escapeHtml(chord.role)}</span>
<span class="chord-notes">${escapeHtml(chordNoteNames(chord))}</span>`;
card.setAttribute('aria-label', `Seleccionar y escuchar ${chordDisplay(chord)}`);
card.addEventListener('click', () => {
state.activeIndex = index;
renderCircle();
renderInstrumentHighlights();
renderStatus();
playChord(chord);
});
els.circleGrid.appendChild(card);
});
const key = KEYS.find(k => k.id === state.keyId) || KEYS[0];
if (state.custom) {
els.circleTitle.textContent = 'Tu círculo personalizado';
els.circleSubtitle.textContent = state.progression.map(chordDisplay).join(' – ');
} else {
els.circleTitle.textContent = `Círculo armónico de ${noteName(key.pc, key.flat)} mayor`;
els.circleSubtitle.textContent = `Progresión ${CIRCLE_PATTERNS[state.circleSize].label}`;
}
}
function renderStatus() {
const key = KEYS.find(k => k.id === state.keyId) || KEYS[0];
const chord = state.progression[state.activeIndex];
els.statusKey.textContent = state.custom ? 'Personalizada' : `${noteName(key.pc, key.flat)} mayor`;
els.statusInstrument.textContent = state.instrument === 'piano' ? 'Piano' : 'Guitarra';
els.statusChord.textContent = chord ? chordDisplay(chord) : '—';
els.nowPlaying.textContent = chord ? `${chordDisplay(chord)} · ${chordNoteNames(chord)}` : '—';
}
function buildPiano() {
els.pianoKeyboard.innerHTML = '';
const startMidi = 48;
const endMidi = 71;
let whiteCount = 0;
const blackPositions = [];
for (let midi = startMidi; midi <= endMidi; midi++) {
const pc = mod(midi, 12);
const isBlack = [1, 3, 6, 8, 10].includes(pc);
if (!isBlack) {
const key = document.createElement('button');
key.type = 'button';
key.className = 'white-key';
key.dataset.pc = String(pc);
key.dataset.midi = String(midi);
key.textContent = noteName(pc, false);
key.addEventListener('click', () => playTone(midi, null, .9, 'piano', .09));
els.pianoKeyboard.appendChild(key);
whiteCount++;
} else {
blackPositions.push({ midi, pc, left: whiteCount * 58 - 18 });
}
}
blackPositions.forEach(info => {
const key = document.createElement('button');
key.type = 'button';
key.className = 'black-key';
key.style.left = `${info.left + 4}px`;
key.dataset.pc = String(info.pc);
key.dataset.midi = String(info.midi);
key.textContent = noteName(info.pc, false);
key.addEventListener('click', () => playTone(info.midi, null, .9, 'piano', .085));
els.pianoKeyboard.appendChild(key);
});
}
function buildGuitar() {
els.guitarFretboard.innerHTML = '';
const numbers = document.createElement('div');
numbers.className = 'fret-numbers';
numbers.innerHTML = '<span></span>' + Array.from({ length: 13 }, (_, fret) => `<span>${fret}</span>`).join('');
els.guitarFretboard.appendChild(numbers);
GUITAR_OPEN_MIDI.forEach((openMidi, stringIndex) => {
const row = document.createElement('div');
row.className = 'guitar-string';
row.innerHTML = `<span class="string-name">${GUITAR_STRING_NAMES[stringIndex]}</span>`;
for (let fret = 0; fret <= 12; fret++) {
const midi = openMidi + fret;
const pc = mod(midi, 12);
const cell = document.createElement('button');
cell.type = 'button';
cell.className = 'fret-cell';
cell.dataset.pc = String(pc);
cell.dataset.midi = String(midi);
cell.style.setProperty('--string-size', `${1 + stringIndex * .35}px`);
cell.setAttribute('aria-label', `Cuerda ${GUITAR_STRING_NAMES[stringIndex]}, traste ${fret}`);
cell.innerHTML = `<span class="note-marker">${noteName(pc, false)}</span>`;
cell.addEventListener('click', () => playTone(midi, null, 1.25, 'guitar', .095));
row.appendChild(cell);
}
els.guitarFretboard.appendChild(row);
});
}
function renderInstrumentText() {
const isPiano = state.instrument === 'piano';
els.pianoView.classList.toggle('hidden', !isPiano);
els.guitarView.classList.toggle('hidden', isPiano);
els.visualTitle.textContent = isPiano ? 'Visualización en piano' : 'Visualización en guitarra';
els.visualSubtitle.textContent = isPiano
? 'Las notas del acorde activo aparecen resaltadas en dos octavas.'
: 'El diapasón muestra todas las ubicaciones del acorde hasta el traste 12.';
els.instrumentHelper.textContent = isPiano
? 'Pulsa cualquier tecla para escucharla. El resaltado se actualiza al seleccionar otro acorde.'
: 'Pulsa una posición del diapasón para escucharla. La tónica aparece con el marcador oscuro.';
}
function renderInstrumentLabels() {
document.querySelectorAll('.white-key, .black-key').forEach(key => {
key.textContent = noteName(Number(key.dataset.pc), false);
});
document.querySelectorAll('.note-marker').forEach(marker => {
const cell = marker.closest('.fret-cell');
marker.textContent = noteName(Number(cell.dataset.pc), false);
});
}
function renderInstrumentHighlights() {
const chord = state.progression[state.activeIndex];
if (!chord) return;
const pcs = chord.intervals.map(i => mod(chord.rootPc + i, 12));
document.querySelectorAll('.white-key, .black-key').forEach(key => {
const pc = Number(key.dataset.pc);
key.classList.toggle('active', pcs.includes(pc));
key.classList.toggle('root-note', pc === chord.rootPc);
});
document.querySelectorAll('.fret-cell').forEach(cell => {
const pc = Number(cell.dataset.pc);
const marker = cell.querySelector('.note-marker');
marker.classList.toggle('visible', pcs.includes(pc));
marker.classList.toggle('root-note', pc === chord.rootPc);
});
}
function renderControls() {
document.querySelectorAll('[data-nomenclature]').forEach(btn => btn.classList.toggle('active', btn.dataset.nomenclature === state.nomenclature));
document.querySelectorAll('[data-instrument]').forEach(btn => btn.classList.toggle('active', btn.dataset.instrument === state.instrument));
document.querySelectorAll('[data-circle]').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.circle) === state.circleSize));
}
function renderAll() {
renderControls();
renderToneSelector();
renderCircle();
renderInstrumentText();
renderInstrumentLabels();
renderInstrumentHighlights();
renderStatus();
}
function applyCustomProgression() {
const value = els.customProgression.value.trim();
if (!value) {
showToast('Escribe al menos un acorde.', true);
els.customProgression.focus();
return;
}
const parsed = parseProgression(value);
const invalid = parsed.tokens.filter((_, index) => !parsed.chords[index]);
if (invalid.length) {
showToast(`No pude reconocer: ${invalid.join(', ')}`, true);
return;
}
if (!parsed.chords.length) {
showToast('No encontré acordes válidos.', true);
return;
}
stopProgression();
state.custom = true;
state.progression = parsed.chords;
state.activeIndex = 0;
renderAll();
document.getElementById('circulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
showToast('Círculo personalizado creado.');
}
function resetAutomatic() {
stopProgression();
state.custom = false;
state.activeIndex = 0;
buildAutomaticProgression();
renderAll();
showToast('Se restauró el círculo automático.');
}
function setNomenclature(value) {
state.nomenclature = value;
localStorage.setItem('cm_nomenclature', value);
renderAll();
}
function setInstrument(value) {
state.instrument = value;
localStorage.setItem('cm_instrument', value);
renderAll();
}
function setCircleSize(value) {
state.circleSize = value;
localStorage.setItem('cm_circle_size', String(value));
state.custom = false;
state.activeIndex = 0;
buildAutomaticProgression();
stopProgression();
renderAll();
}
function stopProgression() {
state.playToken++;
state.isPlaying = false;
els.playProgressionText.textContent = 'Reproducir';
els.playProgressionIcon.innerHTML = '<path d="M8 5v14l11-7Z"/>';
}
async function playProgression() {
if (state.isPlaying) {
stopProgression();
return;
}
const ctx = getAudioContext();
if (!ctx || !state.progression.length) {
showToast('El navegador no permite reproducir audio.', true);
return;
}
const tempo = Math.max(40, Math.min(220, Number(els.tempoInput.value) || 92));
els.tempoInput.value = String(tempo);
const secondsPerChord = 60 / tempo * 2;
const token = ++state.playToken;
state.isPlaying = true;
els.playProgressionText.textContent = 'Detener';
els.playProgressionIcon.innerHTML = '<path d="M7 7h10v10H7z"/>';
for (let i = 0; i < state.progression.length; i++) {
if (token !== state.playToken) break;
state.activeIndex = i;
renderCircle();
renderInstrumentHighlights();
renderStatus();
playChord(state.progression[i], ctx.currentTime + .03, Math.max(.7, secondsPerChord * .85));
await wait(secondsPerChord * 1000);
}
if (token === state.playToken) stopProgression();
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function copyProgression() {
const text = state.progression.map(chordDisplay).join(' – ');
try {
await navigator.clipboard.writeText(text);
showToast('Progresión copiada.');
} catch {
const temp = document.createElement('textarea');
temp.value = text;
temp.style.position = 'fixed';
temp.style.opacity = '0';
document.body.appendChild(temp);
temp.select();
document.execCommand('copy');
temp.remove();
showToast('Progresión copiada.');
}
}
function showToast(message, isError = false) {
clearTimeout(toastTimer);
els.toast.textContent = message;
els.toast.classList.toggle('error', isError);
els.toast.classList.add('show');
toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}
function escapeHtml(value) {
return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}
function applyTheme() {
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const resolved = state.theme === 'system' ? (prefersDark ? 'dark' : 'light') : state.theme;
els.html.dataset.theme = resolved;
document.querySelector('meta[name="theme-color"]').setAttribute('content', resolved === 'dark' ? '#101110' : '#f7f7f5');
const icon = resolved === 'dark'
? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>'
: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/>';
els.themeIcon.innerHTML = icon;
els.themeBtn.title = `Apariencia: ${state.theme === 'system' ? 'sistema' : state.theme === 'dark' ? 'oscura' : 'clara'}`;
}
function cycleTheme() {
state.theme = state.theme === 'system' ? 'light' : state.theme === 'light' ? 'dark' : 'system';
localStorage.setItem('cm_theme', state.theme);
applyTheme();
showToast(`Apariencia: ${state.theme === 'system' ? 'sistema' : state.theme === 'dark' ? 'oscura' : 'clara'}`);
}
document.querySelectorAll('[data-nomenclature]').forEach(btn => btn.addEventListener('click', () => setNomenclature(btn.dataset.nomenclature)));
document.querySelectorAll('[data-instrument]').forEach(btn => btn.addEventListener('click', () => setInstrument(btn.dataset.instrument)));
document.querySelectorAll('[data-circle]').forEach(btn => btn.addEventListener('click', () => setCircleSize(Number(btn.dataset.circle))));
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
document.querySelectorAll('.nav-btn').forEach(item => item.classList.remove('active'));
btn.classList.add('active');
document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
els.applyCustomBtn.addEventListener('click', applyCustomProgression);
els.customProgression.addEventListener('keydown', event => { if (event.key === 'Enter') applyCustomProgression(); });
els.resetCircleBtn.addEventListener('click', resetAutomatic);
els.playProgressionBtn.addEventListener('click', playProgression);
els.playChordBtn.addEventListener('click', () => playChord(state.progression[state.activeIndex]));
els.copyBtn.addEventListener('click', copyProgression);
els.themeBtn.addEventListener('click', cycleTheme);
document.getElementById('scrollTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.theme === 'system') applyTheme(); });
applyTheme();
buildAutomaticProgression();
buildPiano();
buildGuitar();
renderAll();
})();
