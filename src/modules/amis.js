import { state, sb, show, escHtml, showToast, setRoute } from '../shared.js';
import { RANKS } from '../shared.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function rankFor(xp) {
  const rank = [...RANKS].reverse().find(r => xp >= r.minXP);
  return rank || RANKS[0];
}

function fmtAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 3600000) return Math.floor(diff / 60000) + 'min';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return Math.floor(diff / 86400000) + 'j';
}

// ── State ────────────────────────────────────────────────────────────────────
let _friendsLoaded = false;
let _myFriends = [];
let _pendingIn = [];
let _pendingOut = [];
let _feedEvents = [];
let _activeTab = 'feed'; // feed | amis | defis

// ── Entry point ──────────────────────────────────────────────────────────────
export async function goAmis() {
  setRoute('amis');
  state.prevScreen = document.querySelector('.screen.on')?.id || 'screen-anec';
  show('screen-amis');
  renderAmisShell();
  switchAmisTab(_activeTab);
}

function renderAmisShell() {
  const wrap = document.getElementById('amis-wrap');
  if (!wrap) return;
  wrap.innerHTML =
    '<div class="screen-header"><div class="screen-subtitle">👥 SOCIAL</div><div class="screen-title">Activité & amis</div></div>' +
    '<div class="amis-tabs" id="amis-tabs">' +
      ['feed','amis','defis'].map(t =>
        '<button class="amis-tab' + (_activeTab === t ? ' active' : '') + '" onclick="switchAmisTab(\'' + t + '\')">' +
        ({ feed: '📡 Feed', amis: '👥 Amis', defis: '⚔️ Défis' }[t]) + '</button>'
      ).join('') +
    '</div>' +
    '<div id="amis-content"></div>';
}

export function switchAmisTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.amis-tab').forEach(b => b.classList.toggle('active', b.textContent.includes({ feed: 'Feed', amis: 'Amis', defis: 'Défis' }[tab])));
  const c = document.getElementById('amis-content');
  if (!c) return;
  if (tab === 'feed') loadFeedTab(c);
  else if (tab === 'amis') loadAmisTab(c);
  else if (tab === 'defis') loadDefisTab(c);
}

// ── FEED ─────────────────────────────────────────────────────────────────────
async function loadFeedTab(c) {
  c.innerHTML = '<div class="arch-loading">Chargement…</div>';
  try {
    const [{ data: reads }, { data: quiz }] = await Promise.all([
      sb.from('reads').select('user_id, created_at, anecdotes(theme, icon)').order('created_at', { ascending: false }).limit(20),
      sb.from('quiz_history').select('user_id, pct, created_at').order('created_at', { ascending: false }).limit(10),
    ]);
    const uids = [...new Set([...(reads||[]).map(r=>r.user_id), ...(quiz||[]).map(q=>q.user_id)])].filter(Boolean);
    let profiles = {};
    if (uids.length) {
      const { data: ps } = await sb.from('profiles').select('id, username, xp').in('id', uids);
      (ps||[]).forEach(p => profiles[p.id] = p);
    }
    const events = [
      ...(reads||[]).map(r => ({ type:'read', userId:r.user_id, name:profiles[r.user_id]?.username||'Anonyme', time:fmtAgo(r.created_at), theme:r.anecdotes?.theme, icon:r.anecdotes?.icon||'💡', color:'#00c8ff' })),
      ...(quiz||[]).map(q => ({ type:'quiz', userId:q.user_id, name:profiles[q.user_id]?.username||'Anonyme', time:fmtAgo(q.created_at), pct:q.pct, color:'#34d399' })),
    ].slice(0, 25);
    _feedEvents = events;
    if (!events.length) { c.innerHTML = '<div class="arch-empty"><span>📭</span><p>Aucune activité récente.</p></div>'; return; }
    c.innerHTML = events.map(ev =>
      '<div class="feed-item">' +
        '<div class="feed-ico" style="color:' + ev.color + '">' + (ev.type === 'read' ? ev.icon : '🧠') + '</div>' +
        '<div class="feed-body">' +
          '<span class="feed-name">' + escHtml(ev.name) + '</span>' +
          (ev.type === 'read' ? ' a lu une anecdote <em>' + escHtml(ev.theme||'') + '</em>' : ' a fait un quiz (' + (ev.pct||0) + '%)') +
        '</div>' +
        '<div class="feed-time">' + ev.time + '</div>' +
      '</div>'
    ).join('');
  } catch (e) {
    c.innerHTML = '<div class="arch-loading" style="color:var(--re)">Erreur de chargement.</div>';
  }
}

// ── AMIS ─────────────────────────────────────────────────────────────────────
async function loadAmisTab(c) {
  if (!state.currentUser) {
    c.innerHTML = '<div class="arch-empty"><span>🔒</span><p>Connecte-toi pour gérer tes amis.</p></div>';
    return;
  }
  c.innerHTML = '<div class="arch-loading">Chargement…</div>';
  await refreshFriends();
  renderAmisTab(c);
}

async function refreshFriends() {
  try {
    const { data } = await sb.from('friendships')
      .select('id, requester_id, receiver_id, status, req:profiles!friendships_requester_id_fkey(username,xp), rec:profiles!friendships_receiver_id_fkey(username,xp)')
      .or('requester_id.eq.' + state.currentUser.id + ',receiver_id.eq.' + state.currentUser.id);
    _myFriends = []; _pendingIn = []; _pendingOut = [];
    (data||[]).forEach(r => {
      const isMe = r.requester_id === state.currentUser.id;
      const other = isMe ? r.rec : r.req;
      const otherId = isMe ? r.receiver_id : r.requester_id;
      const item = { id: r.id, userId: otherId, username: other?.username || '?', xp: other?.xp || 0 };
      if (r.status === 'accepted') _myFriends.push(item);
      else if (r.status === 'pending' && isMe) _pendingOut.push(item);
      else if (r.status === 'pending' && !isMe) _pendingIn.push(item);
    });
    _friendsLoaded = true;
  } catch (e) { console.warn('refreshFriends:', e); }
}

function renderAmisTab(c) {
  let html = '';

  // Pending in
  if (_pendingIn.length) {
    html += '<div class="amis-section-lbl" style="color:#f59e0b">🔔 Demandes reçues</div>';
    _pendingIn.forEach(r => {
      const rk = rankFor(r.xp);
      html += '<div class="friend-card">' +
        '<div class="friend-rank" style="color:' + rk.color + ';border-color:' + rk.color + '">' + rk.label + '</div>' +
        '<div class="friend-info"><div class="friend-name">' + escHtml(r.username) + '</div><div class="friend-xp">' + r.xp.toLocaleString('fr-FR') + ' XP</div></div>' +
        '<button class="friend-btn accept" onclick="respondFriendRequest(\'' + r.id + '\',true)">✓</button>' +
        '<button class="friend-btn decline" onclick="respondFriendRequest(\'' + r.id + '\',false)">✕</button>' +
      '</div>';
    });
  }

  // Search
  html += '<div class="amis-section-lbl">Ajouter un ami</div>' +
    '<div class="friend-search-wrap">' +
      '<input id="friend-search-inp" class="friend-search-inp" placeholder="Chercher par pseudo…" oninput="searchFriendsByPseudo(this.value)" />' +
    '</div>' +
    '<div id="friend-search-results"></div>';

  // Friends list
  html += '<div class="amis-section-lbl">Mes amis ' + (_myFriends.length ? '(' + _myFriends.length + ')' : '') + '</div>';
  if (!_myFriends.length) {
    html += '<div class="arch-empty" style="margin-top:.5rem"><span>🔍</span><p>Pas encore d\'amis.<br/>Cherche un pseudo ci-dessus !</p></div>';
  } else {
    _myFriends.forEach(f => {
      const rk = rankFor(f.xp);
      html += '<div class="friend-card">' +
        '<div class="friend-rank" style="color:' + rk.color + ';border-color:' + rk.color + '">' + rk.label + '</div>' +
        '<div class="friend-info"><div class="friend-name">' + escHtml(f.username) + '</div><div class="friend-xp">' + f.xp.toLocaleString('fr-FR') + ' XP</div></div>' +
        '<button class="friend-btn defi" onclick="sendDefiToFriend(\'' + escHtml(f.userId) + '\')">⚔️ Défi</button>' +
      '</div>';
    });
  }

  c.innerHTML = html;
}

export async function searchFriendsByPseudo(q) {
  const res = document.getElementById('friend-search-results');
  if (!res) return;
  if (!q || q.length < 2) { res.innerHTML = ''; return; }
  res.innerHTML = '<div class="arch-loading">…</div>';
  try {
    const { data } = await sb.from('profiles').select('id, username, xp').ilike('username', '%' + q + '%').neq('id', state.currentUser?.id || '').limit(8);
    if (!data?.length) { res.innerHTML = '<div class="arch-loading">Aucun résultat.</div>'; return; }
    res.innerHTML = data.map(p => {
      const rk = rankFor(p.xp || 0);
      const alreadyFriend = _myFriends.some(f => f.userId === p.id);
      const alreadySent = _pendingOut.some(f => f.userId === p.id);
      return '<div class="friend-card">' +
        '<div class="friend-rank" style="color:' + rk.color + ';border-color:' + rk.color + '">' + rk.label + '</div>' +
        '<div class="friend-info"><div class="friend-name">' + escHtml(p.username) + '</div><div class="friend-xp">' + (p.xp||0).toLocaleString('fr-FR') + ' XP</div></div>' +
        (alreadyFriend ? '<span class="friend-status ok">✓ Ami</span>'
        : alreadySent ? '<span class="friend-status sent">Envoyée</span>'
        : '<button class="friend-btn add" onclick="sendFriendRequest(\'' + p.id + '\')">+ Ajouter</button>') +
      '</div>';
    }).join('');
  } catch (e) { res.innerHTML = ''; }
}

export async function sendFriendRequest(toUserId) {
  if (!state.currentUser) { showToast('Connecte-toi pour ajouter des amis !'); return; }
  try {
    await sb.from('friendships').insert({ requester_id: state.currentUser.id, receiver_id: toUserId, status: 'pending' });
    showToast('✓ Demande envoyée !');
    await refreshFriends();
    const c = document.getElementById('amis-content');
    if (c) renderAmisTab(c);
  } catch (e) { showToast('⚠ ' + (e.message || 'Erreur')); }
}

export async function respondFriendRequest(friendshipId, accept) {
  try {
    if (accept) await sb.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    else await sb.from('friendships').delete().eq('id', friendshipId);
    showToast(accept ? '✓ Ami ajouté !' : 'Demande refusée.');
    await refreshFriends();
    const c = document.getElementById('amis-content');
    if (c) renderAmisTab(c);
  } catch (e) { showToast('⚠ ' + (e.message || 'Erreur')); }
}

export function sendDefiToFriend(userId) {
  showToast('⚔️ Défi envoyé ! (bientôt disponible)');
}

// ── DÉFIS ────────────────────────────────────────────────────────────────────
function loadDefisTab(c) {
  c.innerHTML =
    '<div class="arch-empty">' +
      '<span>⚔️</span>' +
      '<p>Les défis entre amis arrivent bientôt !</p>' +
      '<button class="sl-btn-primary" style="margin-top:1rem" onclick="goAmis()">Ajouter des amis</button>' +
    '</div>';
}

// ── Check friend requests (called at startup) ────────────────────────────────
export async function checkFriendRequests() {
  if (!state.currentUser) return;
  try {
    const { data, count } = await sb.from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', state.currentUser.id)
      .eq('status', 'pending');
    if (count > 0) {
      const badge = document.getElementById('friend-req-badge');
      if (badge) { badge.textContent = count; badge.style.display = 'flex'; }
    }
  } catch (e) {}
}
