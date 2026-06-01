import { state, sb, show, escHtml, showToast, setRoute } from '../shared.js';

let _archiveTab = 'anecdotes';
let _archiveCache = {};

const ARCHIVE_TABS = [
  { id: 'anecdotes',  label: 'Anecdotes',   icon: '💡' },
  { id: 'mdm',        label: 'Mais Dis Moi',icon: '🤔' },
  { id: 'ephemeride', label: 'Éphéméride',  icon: '📅' },
  { id: 'enigme',     label: 'Crack le Code',icon: '🔮' },
  { id: 'tdq',        label: "T'as Dit Quoi",icon: '💬' },
];

export async function goArchives() {
  setRoute('archives');
  state.prevScreen = document.querySelector('.screen.on')?.id || 'screen-anec';
  buildArchivesTabs();
  show('screen-archives');
  loadArchiveTab(_archiveTab);
}

function buildArchivesTabs() {
  const tabBar = document.getElementById('archives-tabbar');
  if (!tabBar) return;
  tabBar.innerHTML = '';
  ARCHIVE_TABS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'arch-tab' + (_archiveTab === t.id ? ' active' : '');
    btn.textContent = t.icon + ' ' + t.label;
    btn.onclick = () => {
      _archiveTab = t.id;
      document.querySelectorAll('.arch-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadArchiveTab(t.id);
    };
    tabBar.appendChild(btn);
  });
}

async function loadArchiveTab(tabId) {
  const content = document.getElementById('archives-content');
  if (!content) return;

  if (_archiveCache[tabId]) { renderArchiveItems(tabId, _archiveCache[tabId]); return; }

  content.innerHTML = '<div class="arch-loading">Chargement…</div>';

  try {
    let items = [];
    switch (tabId) {
      case 'anecdotes': {
        const { data } = await sb.from('anecdotes').select('id, title, anecdote, theme, icon, created_at').order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(a => ({ id: a.id, title: a.title || a.anecdote?.slice(0, 60) + '…', subtitle: a.theme, icon: a.icon || '💡', date: a.created_at, type: 'anecdotes' }));
        break;
      }
      case 'mdm': {
        const { data } = await sb.from('mais_dis_moi').select('id, title, category, created_at').order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(m => ({ id: m.id, title: m.title, subtitle: m.category, icon: '🤔', date: m.created_at, type: 'mdm' }));
        break;
      }
      case 'ephemeride': {
        const { data } = await sb.from('ephemerides').select('id, date, events').order('date', { ascending: false }).limit(50);
        items = (data || []).map(e => {
          const evts = Array.isArray(e.events) ? e.events : JSON.parse(e.events || '[]');
          return { id: e.id, title: 'Éphéméride du ' + new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }), subtitle: evts.length + ' événements', icon: '📅', date: e.date, type: 'ephemeride' };
        });
        break;
      }
      case 'enigme': {
        const { data } = await sb.from('enigmes').select('id, question, category, created_at').order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(e => ({ id: e.id, title: e.question?.slice(0, 70) + '…', subtitle: e.category, icon: '🔮', date: e.created_at, type: 'enigme' }));
        break;
      }
      case 'tdq': {
        const { data } = await sb.from('tas_dit_quoi').select('id, word, category, created_at').order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(t => ({ id: t.id, title: t.word, subtitle: t.category, icon: '💬', date: t.created_at, type: 'tdq' }));
        break;
      }
    }
    _archiveCache[tabId] = items;
    renderArchiveItems(tabId, items);
  } catch (e) {
    console.error('loadArchiveTab:', e);
    content.innerHTML = '<div class="arch-loading" style="color:var(--re)">Erreur de chargement.</div>';
  }
}

function renderArchiveItems(tabId, items) {
  const content = document.getElementById('archives-content');
  if (!content) return;
  if (!items.length) {
    content.innerHTML = '<div class="arch-empty"><span>📭</span><p>Aucun contenu archivé pour l\'instant.</p></div>';
    return;
  }
  content.innerHTML = items.map(item =>
    '<div class="arch-item" onclick="openArchiveItem(\'' + escHtml(item.type) + '\',\'' + escHtml(item.id) + '\')">' +
      '<div class="arch-item-icon">' + item.icon + '</div>' +
      '<div class="arch-item-body">' +
        '<div class="arch-item-title">' + escHtml(item.title || '') + '</div>' +
        (item.subtitle ? '<div class="arch-item-sub">' + escHtml(item.subtitle) + '</div>' : '') +
      '</div>' +
      '<div class="arch-item-date">' + (item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '') + '</div>' +
    '</div>'
  ).join('');
}

export function openArchiveItem(type, id) {
  // For now: navigate to the relevant screen if it's today's content
  // Future: deep-link to specific historic content
  switch (type) {
    case 'anecdotes': show('screen-anec'); break;
    case 'mdm':       show('screen-mdm'); break;
    case 'ephemeride':show('screen-eph'); break;
    case 'enigme':    show('screen-enigme'); break;
    case 'tdq':       show('screen-tdq'); break;
  }
}

export function clearArchiveCache() { _archiveCache = {}; }
