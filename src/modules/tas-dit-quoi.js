import { state, sb, show, escHtml, showToast, setRoute, today } from '../shared.js';
import { awardXP } from './xp.js';

const SB_URL = 'https://zryrfmothjhywkklmniw.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeXJmbW90aGpoeXdra2xtbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTYzNjEsImV4cCI6MjA5NDkzMjM2MX0.BWsZ5nXj8ePlB577zozrSO3voroRp8wkqGvM9MExaDg';
const EDGE_TDQ = SB_URL + '/functions/v1/tas-dit-quoi';

const TDQ_CATS = [
  { id: 'faux_sens',    label: 'Faux sens',          icon: '🔤', tag: "Mots qu'on utilise mal" },
  { id: 'etymologie',   label: 'Étymologie',          icon: '📜', tag: 'Origines surprenantes' },
  { id: 'expressions',  label: 'Expressions',         icon: '💬', tag: "D'où vient cette expression ?" },
  { id: 'emprunts',     label: 'Emprunts',            icon: '🌍', tag: "Mots venus d'ailleurs" },
  { id: 'glissement',   label: 'Glissement de sens',  icon: '🕐', tag: 'Sens qui a changé avec le temps' },
  { id: 'verlan',       label: 'Argot & verlan',      icon: '🎤', tag: 'La rue dans le dico' },
  { id: 'surprise',     label: 'Surprise',            icon: '🎲', tag: "Laisse le hasard choisir" },
];

let _tdqState = null;
let _tdqRevealed = false;

export async function goTasDitQuoi() {
  setRoute('tas-dit-quoi');
  state.prevScreen = document.querySelector('.screen.on')?.id || 'screen-anec';
  show('screen-load');
  const lt = document.getElementById('load-title');
  if (lt) lt.textContent = 'Chargement…';

  try {
    const res = await fetch(EDGE_TDQ, {
      headers: { 'Authorization': 'Bearer ' + SB_ANON, 'apikey': SB_ANON }
    });
    const data = await res.json();
    if (data?.word) {
      _tdqState = data;
      renderTDQ(false);
    } else {
      buildTDQPick();
      show('screen-tdq-pick');
    }
  } catch (e) {
    console.error('goTasDitQuoi:', e);
    buildTDQPick();
    show('screen-tdq-pick');
  }
}

export function buildTDQPick() {
  _tdqState = null;
  state.selTdqCat = null;
  const grid = document.getElementById('tdq-cat-grid');
  const btn = document.getElementById('btn-gen-tdq');
  if (!grid) return;
  grid.innerHTML = '';
  TDQ_CATS.forEach(t => {
    const d = document.createElement('div');
    d.className = 't-card';
    d.innerHTML = '<div class="t-icon">' + t.icon + '</div><div class="t-info"><div class="t-name">' + escHtml(t.label) + '</div><div class="t-tag">' + escHtml(t.tag) + '</div></div>';
    d.onclick = () => {
      document.querySelectorAll('#tdq-cat-grid .t-card').forEach(c => c.classList.remove('sel'));
      d.classList.add('sel');
      state.selTdqCat = t.id;
      if (btn) btn.classList.add('ok');
    };
    grid.appendChild(d);
  });
  if (btn) btn.classList.remove('ok');
}

export async function pickTDQCat() {
  if (!state.selTdqCat) return;
  const lt = document.getElementById('load-title');
  if (lt) lt.textContent = 'Génération du mot du jour…';
  show('screen-load');
  try {
    const chooser = state.currentUser?.username || 'Anonyme';
    const chooserId = state.currentUser?.id || null;
    const res = await fetch(EDGE_TDQ, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SB_ANON, 'apikey': SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: state.selTdqCat, chooser, chooserId })
    });
    if (!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    if (!data?.word) throw new Error('no word');
    _tdqState = data;
    renderTDQ(true);
    if (state.currentUser) await awardXP(state.currentUser.id, 'tdq', 55);
  } catch (e) {
    console.error('pickTDQCat:', e);
    showToast('⚠ Génération échouée. Réessaie !');
    buildTDQPick();
    show('screen-tdq-pick');
  }
}

function renderTDQ(typewrite) {
  if (!_tdqState) return;
  _tdqRevealed = false;

  const cat = TDQ_CATS.find(c => c.id === _tdqState.category) || TDQ_CATS[0];

  const tagEl = document.getElementById('tdq-cat-tag');
  if (tagEl) tagEl.textContent = cat.icon + ' ' + cat.label;

  const wordEl = document.getElementById('tdq-word');
  if (wordEl) {
    if (typewrite) {
      wordEl.innerHTML = '';
      let i = 0; const txt = _tdqState.word || '';
      const cur = document.createElement('span'); cur.className = 'cursor'; wordEl.appendChild(cur);
      const iv = setInterval(() => {
        if (i >= txt.length) { clearInterval(iv); cur.remove(); return; }
        cur.insertAdjacentText('beforebegin', txt[i++]);
      }, 40);
    } else { wordEl.textContent = _tdqState.word || ''; }
  }

  // Hook false meaning (the "fake" usage)
  const fakeEl = document.getElementById('tdq-fake-meaning');
  if (fakeEl) fakeEl.textContent = _tdqState.fake_meaning || '';

  // Real meaning — hidden until reveal
  const realWrap = document.getElementById('tdq-real-wrap');
  if (realWrap) realWrap.style.display = 'none';

  const revealBtn = document.getElementById('btn-tdq-reveal');
  if (revealBtn) revealBtn.style.display = 'block';

  const chooserEl = document.getElementById('tdq-chooser');
  if (chooserEl) chooserEl.textContent = _tdqState.chooser || state.currentUser?.username || 'Anonyme';

  show('screen-tdq');
}

export function revealTDQ() {
  if (_tdqRevealed || !_tdqState) return;
  _tdqRevealed = true;

  const realWrap = document.getElementById('tdq-real-wrap');
  if (realWrap) realWrap.style.display = 'block';

  const realEl = document.getElementById('tdq-real-meaning');
  if (realEl) realEl.textContent = _tdqState.real_meaning || '';

  const exEl = document.getElementById('tdq-example');
  if (exEl) exEl.textContent = _tdqState.example ? '« ' + _tdqState.example + ' »' : '';

  const originEl = document.getElementById('tdq-origin');
  if (originEl) originEl.textContent = _tdqState.origin || '';

  const revealBtn = document.getElementById('btn-tdq-reveal');
  if (revealBtn) revealBtn.style.display = 'none';
}
