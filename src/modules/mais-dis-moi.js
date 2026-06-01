import { state, sb, show, escHtml, showToast, setBtn, setRoute, today } from '../shared.js';
import { awardXP } from './xp.js';

const SB_URL = 'https://zryrfmothjhywkklmniw.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeXJmbW90aGpoeXdra2xtbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTYzNjEsImV4cCI6MjA5NDkzMjM2MX0.BWsZ5nXj8ePlB577zozrSO3voroRp8wkqGvM9MExaDg';
const EDGE_MDM = SB_URL + '/functions/v1/mais-dis-moi';

const MDM_CATS = [
  { id: 'science',    label: 'Science',         icon: '🔬', tag: 'Phénomènes & découvertes' },
  { id: 'histoire',   label: 'Histoire',         icon: '🏛️', tag: 'Faits & personnages' },
  { id: 'corps',      label: 'Corps humain',     icon: '🧬', tag: 'Biologie & santé' },
  { id: 'espace',     label: 'Espace',           icon: '🚀', tag: 'Cosmos & astronomie' },
  { id: 'nature',     label: 'Nature',           icon: '🌿', tag: 'Animaux & plantes' },
  { id: 'technologie',label: 'Technologie',      icon: '💻', tag: 'Inventions & numérique' },
  { id: 'psychologie',label: 'Psychologie',      icon: '🧠', tag: 'Comportements & biais' },
  { id: 'economie',   label: 'Économie',         icon: '📈', tag: 'Marchés & argent' },
  { id: 'art',        label: 'Art & Culture',    icon: '🎨', tag: 'Créations & artistes' },
  { id: 'surprise',   label: 'Surprise',         icon: '🎲', tag: "L'inattendu" },
];

let _mdmState = null; // { content, category }

export async function goMaisDisMoi() {
  setRoute('mais-dis-moi');
  state.prevScreen = document.querySelector('.screen.on')?.id || 'screen-anec';
  show('screen-load');
  const lt = document.getElementById('load-title');
  if (lt) lt.textContent = 'Chargement…';

  try {
    // Check if today's MDM already generated
    const res = await fetch(EDGE_MDM, {
      headers: { 'Authorization': 'Bearer ' + SB_ANON, 'apikey': SB_ANON }
    });
    const data = await res.json();
    if (data?.content) {
      _mdmState = data;
      renderMDM(false);
    } else {
      buildMDMPick();
      show('screen-mdm-pick');
    }
  } catch (e) {
    console.error('goMaisDisMoi:', e);
    buildMDMPick();
    show('screen-mdm-pick');
  }
}

export function buildMDMPick() {
  _mdmState = null;
  state.selMdmCat = null;
  const grid = document.getElementById('mdm-cat-grid');
  const btn = document.getElementById('btn-gen-mdm');
  if (!grid) return;
  grid.innerHTML = '';
  MDM_CATS.forEach(t => {
    const d = document.createElement('div');
    d.className = 't-card';
    d.innerHTML = '<div class="t-icon">' + t.icon + '</div><div class="t-info"><div class="t-name">' + escHtml(t.label) + '</div><div class="t-tag">' + escHtml(t.tag) + '</div></div>';
    d.onclick = () => {
      document.querySelectorAll('#mdm-cat-grid .t-card').forEach(c => c.classList.remove('sel'));
      d.classList.add('sel');
      state.selMdmCat = t.id;
      if (btn) btn.classList.add('ok');
    };
    grid.appendChild(d);
  });
  if (btn) btn.classList.remove('ok');
}

export async function pickMDMCat() {
  if (!state.selMdmCat) return;
  const lt = document.getElementById('load-title');
  if (lt) lt.textContent = 'Génération en cours…';
  show('screen-load');
  try {
    const chooser = state.currentUser?.username || 'Anonyme';
    const chooserId = state.currentUser?.id || null;
    const res = await fetch(EDGE_MDM, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SB_ANON, 'apikey': SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: state.selMdmCat, chooser, chooserId })
    });
    if (!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    if (!data?.content) throw new Error('no content');
    _mdmState = data;
    renderMDM(true);
    if (state.currentUser) await awardXP(state.currentUser.id, 'mdm', 60);
  } catch (e) {
    console.error('pickMDMCat:', e);
    showToast('⚠ Génération échouée. Réessaie !');
    buildMDMPick();
    show('screen-mdm-pick');
  }
}

function renderMDM(typewrite) {
  if (!_mdmState) return;
  const cat = MDM_CATS.find(c => c.id === _mdmState.category) || MDM_CATS[0];

  const tagEl = document.getElementById('mdm-cat-tag');
  if (tagEl) tagEl.textContent = cat.icon + ' ' + cat.label;

  const titleEl = document.getElementById('mdm-title');
  if (titleEl) {
    if (typewrite) {
      titleEl.innerHTML = '';
      let i = 0; const txt = _mdmState.title || '';
      const cur = document.createElement('span'); cur.className = 'cursor'; titleEl.appendChild(cur);
      const iv = setInterval(() => {
        if (i >= txt.length) { clearInterval(iv); cur.remove(); return; }
        cur.insertAdjacentText('beforebegin', txt[i++]);
      }, 22);
    } else { titleEl.textContent = _mdmState.title || ''; }
  }

  const bodyEl = document.getElementById('mdm-body');
  if (bodyEl) bodyEl.textContent = _mdmState.content || '';

  const analogieEl = document.getElementById('mdm-analogie');
  if (analogieEl) {
    if (_mdmState.analogie) {
      analogieEl.style.display = 'block';
      document.getElementById('mdm-analogie-txt').textContent = _mdmState.analogie;
    } else {
      analogieEl.style.display = 'none';
    }
  }

  const funEl = document.getElementById('mdm-fun');
  if (funEl) {
    if (_mdmState.fun_fact) {
      funEl.style.display = 'block';
      document.getElementById('mdm-fun-txt').textContent = _mdmState.fun_fact;
    } else {
      funEl.style.display = 'none';
    }
  }

  const chooserEl = document.getElementById('mdm-chooser');
  if (chooserEl) chooserEl.textContent = _mdmState.chooser || state.currentUser?.username || 'Anonyme';

  show('screen-mdm');
}
