import { state, sb, show, escHtml, fmt, fmtShort, showToast, setBtn, today, RANKS } from '../shared.js';
import { calcXP, calcLevel, calcSLXP, getRank, getNextRank, awardXP, checkAndAwardBadges } from './xp.js';
import { _sendNotif } from './notifs.js';

const PROF_COLORS=['#22d3ee','#a855f7','#f97316','#34d399','#f472b6','#fbbf24'];
const LEVELS=[
  {name:'Novice',min:0},{name:'Curieux',min:100},{name:'Explorateur',min:300},
  {name:'Lettré',min:600},{name:'Expert',min:1000},{name:'Sage',min:2000}
];
const BADGES_DEF=[
  // ── Lecture ──────────────────────────────────────────────────────────────
  {id:'first',   icon:'🌱',name:'Première graine', desc:'Première anecdote lue',         rarity:'common',   check:d=>d.reads>=1},
  {id:'read10',  icon:'📚',name:'Lecteur assidu',  desc:'10 anecdotes lues',             rarity:'common',   check:d=>d.reads>=10},
  {id:'read50',  icon:'🏛️',name:'Érudit',          desc:'50 anecdotes lues',             rarity:'rare',     check:d=>d.reads>=50},
  {id:'read100', icon:'🌍',name:'Encyclopédiste',  desc:'100 anecdotes lues',            rarity:'epic',     check:d=>d.reads>=100},
  {id:'read365', icon:'📜',name:'Archiviste',      desc:'365 anecdotes lues',            rarity:'legendary',check:d=>d.reads>=365},
  // ── Streak ───────────────────────────────────────────────────────────────
  {id:'fire3',   icon:'🔥',name:'En feu',          desc:'3 jours de suite',              rarity:'common',   check:d=>d.streak>=3},
  {id:'week',    icon:'⚡',name:'Habitué',          desc:'7 jours de suite',              rarity:'common',   check:d=>d.streak>=7},
  {id:'fort',    icon:'💪',name:'Accro',           desc:'14 jours de suite',             rarity:'rare',     check:d=>d.streak>=14},
  {id:'moon',    icon:'🌙',name:'Mois lunaire',    desc:'30 jours de suite',             rarity:'rare',     check:d=>d.streak>=30},
  {id:'shield',  icon:'🛡️',name:'Invincible',      desc:'60 jours de suite',             rarity:'epic',     check:d=>d.streak>=60},
  {id:'cent',    icon:'💯',name:'Centurion',       desc:'100 jours de suite',            rarity:'epic',     check:d=>d.streak>=100},
  {id:'legend',  icon:'👑',name:'Légende absolue', desc:'365 jours de suite',            rarity:'legendary',check:d=>d.streak>=365},
  // ── Quiz ─────────────────────────────────────────────────────────────────
  {id:'quiz1',   icon:'🎯',name:'Premier quiz',    desc:'Premier quiz complété',         rarity:'common',   check:d=>d.quizzes>=1},
  {id:'quiz10',  icon:'🏆',name:'Quizzeur',        desc:'10 quiz complétés',             rarity:'common',   check:d=>d.quizzes>=10},
  {id:'quiz100', icon:'🎓',name:'Maître du quiz',  desc:'100 quiz complétés',            rarity:'epic',     check:d=>d.quizzes>=100},
  {id:'ace',     icon:'⭐',name:'Sans faute',      desc:'Quiz 100% parfait',             rarity:'common',   check:d=>d.bestQuiz>=100},
  {id:'ace5',    icon:'🌟',name:'Perfectionniste', desc:'5 quiz parfaits',               rarity:'rare',     check:d=>d.perfectQuiz>=5},
  {id:'brain',   icon:'🧠',name:'Expert',          desc:'Moyenne > 80%',                 rarity:'rare',     check:d=>d.avgQuiz>80},
  // ── Thèmes ───────────────────────────────────────────────────────────────
  {id:'map4',    icon:'🗺️',name:'Explorateur',     desc:'4 thèmes découverts',           rarity:'common',   check:d=>d.themes>=4},
  {id:'atlas',   icon:'🌐',name:'Grand voyageur',  desc:'Tous les 8 thèmes explorés',    rarity:'epic',     check:d=>d.themes>=8},
  {id:'hist5',   icon:'🏛️',name:'Historien',       desc:'5 anecdotes Histoire',          rarity:'common',   check:d=>(d.themeMap?.histoire||0)>=5},
  {id:'sci5',    icon:'🔬',name:'Scientifique',    desc:'5 anecdotes Science',           rarity:'common',   check:d=>(d.themeMap?.science||0)>=5},
  {id:'nat5',    icon:'🌿',name:'Naturaliste',     desc:'5 anecdotes Nature',            rarity:'common',   check:d=>(d.themeMap?.nature||0)>=5},
  {id:'ins5',    icon:'🤯',name:'Bizarre Bizarre', desc:'5 anecdotes Insolite',          rarity:'common',   check:d=>(d.themeMap?.insolite||0)>=5},
  {id:'spc5',    icon:'🚀',name:'Astronaute',      desc:'5 anecdotes Espace',            rarity:'common',   check:d=>(d.themeMap?.espace||0)>=5},
  // ── Social ───────────────────────────────────────────────────────────────
  {id:'social',  icon:'👥',name:'Social',          desc:'Premier ami ajouté',            rarity:'common',   check:d=>d.friends>=1},
  {id:'duel1',   icon:'⚔️',name:'Challenger',      desc:'Premier duel joué',             rarity:'common',   check:d=>d.duelsPlayed>=1},
  {id:'duelw1',  icon:'🥇',name:'Vainqueur',       desc:'Premier duel gagné',            rarity:'common',   check:d=>d.duelsWon>=1},
  {id:'duelw5',  icon:'🛡️',name:'Gladiateur',      desc:'5 duels gagnés',                rarity:'rare',     check:d=>d.duelsWon>=5},
  {id:'share1',  icon:'📣',name:'Ambassadeur',     desc:'Première anecdote partagée',    rarity:'common',   check:d=>d.shares>=1},
  {id:'fav10',   icon:'❤️',name:'Collectionneur',  desc:'10 anecdotes en favoris',       rarity:'common',   check:d=>d.favs>=10},

  // ── Énigmes ──────────────────────────────────────────────────────────────
  {id:'enigme_first',    icon:'🔮',name:'Premier défi',      desc:'Première énigme résolue',        rarity:'common',   check:d=>(d.enigmaTotal||0)>=1},
  {id:'enigme_correct5', icon:'🧩',name:'Résolveur',         desc:'5 bonnes réponses',              rarity:'common',   check:d=>(d.enigmaCorrect||0)>=5},
  {id:'enigme_correct20',icon:'🏆',name:'Maître des énigmes',desc:'20 bonnes réponses',             rarity:'rare',     check:d=>(d.enigmaCorrect||0)>=20},
  {id:'enigme_correct50',icon:'🌟',name:'Grand Sphinx',      desc:'50 bonnes réponses',             rarity:'epic',     check:d=>(d.enigmaCorrect||0)>=50},
  {id:'enigme_all_cats', icon:'🎯',name:'Polyglotte',        desc:'Toutes les catégories explorées', rarity:'epic',     check:d=>(d.enigmaCats||0)>=9},
  {id:'enigme_chooser',  icon:'👁️',name:'Éclaireur',         desc:'A choisi la catégorie du jour',  rarity:'common',   check:d=>d.enigmaChooser},
  {id:'enigme_logique',  icon:'🧠',name:'Logicien',          desc:'5 énigmes Logique résolues',     rarity:'common',   check:d=>(d.enigmaLogique||0)>=5},
  {id:'enigme_historique',icon:'🏛️',name:'Chroniqueur',     desc:'5 énigmes Historique résolues',  rarity:'common',   check:d=>(d.enigmaHistorique||0)>=5},
  {id:'enigme_maths',    icon:'🔢',name:'Calculateur',       desc:'5 Maths récréatives résolues',   rarity:'common',   check:d=>(d.enigmaMaths||0)>=5},

  // ── Spécial ──────────────────────────────────────────────────────────────
  {id:'early',   icon:'🌅',name:'Lève-tôt',        desc:'Ouvert avant 7h du matin',      rarity:'rare',     check:d=>d.earlyBird},
  {id:'owl',     icon:'🦉',name:'Noctambule',       desc:'Ouvert après 23h',              rarity:'rare',     check:d=>d.nightOwl},
];
const SB_STORAGE='https://zryrfmothjhywkklmniw.supabase.co/storage/v1';

export async function goProfile(){
  if(!state.currentUser)return;updateNav('bn-profil');
  state.prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';

  // Appliquer couleur sauvegardée
  const savedColor=localStorage.getItem('adj_prof_color')||PROF_COLORS[0];
  applyProfileColor(savedColor,false);

  const profAv=document.getElementById('prof-av');if(profAv)profAv.textContent=state.currentUser.username[0].toUpperCase();
  const profName=document.getElementById('prof-name');if(profName)profName.textContent=state.currentUser.username;
  const profSince=document.getElementById('prof-since');if(profSince)profSince.textContent='Membre depuis le '+fmt(state.currentUser.joined||today());
  // Avatar photo
  renderProfileAvatar(state.currentUser.avatar_url||null);
  // Bio
  const bioEl=document.getElementById('prof-bio-text');
  if(bioEl)bioEl.textContent=state.currentUser.bio||'Ajoute une bio…';

  // Enigma stats
  const enigmaDate=new Date().toISOString().slice(0,10);
  const[{data:reads},{data:qhist},{data:allAnec},{data:friendsData},{data:enigmaStats},{data:enigmaChoice}]=await Promise.all([
    sb.from('reads').select('*').eq('user_id',state.currentUser.id).order('date',{ascending:false}),
    sb.from('quiz_history').select('*').eq('user_id',state.currentUser.id).order('date',{ascending:false}),
    sb.from('anecdotes').select('*').lte('date',today()).order('date',{ascending:false}).limit(90),
    sb.from('friendships').select('id').or('requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+state.currentUser.id).eq('status','accepted'),
    sb.from('enigma_responses').select('*').eq('user_id',state.currentUser.id),
    sb.from('daily_enigma_choice').select('chooser_id').eq('date',enigmaDate).eq('chooser_id',state.currentUser.id).maybeSingle()
  ]);
  const r=reads||[],q=qhist||[],a=allAnec||[];
  const streak=computeStreak(r.map(x=>x.date));
  const avg=q.length?Math.round(q.reduce((acc,b)=>acc+b.pct,0)/q.length):0;
  const bestQuiz=q.length?Math.max(...q.map(x=>x.pct)):0;

  // XP & niveau
  const xp=calcXP(r.length,q.length,streak);
  state.currentUserXP=calcSLXP({reads:r.length,quizzes:q,enigmas:enigmaStats||[],streak});
if(state.currentUser?.xp&&state.currentUser.xp>state.currentUserXP)state.currentUserXP=state.currentUser.xp;
  state.currentUserRank=getRank(state.currentUserXP);
  const nextSlRank=getNextRank(state.currentUserXP);
  const chip=document.getElementById('prof-level-chip');
  if(chip){chip.textContent=state.currentUserRank.label+' · '+state.currentUserRank.title;chip.style.color=state.currentUserRank.color;chip.style.borderColor=state.currentUserRank.color;chip.style.background=state.currentUserRank.bg;chip.style.boxShadow=state.currentUserRank.glow;}
  const xpCur=document.getElementById('prof-xp-cur');
  const xpNextEl=document.getElementById('prof-xp-next');
  const ring=document.getElementById('xp-ring-prog');
  const circ=289;
  if(nextSlRank){
    const pct=(state.currentUserXP-state.currentUserRank.minXP)/(nextSlRank.minXP-state.currentUserRank.minXP);
    if(ring)setTimeout(()=>{ring.style.strokeDashoffset=String(circ*(1-Math.min(1,Math.max(0,pct))));ring.style.stroke=state.currentUserRank.color;},100);
    if(xpCur)xpCur.textContent=state.currentUserXP.toLocaleString('fr-FR')+' XP';
    if(xpNextEl)xpNextEl.textContent='→ '+nextSlRank.label+' '+nextSlRank.minXP.toLocaleString('fr-FR')+' XP';
  }else{
    if(ring)setTimeout(()=>{ring.style.strokeDashoffset='0';ring.style.stroke=state.currentUserRank.color;},100);
    if(xpCur)xpCur.textContent=state.currentUserXP.toLocaleString('fr-FR')+' XP';
    if(xpNextEl)xpNextEl.textContent='🏆 Rang max !';
  }

  // Stats
  const sReads=document.getElementById('s-reads');if(sReads)sReads.textContent=r.length;
  const sQuizz=document.getElementById('s-quizz');if(sQuizz)sQuizz.textContent=q.length;
  const sAvg=document.getElementById('s-avg');if(sAvg)sAvg.textContent=avg+'%';

  // Streak card
  const streakEl=document.getElementById('s-streak');
  if(streakEl)streakEl.textContent=streak;
  const subEl=document.getElementById('streak-sub');
  if(subEl){
    if(streak===0)subEl.textContent='Lance-toi aujourd\'hui !';
    else if(streak<3)subEl.textContent='Bon début, continue !';
    else if(streak<7)subEl.textContent='Tu es en feu 🔥';
    else if(streak<30)subEl.textContent='Impressionnant, lâche rien !';
    else subEl.textContent='Légende absolue 👑';
  }

  // Thèmes explorés
  const readIds=new Set(r.map(x=>x.anecdote_id));
  const readAnec=a.filter(x=>readIds.has(x.id));
  const themesSet=new Set(readAnec.map(x=>x.theme));

  // Badges — données enrichies
  const perfectQuiz=q.filter(x=>x.pct>=100).length;
  const themeMap={};readAnec.forEach(x=>{const t=(x.theme||'').toLowerCase();if(t)themeMap[t]=(themeMap[t]||0)+1;});
  const favs=_histFavs.size;
  const shares=parseInt(localStorage.getItem('share_count')||'0');
  const hNow=new Date().getHours();
  if(hNow<7)localStorage.setItem('early_bird','1');
  if(hNow>=23)localStorage.setItem('night_owl','1');
  const earlyBird=!!localStorage.getItem('early_bird');
  const nightOwl=!!localStorage.getItem('night_owl');
  let duelsPlayed=0,duelsWon=0;
  try{
    const{data:myDuels}=await sb.from('duels').select('id,challenger_id,opponent_id,challenger_score,opponent_score').or('challenger_id.eq.'+state.currentUser.id+',opponent_id.eq.'+state.currentUser.id).eq('status','completed');
    duelsPlayed=(myDuels||[]).length;
    duelsWon=(myDuels||[]).filter(d=>{const ic=d.challenger_id===state.currentUser.id;return ic?d.challenger_score>d.opponent_score:d.opponent_score>d.challenger_score;}).length;
  }catch(e){}

  // Badges
  // Enigma badge data
  const enigmaR=enigmaStats||[];
  const enigmaCorrect=enigmaR.filter(x=>x.is_correct===true).length;
  const enigmaCatsSet=new Set(enigmaR.map(x=>x.category));
  const enigmaCatCounts={};enigmaR.forEach(x=>{if(x.is_correct)enigmaCatCounts[x.category]=(enigmaCatCounts[x.category]||0)+1;});
  const enigmaChooser=!!enigmaChoice;
  const badgeData={reads:r.length,streak,quizzes:q.length,avgQuiz:avg,bestQuiz,perfectQuiz,themes:themesSet.size,themeMap,friends:(friendsData||[]).length,duelsPlayed,duelsWon,favs,shares,earlyBird,nightOwl,enigmaTotal:enigmaR.length,enigmaCorrect,enigmaCats:enigmaCatsSet.size,enigmaChooser,enigmaLogique:enigmaCatCounts['logique']||0,enigmaHistorique:enigmaCatCounts['historique']||0,enigmaMaths:enigmaCatCounts['maths_recreatives']||0};
  const earnedCount=BADGES_DEF.filter(b=>b.check(badgeData)).length;
  const bcEl=document.getElementById('s-badges-count');
  if(bcEl)bcEl.textContent=earnedCount;
  const enigmeEl=document.getElementById('s-enigmes');
  if(enigmeEl)enigmeEl.textContent=enigmaR.length;
  buildQuizHistTab(q);buildBadgesTab(badgeData);
  checkAndAwardBadges(badgeData);
  buildIdentityCard(r,q,a);
  const adminEntry=document.getElementById('admin-entry');if(adminEntry)adminEntry.style.display='none';
  const adminHeaderBtn=document.getElementById('admin-header-btn');if(adminHeaderBtn)adminHeaderBtn.style.display=isAdmin()?'flex':'none';
  switchTab('badges');show('screen-profile');
}

export function buildHistTab(allAnec,reads){
  const el=document.getElementById('tab-hist');if(!el)return;
  if(!allAnec||!allAnec.length){el.innerHTML='<div class="empty"><span class="empty-ico">📖</span><p>Aucune anecdote disponible pour l\'instant.</p></div>';return;}
  const readIds=new Set((reads||[]).map(r=>r.anecdote_id));
  el.innerHTML='<div class="hist-list">'+allAnec.map(a=>{
    const isRead=readIds.has(a.id);
    const isToday=a.date===today();
    return'<div class="hist-item" onclick="viewPastAnec(\''+a.id+'\')" style="cursor:pointer;">'+
      '<div class="hist-icon">'+(a.icon||'📜')+'</div>'+
      '<div style="flex:1;min-width:0;">'+
        '<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">'+
          '<div class="hist-theme">'+(a.theme||'Anecdote')+'</div>'+
          (isToday?'<span style="font-size:.5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:var(--a);color:#fff;padding:.1rem .35rem;border-radius:.25rem;">Aujourd\'hui</span>':'')+
          (isRead?'<span style="font-size:.5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--a);opacity:.7;">✓ Lu</span>':'<span style="font-size:.5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);">Non lu</span>')+
        '</div>'+
        '<div class="hist-preview">'+(a.anecdote||'').slice(0,80)+'…</div>'+
        '<div style="font-size:.6rem;color:var(--ink3);margin-top:.2rem;">Choisi par '+(a.chooser||'Communauté')+'</div>'+
      '</div>'+
      '<div class="hist-date">'+fmtShort(a.date)+'</div>'+
    '</div>';
  }).join('')+'</div>';
}

export async function viewPastAnec(anecId){
  state.prevScreen='screen-profile';
  const[{data:anec},{data:questions}]=await Promise.all([
    sb.from('anecdotes').select('*').eq('id',anecId).single(),
    sb.from('questions').select('*').eq('anecdote_id',anecId)
  ]);
  if(!anec){showToast('⚠ Anecdote introuvable.');return;}
  state.todayAnec=anec;state.todayQs=questions||[];
  if(state.currentUser)await markRead();
  showAnec(false);updateNav('bn-hist');
}

export function buildQuizHistTab(qhist){
  const el=document.getElementById('tab-quiz-hist');if(!el)return;
  if(!qhist||!qhist.length){el.innerHTML='<div class="empty"><span class="empty-ico">🎯</span><p>Aucun quiz compl\u00e9t\u00e9 pour l\'instant.</p></div>';return;}
  const avg=Math.round(qhist.reduce((a,b)=>a+b.pct,0)/qhist.length);
  el.innerHTML='<div class="q-result" style="margin-bottom:1rem;"><span class="qr-score">'+avg+'%</span><div class="qr-title">Score moyen</div></div><div class="prev-head">Historique</div>'+qhist.slice(0,10).map(q=>'<div class="prev-row"><span>'+fmtShort(q.date)+'</span><span style="font-weight:700;color:var(--a)">'+q.pct+'%</span></div>').join('');
}

export async function buildAmisTab(){
  const el=document.getElementById('tab-amis');if(!el)return;
  el.innerHTML='<div id="pending-reqs-wrap" class="pending-requests-wrap"></div><div id="weekly-league-wrap" style="margin-bottom:1.25rem;"></div><div class="friend-search"><input id="friend-q" placeholder="Rechercher un pseudo\u2026"/><button onclick="searchFriend()">Rechercher</button></div><div id="friend-results"></div><div style="margin-top:1.5rem;"><div class="prev-head">Mes amis</div><div id="friend-list-own"></div></div>';
  const leagueEl=document.getElementById('weekly-league-wrap');
  const pendEl=document.getElementById('pending-reqs-wrap');
  await Promise.all([buildPendingRequests(pendEl),buildWeeklyLeague(leagueEl),loadFriends()]);
}

export async function searchFriend(){
  const q=(document.getElementById('friend-q')?.value||'').trim();if(!q)return;
  const{data}=await sb.from('profiles').select('*').ilike('username','%'+q+'%').neq('id',state.currentUser.id).limit(5);
  const el=document.getElementById('friend-results');if(!el)return;
  if(!data||!data.length){el.innerHTML='<div class="empty"><span class="empty-ico">🔍</span><p>Aucun utilisateur trouv\u00e9.</p></div>';return;}
  el.innerHTML='<div style="margin-bottom:.65rem;font-size:.58rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);">R\u00e9sultats</div><div class="friend-list">'+data.map(u=>'<div class="friend-item"><div class="friend-av" onclick="viewUserProfile(\''+u.id+'\',\''+u.username+'\')" style="cursor:pointer;">'+u.username[0].toUpperCase()+'</div><div style="flex:1;cursor:pointer;" onclick="viewUserProfile(\''+u.id+'\',\''+u.username+'\')"><div class="friend-name">'+u.username+'</div></div><button class="btn-friend add" onclick="addFriend(\''+u.id+'\',\''+u.username+'\')">+ Ajouter</button></div>').join('')+'</div>';
}

export async function addFriend(uid,uname){
  const{error}=await sb.from('friendships').insert({requester_id:state.currentUser.id,addressee_id:uid});
  if(error&&error.code==='23505'){showToast('D\u00e9j\u00e0 ami ou demande en attente.');return;}
  if(error){showToast('\u26a0 Erreur.');return;}
  showToast('\u2713 Demande envoy\u00e9e \u00e0 '+uname+' !');
}

export async function loadFriends(){
  const el=document.getElementById('friend-list-own');if(!el)return;
  const{data}=await sb.from('friendships').select('*,req:profiles!friendships_requester_id_fkey(username),adr:profiles!friendships_addressee_id_fkey(username)').or('requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+state.currentUser.id);
  if(!data||!data.length){el.innerHTML='<div class="empty"><span class="empty-ico">👥</span><p>Aucun ami pour l\'instant.</p></div>';return;}
  el.innerHTML='<div class="friend-list">'+data.map(f=>{const isMe=f.requester_id===state.currentUser.id;const name=isMe?(f.adr?.username||'?'):(f.req?.username||'?');const sc=f.status==='accepted'?'accepted':'pending';const sl=f.status==='accepted'?'Ami':(isMe?'En attente':'Accepter ?');const fuid=isMe?f.addressee_id:f.requester_id;return'<div class="friend-item"><div class="friend-av" onclick="viewUserProfile(\''+fuid+'\',\''+name+'\')" style="cursor:pointer;">'+name[0].toUpperCase()+'</div><div style="flex:1;cursor:pointer;" onclick="viewUserProfile(\''+fuid+'\',\''+name+'\')" ><div class="friend-name">'+name+'</div></div><span class="friend-status '+sc+'">'+sl+'</span>'+(f.status==='pending'&&!isMe?'<button class="btn-friend accept" onclick="acceptFriend(\''+f.id+'\')">Accepter</button>':'')+'</div>';}).join('')+'</div>';
}

export async function acceptFriend(fid){await sb.from('friendships').update({status:'accepted'}).eq('id',fid);showToast('✓ Ami ajouté !');checkFriendRequests();buildLeagueDashboard();}

export function switchTab(name){
  const tabs=['badges','quiz-hist','stats','amis'];
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('on',tabs[i]===name));
  tabs.forEach(t=>{const p=document.getElementById('tab-'+t);if(p)p.classList.toggle('on',t===name);});
  if(name==='amis')buildAmisTab();
  if(name==='stats')buildStatsTab();
}

export async function initRating(){
  const rs=document.getElementById('rating-section');
  if(!rs||!state.currentUser||!state.todayAnec){if(rs)rs.style.display='none';return;}
  rs.style.display='block';
  const{data:ex}=await sb.from('ratings').select('*').eq('user_id',state.currentUser.id).eq('anecdote_id',state.todayAnec.id).maybeSingle();
  state.curRating=ex?ex.stars:0;renderStars(state.curRating);
  const ci=document.getElementById('comment-input');if(ci){ci.value=ex?.comment||'';updateCommentCount();}
  const ok=document.getElementById('rating-saved');if(ok)ok.classList.toggle('on',!!ex);
  loadCommentsFeed();
}

export function renderStars(v){document.querySelectorAll('.star').forEach((s,i)=>s.classList.toggle('on',i<v));}

export function hoverStars(v){document.querySelectorAll('.star').forEach((s,i)=>s.classList.toggle('on',i<v));}

export function resetStars(){renderStars(state.curRating);}

export function clickStar(v){state.curRating=v;renderStars(v);}

export function updateCommentCount(){const ci=document.getElementById('comment-input'),cc=document.getElementById('comment-count');if(ci&&cc)cc.textContent=(ci.value||'').length+' / 200';}

export async function submitRating(){if(typeof completeBingoCell==='function')completeBingoCell(19);
  if(!state.currentUser||!state.todayAnec||state.curRating===0){showToast('\u26a0\ufe0f Choisissez au moins 1 \u00e9toile');return;}
  const comment=(document.getElementById('comment-input')?.value||'').trim();if(comment&&typeof completeBingoCell==='function')completeBingoCell(5);
  await sb.from('ratings').upsert({user_id:state.currentUser.id,anecdote_id:state.todayAnec.id,stars:state.curRating,comment},{onConflict:'user_id,anecdote_id'});
  const ok=document.getElementById('rating-saved');if(ok)ok.classList.add('on');
  showToast('\u2713 Avis enregistr\u00e9 !');
  loadCommentsFeed();
}

export async function loadCommentsFeed(){
  const feed=document.getElementById('comments-feed');if(!feed||!state.todayAnec){if(feed)feed.style.display='none';return;}
  const{data:ratings}=await sb.from('ratings')
    .select('id,user_id,stars,comment,created_at')
    .eq('anecdote_id',state.todayAnec.id)
    .not('comment','is',null)
    .neq('comment','')
    .order('created_at',{ascending:false})
    .limit(20);
  if(!ratings||!ratings.length){feed.style.display='none';return;}
  const uids=[...new Set(ratings.map(r=>r.user_id))];
  const{data:profiles}=await sb.from('profiles').select('id,username,avatar_url').in('id',uids);
  const pMap={};const avMap={};(profiles||[]).forEach(p=>{pMap[p.id]=p.username;avMap[p.id]=p.avatar_url||'';});
  const now=new Date();
  function timeAgo(d){if(!d)return'';const s=Math.floor((now-new Date(d))/1000);if(s<120)return'il y a 1 min';if(s<3600)return'il y a '+Math.floor(s/60)+'min';if(s<86400)return'il y a '+Math.floor(s/3600)+'h';return'il y a '+Math.floor(s/86400)+'j';}
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  const avg=(ratings.reduce((a,b)=>a+b.stars,0)/ratings.length).toFixed(1);
  const avgEl=document.getElementById('rating-avg');if(avgEl)avgEl.textContent=avg+'★ ('+ratings.length+' avis)';
  feed.style.display='block';
  feed.innerHTML='<div class="comments-feed-title">'+ratings.length+' commentaire'+(ratings.length>1?'s':'')+' de la communauté</div>'+
    ratings.map(r=>{
      const uname=pMap[r.user_id]||'Anonyme';
      const delBtn=isMod()?'<button class="comment-del-btn" onclick="deleteCommentInline(&quot;'+r.user_id+'&quot;,&quot;'+r.id+'&quot;,this)" title="Supprimer">🗑</button>':'';
      return '<div class="comment-item" id="ci-'+r.id+'">'+
        '<div class="comment-item-head">'+
          '<div class="comment-item-av" style="cursor:pointer;overflow:hidden;" onclick="viewUserProfile(\''+r.user_id+'\',\''+uname+'\')">'+(avMap[r.user_id]?'<img src="'+avMap[r.user_id]+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>':uname[0].toUpperCase())+'</div>'+
          '<div class="comment-item-name" style="cursor:pointer" onclick="viewUserProfile(\''+r.user_id+'\',\''+uname+'\')">'+ uname+'</div>'+
          '<span class="comment-item-stars">'+stars(r.stars)+'</span>'+
          '<span class="comment-item-date">'+timeAgo(r.created_at)+'</span>'+
          delBtn+
        '</div>'+
        '<div class="comment-item-text">'+r.comment.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>'+
      '</div>';
    }).join('');
}

export async function deleteCommentInline(uid, ratingId, btn){
  if(!isMod())return;
  if(!confirm('Supprimer ce commentaire ?'))return;
  btn.disabled=true;btn.textContent='…';
  // Set comment to empty string (keeps the rating but removes comment)
  const{error}=await sb.from('ratings').update({comment:''}).eq('user_id',uid).eq('anecdote_id',state.todayAnec.id);
  if(error){btn.disabled=false;btn.textContent='🗑';showToast('Erreur: '+error.message);return;}
  const card=document.getElementById('ci-'+ratingId);
  if(card){card.style.opacity='0';card.style.transition='opacity .3s';setTimeout(()=>{card.remove();},300);}
  showToast('✓ Commentaire supprimé');
}

export function applyProfileColor(color,save=true){
  if(save)localStorage.setItem('adj_prof_color',color);
  document.documentElement.style.setProperty('--prof-color',color);
  // Animer la ring et le glow de l'avatar
  const ring=document.getElementById('prof-av-ring');
  if(ring)ring.style.borderColor=color;
  const av=document.getElementById('prof-av');
  if(av)av.style.color=color;
  // Header avatar btn
  const avBtn=document.getElementById('av-btn');
  if(avBtn){avBtn.style.borderColor=color;avBtn.style.color=color;avBtn.style.boxShadow='0 0 14px '+color+'55';}
  // Sync swatches
  document.querySelectorAll('.color-swatch').forEach(s=>{
    const sc=s.getAttribute('data-color');
    s.classList.toggle('sel',sc===color);
  });
}

export function initColorPicker(){
  const sw=document.getElementById('color-swatches');if(!sw)return;
  const cur=localStorage.getItem('adj_prof_color')||PROF_COLORS[0];
  sw.innerHTML=PROF_COLORS.map(c=>'<div class="color-swatch'+(c===cur?' sel':'')+'" data-color="'+c+'" style="background:'+c+'" onclick="applyProfileColor(\''+c+'\')" title="'+c+'"></div>').join('');
}

export function toggleColorPicker(){
  const cp=document.getElementById('color-picker');if(!cp)return;
  const visible=cp.style.display!=='none'&&cp.style.display!=='';
  cp.style.display=visible?'none':'block';
  if(!visible)initColorPicker();
}

export function buildBadgesTab(data){
  const el=document.getElementById('tab-badges');if(!el)return;
  const earned=BADGES_DEF.filter(b=>b.check(data));
  const locked=BADGES_DEF.filter(b=>!b.check(data));
  const RARITY_COLOR={common:'',rare:'border-color:#3b82f6',epic:'border-color:#9333ea',legendary:'border-color:#f59e0b'};
  const RARITY_LABEL={common:'',rare:'Rare',epic:'Épique',legendary:'Légendaire'};
  const card=(b,isEarned)=>{
    const rc=isEarned?RARITY_COLOR[b.rarity||'common']:'';
    const rl=isEarned&&b.rarity&&b.rarity!=='common'?'<div class="badge-rarity-lbl" style="font-size:.42rem;font-weight:700;letter-spacing:.08em;color:#9333ea;margin-top:.1rem">'+RARITY_LABEL[b.rarity]+'</div>':'';
    const glowStyle=isEarned&&b.rarity==='legendary'?'box-shadow:0 0 16px rgba(245,158,11,.4);':isEarned&&b.rarity==='epic'?'box-shadow:0 0 10px rgba(147,51,234,.3);':'';
    return '<div class="badge-card '+(isEarned?'earned':'locked')+'" style="'+rc+';'+glowStyle+'">'+
      '<div class="badge-icon">'+b.icon+'</div>'+
      '<div class="badge-name">'+b.name+'</div>'+
      '<div class="badge-desc">'+b.desc+'</div>'+
      rl+'</div>';
  };
  el.innerHTML='<div class="badges-top">'+earned.length+' / '+BADGES_DEF.length+' badges débloqués</div>'
    +'<div class="badges-grid">'+earned.map(b=>card(b,true)).join('')+locked.map(b=>card(b,false)).join('')+'</div>';
}

export async function buildStatsTab(){
  const el=document.getElementById('tab-stats');if(!el)return;
  el.innerHTML='<div style="padding:.5rem 0;">'+
    '<div id="xp-chart-inline" class="xp-chart-wrap"><div class="xp-chart-title">📊 XP par semaine</div><div class="xp-bars" id="xp-bars-inline"></div></div>'+
    '</div>';
  await buildXpChart('xp-bars-inline');
}

export async function buildXpChart(targetId){
  if(!state.currentUser)return;
  const barsEl=document.getElementById(targetId||'xp-bars');if(!barsEl)return;
  const now=new Date();
  const weeks=[];
  for(let i=3;i>=0;i--){
    const start=new Date(now);start.setDate(start.getDate()-((start.getDay()+6)%7)-i*7);start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+7);
    weeks.push({start,end,label:i===0?'Cette sem.':'S−'+i});
  }
  const[{data:reads},{data:quizzes}]=await Promise.all([
    sb.from('reads').select('created_at').eq('user_id',state.currentUser.id),
    sb.from('quiz_history').select('created_at').eq('user_id',state.currentUser.id)
  ]);
  const xpPerWeek=weeks.map(w=>{
    const rXP=((reads||[]).filter(r=>new Date(r.created_at)>=w.start&&new Date(r.created_at)<w.end).length)*10;
    const qXP=((quizzes||[]).filter(q=>new Date(q.created_at)>=w.start&&new Date(q.created_at)<w.end).length)*20;
    return{label:w.label,xp:rXP+qXP};
  });
  const maxXp=Math.max(...xpPerWeek.map(w=>w.xp),1);
  barsEl.innerHTML=xpPerWeek.map(w=>'<div class="xp-bar-col"><div class="xp-bar-fill" style="height:'+Math.round((w.xp/maxXp)*56+4)+'px" title="'+w.xp+' XP"></div><div class="xp-bar-lbl">'+w.label+'<br><span style="color:var(--a);font-weight:700">'+w.xp+'</span></div></div>').join('');
}

export function triggerAvatarUpload(){document.getElementById('avatar-input').click();}

export async function uploadAvatar(input){
  if(!input.files||!input.files[0]||!state.currentUser)return;
  const file=input.files[0];
  if(file.size>2*1024*1024){showToast('⚠ Image trop lourde (max 2 Mo)');return;}
  showToast('⏳ Upload en cours…');
  const ext=file.name.split('.').pop().toLowerCase();
  const path=state.currentUser.id+'/avatar.'+ext;
  const{data,error}=await sb.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});
  if(error){showToast('⚠ Erreur upload: '+error.message);return;}
  const{data:{publicUrl}}=sb.storage.from('avatars').getPublicUrl(path);
  const ts=publicUrl+(publicUrl.includes('?')?'&':'?')+'t='+Date.now();
  await sb.from('profiles').update({avatar_url:ts}).eq('id',state.currentUser.id);
  state.currentUser.avatar_url=ts;
  renderProfileAvatar(ts);
  showToast('✓ Photo mise à jour !');
}

export function renderProfileAvatar(url){
  const img=document.getElementById('prof-av-photo');
  const av=document.getElementById('prof-av');
  if(url&&img){img.src=url;img.style.display='block';if(av)av.style.display='none';}
  else{if(img)img.style.display='none';if(av)av.style.display='flex';}
}

export function startEditBio(){
  const txt=document.getElementById('prof-bio-text');
  const inp=document.getElementById('prof-bio-input');
  const acts=document.getElementById('prof-bio-actions');
  if(!txt||!inp)return;
  inp.value=state.currentUser&&state.currentUser.bio?state.currentUser.bio:'';
  txt.style.display='none';inp.style.display='block';if(acts)acts.style.display='flex';
  inp.focus();inp.select();
}

export function cancelEditBio(){
  const txt=document.getElementById('prof-bio-text');
  const inp=document.getElementById('prof-bio-input');
  const acts=document.getElementById('prof-bio-actions');
  if(txt)txt.style.display='block';if(inp)inp.style.display='none';if(acts)acts.style.display='none';
}

export async function saveBio(){
  const inp=document.getElementById('prof-bio-input');
  if(!inp||!state.currentUser)return;
  const bio=inp.value.trim().slice(0,160);
  await sb.from('profiles').update({bio}).eq('id',state.currentUser.id);
  state.currentUser.bio=bio;
  const txt=document.getElementById('prof-bio-text');
  if(txt)txt.textContent=bio||'Ajoute une bio…';
  cancelEditBio();
  showToast('✓ Bio enregistrée !');
}

export function computeMaxStreak(dates){
  if(!dates||!dates.length)return 0;
  const sorted=[...new Set(dates)].sort();
  let max=1,cur=1;
  for(let i=1;i<sorted.length;i++){
    const a=new Date(sorted[i-1]),b=new Date(sorted[i]);
    const diff=(b-a)/(1000*60*60*24);
    if(diff===1){cur++;if(cur>max)max=cur;}
    else if(diff>1)cur=1;
  }
  return max;
}

export function funTitle(reads,avgQuiz){
  if(reads>=100)return{title:'Oracle des Anecdotes',icon:'🔮'};
  if(reads>=60&&avgQuiz>=80)return{title:'Génie Encyclopédique',icon:'🧠'};
  if(reads>=60)return{title:'Érudit Confirmé',icon:'📚'};
  if(reads>=30&&avgQuiz>=75)return{title:'Esprit Affté',icon:'⚡'};
  if(reads>=30)return{title:'Voyageur du Savoir',icon:'🌍'};
  if(reads>=15)return{title:'Apprenti Savant',icon:'🎓'};
  if(reads>=5)return{title:'Curieux Éveillé',icon:'👀'};
  return{title:'Touriste Curieux',icon:'🐣'};
}

export async function buildIdentityCard(reads,qhist,allAnec){
  const el=document.getElementById('identity-grid');if(!el)return;
  const dates=reads.map(r=>r.date);
  const maxStreak=computeMaxStreak(dates);
  if(maxStreak>(state.currentUser.streak_record||0)){
    await sb.from('profiles').update({streak_record:maxStreak}).eq('id',state.currentUser.id);
    state.currentUser.streak_record=maxStreak;
  }
  const avgQuiz=qhist.length?Math.round(qhist.reduce((a,b)=>a+b.pct,0)/qhist.length):0;
  const{title,icon}=funTitle(reads.length,avgQuiz);
  const readIds=new Set(reads.map(r=>r.anecdote_id));
  const readAnec=allAnec.filter(a=>readIds.has(a.id));
  const themeCount={};readAnec.forEach(a=>{if(a.theme){themeCount[a.theme]=(themeCount[a.theme]||0)+1;}});
  const topTheme=Object.entries(themeCount).sort((a,b)=>b[1]-a[1])[0];
  const themeName=topTheme?topTheme[0].split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '):'—';
  const themeCount1=topTheme?topTheme[1]:0;
  el.innerHTML=
    '<div class="id-stat">'+
      '<div class="id-stat-icon">'+icon+'</div>'+
      '<div class="id-stat-val" style="font-size:.72rem">'+title+'</div>'+
      '<div class="id-stat-lbl">Titre</div>'+
    '</div>'+
    '<div class="id-stat">'+
      '<div class="id-stat-icon">📚</div>'+
      '<div class="id-stat-val">'+themeName+'</div>'+
      '<div class="id-stat-lbl">Thème préféré</div>'+
      '<div class="id-stat-sub">'+themeCount1+' lecture'+(themeCount1>1?'s':'')+'</div>'+
    '</div>'+
    '<div class="id-stat">'+
      '<div class="id-stat-icon">🏆</div>'+
      '<div class="id-stat-val">'+(state.currentUser.streak_record||maxStreak)+' j</div>'+
      '<div class="id-stat-lbl">Record de série</div>'+
      '<div class="id-stat-sub">max consécutif</div>'+
    '</div>'+
    '<div class="id-stat">'+
      '<div class="id-stat-icon">🎯</div>'+
      '<div class="id-stat-val">'+avgQuiz+'%</div>'+
      '<div class="id-stat-lbl">Taux quiz</div>'+
      '<div class="id-stat-sub">'+(qhist.length?qhist.length+' quiz':'pas encore')+'</div>'+
    '</div>';
}

export function _closeUserModal(){
  const bd=document.getElementById('user-modal-bd');
  if(bd)bd.remove();
  history.pushState('',document.title,window.location.pathname+window.location.search);
}

export async function viewUserProfile(uid, fallbackName){
  // URL partageable
  window.location.hash='#/profil/'+uid;

  const old=document.getElementById('user-modal-bd');if(old)old.remove();
  const bd=document.createElement('div');
  bd.id='user-modal-bd';bd.className='user-modal-backdrop';
  bd.onclick=e=>{if(e.target===bd)_closeUserModal();};
  bd.innerHTML='<div class="user-modal user-modal-full"><div class="user-modal-loading">⏳ Chargement…</div></div>';
  document.body.appendChild(bd);

  // Fetch toutes les données en parallèle
  const[{data:prof},{data:reads},{data:qhist},{data:enigmaR},{data:userReads},{data:relData},{data:friendsCount}]=await Promise.all([
    sb.from('profiles').select('*').eq('id',uid).maybeSingle(),
    sb.from('reads').select('anecdote_id,date').eq('user_id',uid).order('date',{ascending:false}).limit(400),
    sb.from('quiz_history').select('pct,theme').eq('user_id',uid),
    sb.from('enigma_responses').select('id,is_correct').eq('user_id',uid),
    sb.from('reads').select('date').eq('user_id',uid).order('date',{ascending:false}).limit(400),
    state.currentUser&&state.currentUser.id!==uid
      ?sb.from('friendships').select('id,status,requester_id').or('and(requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+uid+'),and(requester_id.eq.'+uid+',addressee_id.eq.'+state.currentUser.id+')').maybeSingle()
      :{data:null},
    sb.from('friendships').select('id').or('requester_id.eq.'+uid+',addressee_id.eq.'+uid).eq('status','accepted'),
  ]);

  const name=prof?.username||fallbackName||'Anonyme';
  const color=prof?.color||'var(--a)';
  const level=prof?.level_name||'Novice';
  const xp=prof?.xp||0;
  const bio=prof?.bio||'';
  const streakRecord=prof?.streak_record||0;
  const joined=prof?.joined||prof?.created_at;
  const since=joined?new Date(joined).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'';

  // Stats
  const readCount=(reads||[]).length;
  const quizList=qhist||[];
  const avgQuiz=quizList.length?Math.round(quizList.reduce((s,q)=>s+q.pct,0)/quizList.length):0;
  const bestQuiz=quizList.length?Math.max(...quizList.map(q=>q.pct)):0;
  const enigmaTotal=(enigmaR||[]).length;
  const enigmaCorrect=(enigmaR||[]).filter(e=>e.is_correct).length;
  const totalFriends=(friendsCount||[]).length;

  // Streak
  let streak=0;
  if(userReads&&userReads.length){
    const dates=[...new Set(userReads.map(r=>r.date))].sort().reverse();
    const todayStr=today();let expected=todayStr;
    for(const date of dates){
      if(date===expected){streak++;const d=new Date(expected+'T12:00:00');d.setDate(d.getDate()-1);expected=d.toISOString().slice(0,10);}
      else if(date<expected)break;
    }
  }

  // Badges obtenus
  const badgeData={reads:readCount,streak,quizzes:quizList.length,avgQuiz,bestQuiz,friends:totalFriends,duelsPlayed:0,duelsWon:0,favs:0,shares:0,earlyBird:false,nightOwl:false,enigmaTotal,enigmaCorrect,enigmaCats:0,enigmaChooser:false,enigmaLogique:0,enigmaHistorique:0,enigmaMaths:0,perfectQuiz:bestQuiz>=100,themes:0,themeMap:{}};
  const earnedBadges=typeof BADGES_DEF!=='undefined'?BADGES_DEF.filter(b=>{try{return b.check(badgeData);}catch{return false;}}):[];

  // Relation d'amitié
  const rel=relData;
  const isFriend=rel&&rel.status==='accepted';
  const isPending=rel&&rel.status==='pending';
  const theyRequested=rel&&rel.requester_id===uid;
  const canChallenge=state.currentUser&&isFriend&&state.currentUser.id!==uid;
  let friendBtn='';
  if(state.currentUser&&state.currentUser.id!==uid){
    if(!rel){
      friendBtn='<button class="btn-main umo-action-btn" onclick="addFriend(\''+uid+'\',\''+name+'\');this.textContent=\'Demande envoyée ✓\';this.disabled=true">👥 Ajouter en ami</button>';
    } else if(isPending&&theyRequested){
      friendBtn='<button class="btn-main umo-action-btn" style="background:var(--gr)" onclick="acceptFriend(\''+rel.id+'\');this.textContent=\'Ami ✓\';this.disabled=true">✓ Accepter la demande</button>';
    } else if(isFriend){
      friendBtn='<div class="umo-friend-badge">✓ Vous êtes amis</div>';
    } else {
      friendBtn='<div class="umo-friend-badge" style="color:var(--ink3)">⏳ Demande en attente</div>';
    }
  }

  const slRank=getRank(xp);
  const shareUrl=window.location.origin+window.location.pathname+'#/profil/'+uid;

  const modal=bd.querySelector('.user-modal');
  modal.innerHTML=
    '<button class="user-modal-close" onclick="_closeUserModal()">✕</button>'+
    // En-tête SL
    '<div class="umo-header">'+
      '<div class="umo-av" style="background:'+slRank.bg+';border-color:'+slRank.color+';box-shadow:'+slRank.glow+'"><span style="color:'+slRank.color+'">'+name[0].toUpperCase()+'</span></div>'+
      '<div class="umo-info">'+
        '<div class="umo-level"><span class="umo-sl-rank-badge" style="color:'+slRank.color+';background:'+slRank.bg+'">RANG '+slRank.id+' · '+slRank.title+'</span></div>'+
        '<div class="umo-name">'+name+'</div>'+
        (since?'<div class="umo-since">Membre depuis le '+since+'</div>':'')+
        (bio?'<div class="umo-bio">'+bio+'</div>':'')+
        '<div class="umo-xp">'+xp+' XP</div>'+
      '</div>'+
    '</div>'+
    // Streak card SL
    (streak>0
      ?'<div class="umo-streak-card umo-streak-active">'+
          '<div class="umo-streak-fire">🔥</div>'+
          '<div class="umo-streak-content">'+
            '<div class="umo-streak-num">'+streak+'</div>'+
            '<div class="umo-streak-label">JOURS DE SUITE</div>'+
            (streakRecord>streak?'<div class="umo-streak-sub">Record : '+streakRecord+' 🏆</div>':'')+
          '</div>'+
        '</div>'
      :'<div class="umo-streak-card">'+
          '<div class="umo-streak-content">'+
            '<div class="umo-streak-num umo-streak-zero">—</div>'+
            '<div class="umo-streak-label umo-streak-zero">Pas encore de streak</div>'+
            (streakRecord?'<div class="umo-streak-sub umo-streak-zero">Record : '+streakRecord+'</div>':'')+
          '</div>'+
        '</div>'
    )+
    // Grille stats SL (6 cases)
    '<div class="umo-stats-grid">'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">📖</div><div class="psc-val">'+readCount+'</div><div class="psc-lbl">Anecdotes</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">🎯</div><div class="psc-val">'+quizList.length+'</div><div class="psc-lbl">Quiz</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">🔮</div><div class="psc-val">'+enigmaTotal+'</div><div class="psc-lbl">Énigmes</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">⭐</div><div class="psc-val">'+(avgQuiz?avgQuiz+'%':'—')+'</div><div class="psc-lbl">Score moy.</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">🏅</div><div class="psc-val">'+earnedBadges.length+'</div><div class="psc-lbl">Badges</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">👥</div><div class="psc-val">'+totalFriends+'</div><div class="psc-lbl">Amis</div></div>'+
    '</div>'+
    // Badges obtenus
    (earnedBadges.length
      ?'<div class="umo-section-title">🏅 Badges obtenus</div>'+
        '<div class="umo-badges-grid">'+
          earnedBadges.map(b=>
            '<div class="umo-badge-item umo-rarity-'+b.rarity+'" title="'+b.desc+'">'+
              '<span class="umo-badge-icon">'+b.icon+'</span>'+
              '<span class="umo-badge-name">'+b.name+'</span>'+
            '</div>'
          ).join('')+
        '</div>'
      :'')+
    // Actions
    '<div class="umo-actions">'+
      friendBtn+
      (canChallenge?'<button class="btn-main umo-action-btn" onclick="challengeFriend(\''+uid+'\',\''+name+'\');_closeUserModal()">⚔️ Défier en duel</button>':'')+
      '<button class="umo-share-btn" onclick="navigator.clipboard.writeText(\''+shareUrl+'\').then(()=>showToast(\'🔗 Lien copié !\'))">🔗 Partager ce profil</button>'+
    '</div>';
}

export async function openAccountSettings() {
  const bd = document.getElementById('acct-modal-bd');
  if (!bd) return;

  // Pré-remplir l'email actuel — appel frais pour éviter le cache JWT
  const emailEl = document.getElementById('acct-current-email');
  if (emailEl) {
    try {
      const { data: { user: freshUser } } = await sb.auth.getUser();
      if (freshUser) {
        emailEl.textContent = freshUser.email || '—';
        if (state.currentUser) state.currentUser.email = freshUser.email || '';
      }
    } catch(e) {
      if (emailEl && state.currentUser) emailEl.textContent = state.currentUser.email || '—';
    }
  }

  // Pré-remplir le pseudo actuel
  const unEl = document.getElementById('acct-username-input');
  if (unEl && state.currentUser) unEl.value = state.currentUser.username || '';

  // Pré-remplir la bio
  const bioEl = document.getElementById('acct-bio-input');
  if (bioEl && state.currentUser) bioEl.value = state.currentUser.bio || '';

  // Afficher les providers connectés
  _renderProviders();



  // Reset erreurs
  ['acct-username-err','acct-email-err','acct-pw-err','acct-bio-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  bd.style.display = 'flex';
  // Activer le premier onglet
  switchAcctTab('profil', document.querySelector('.acct-tab'));
}

export function closeAccountSettings() {
  const bd = document.getElementById('acct-modal-bd');
  if (bd) bd.style.display = 'none';
}

export function switchAcctTab(name, btn) {
  // Masquer tous les panels
  ['profil','compte','notifs','danger'].forEach(t => {
    const p = document.getElementById('acct-panel-' + t);
    if (p) p.style.display = 'none';
  });
  // Désactiver tous les onglets
  document.querySelectorAll('.acct-tab').forEach(b => b.classList.remove('active'));
  // Afficher le bon panel
  const panel = document.getElementById('acct-panel-' + name);
  if (panel) panel.style.display = '';
  if (btn) btn.classList.add('active');
}

export function _renderProviders() {
  const el = document.getElementById('acct-providers');
  if (!el || !state.currentUser) return;
  const providers = state.currentUser.app_metadata?.providers || [state.currentUser.app_metadata?.provider || 'email'];
  const icons = { email: '📧', discord: '💬', google: '🔵', github: '⚫' };
  const names = { email: 'Email / Mot de passe', discord: 'Discord', google: 'Google', github: 'GitHub' };
  el.innerHTML = providers.map(p =>
    '<div class="acct-provider-row">' +
      '<span class="acct-provider-icon">' + (icons[p] || '❓') + '</span>' +
      '<span class="acct-provider-name">' + (names[p] || p) + '</span>' +
    '</div>'
  ).join('');
}

export async function confirmDeleteAccount() {
  const input = prompt('Pour confirmer, tape "SUPPRIMER" en majuscules :');
  if (input !== 'SUPPRIMER') { showToast('Suppression annulée.'); return; }
  await sb.from('profiles').delete().eq('id', state.currentUser.id);
  await sb.auth.signOut();
  showToast('Compte supprimé. À bientôt peut-être 👋');
  state.currentUser = null;
  goHome();
}
