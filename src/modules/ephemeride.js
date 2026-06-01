import { state, sb, show, escHtml, showToast, setRoute, today } from '../shared.js';
import { awardXP } from './xp.js';

const SB_URL = 'https://zryrfmothjhywkklmniw.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeXJmbW90aGpoeXdra2xtbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTYzNjEsImV4cCI6MjA5NDkzMjM2MX0.BWsZ5nXj8ePlB577zozrSO3voroRp8wkqGvM9MExaDg';
const EDGE_EPH = SB_URL + '/functions/v1/ephemeride';

let _ephState = null; // { events: [{year, title, desc}], date }

export async function goEphemeride() {
  setRoute('ephemeride');
  state.prevScreen = document.querySelector('.screen.on')?.id || 'screen-anec';
  show('screen-load');
  const lt = document.getElementById('load-title');
  if (lt) lt.textContent = 'Chargement de l\'éphéméride…';

  try {
    const res = await fetch(EDGE_EPH + '?date=' + today() + '&_t=' + Date.now(), {
      headers: { 'Authorization': 'Bearer ' + SB_ANON, 'apikey': SB_ANON }
    });
    const data = await res.json();
    if (data?.events?.length) {
      _ephState = data;
      renderEphemeride();
      if (state.currentUser) await awardXP(state.currentUser.id, 'ephemeride', 50);
    } else {
      throw new Error('no events');
    }
  } catch (e) {
    console.error('goEphemeride:', e);
    showToast('⚠ Impossible de charger l\'éphéméride. Réessaie !');
    show(state.prevScreen || 'screen-anec');
  }
}

function renderEphemeride() {
  if (!_ephState) return;

  // Date header
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const dateEl = document.getElementById('eph-date');
  if (dateEl) dateEl.textContent = dateStr;

  // Events
  const list = document.getElementById('eph-events');
  if (!list) return;
  list.innerHTML = '';
  (_ephState.events || []).forEach((ev, i) => {
    const item = document.createElement('div');
    item.className = 'eph-event';
    item.style.animationDelay = (i * 0.12) + 's';
    item.innerHTML =
      '<div class="eph-year">' + escHtml(String(ev.year)) + '</div>' +
      '<div class="eph-event-body">' +
        '<div class="eph-event-title">' + escHtml(ev.title) + '</div>' +
        '<div class="eph-event-desc">' + escHtml(ev.desc || '') + '</div>' +
      '</div>';
    list.appendChild(item);
  });

  show('screen-eph');
}

export function goEphBack() {
  show(state.prevScreen || 'screen-anec');
}
