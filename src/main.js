import * as Shared from './shared.js';
import * as Xp from './modules/xp.js';
import * as Auth from './modules/auth.js';
import * as Hub from './modules/hub.js';
import * as Anecdote from './modules/anecdote.js';
import * as Enigme from './modules/enigme.js';
import * as Mystery from './modules/mystery.js';
import * as Profile from './modules/profile.js';
import * as History from './modules/history.js';
import * as Play from './modules/play.js';
import * as Duels from './modules/duels.js';
import * as Admin from './modules/admin.js';
import * as Vs100 from './modules/vs100.js';
import * as Notifs from './modules/notifs.js';
import { state, sb } from './shared.js';

export function _handleHashRouting(){
  const hash=window.location.hash;
  // Deep link profil uniquement — les autres routes gérées par pathname
  const m=hash.match(/^\/profil\/([a-f0-9-]{36})$/i) || hash.match(/^#\/profil\/([a-f0-9-]{36})$/i);
  if(m){viewUserProfile(m[1]);return;}
}

// Make all functions globally available for inline HTML handlers
Object.assign(window, Shared, Xp, Auth, Hub, Anecdote, Enigme, Mystery, Profile, History, Play, Duels, Admin, Vs100, Notifs);

(async function init(){
  document.documentElement.classList.add('dark');
  localStorage.setItem('adj_mode','dark');
  updateToggleIcon();updateHeader();
  const savedColor=localStorage.getItem('adj_prof_color');
  if(savedColor)applyProfileColor(savedColor,false);
  const{data:{session}}=await sb.auth.getSession();
  if(session){
    state.currentUser=await getProfile(session.user.id);
    if(!state.currentUser){
      const meta=session.user.user_metadata||{};
      let uname=(meta.user_name||meta.full_name||meta.name||'chasseur'+Math.floor(Math.random()*9999)).replace(/[^a-zA-Z0-9_\-]/g,'_').slice(0,20);
      const{data:ex}=await sb.from('profiles').select('id').eq('username',uname).maybeSingle();
      if(ex)uname=uname.slice(0,15)+'_'+Math.floor(Math.random()*999);
      await sb.from('profiles').insert({id:session.user.id,username:uname,joined:today()});
      state.currentUser={id:session.user.id,username:uname,joined:today(),email:session.user.email||''};
    } else {state.currentUser.email=session.user.email||'';}
  }
  updateHeader();
  // Précharger l'anecdote en arrière-plan sans l'afficher
  loadTodayBackground();
  if(state.currentUser){
    // SPA routing par pathname (Cloudflare sert index.html pour toutes les routes via _redirects)
    const path=window.location.pathname.replace(/^\/|\/$/g,'').toLowerCase();
    if(path==='le-saviez-vous'){goAnec();}
    else if(path==='enigme'){goEnigme();}
    else if(path==='quiz'){goPlay();}
    else if(path==='duels'){goPlay();setTimeout(showDuelLobby,100);}
    else if(path==='vs100'){show1vs100Lobby();}
    else if(path==='mystere'){showHub();setTimeout(showMysteryDetail,200);}
    else if(path==='profile'||path==='profil'){goProfile();}
    else{showHub();}
    loadFavs();checkFriendRequests();loadNotifications();subscribeNotifications();subscribeNewHunters();
  } else {
    show('screen-login');
  }

// v2 FEATURES

// ── Streak ──────────────────────────────────────────────────────────────────
// state.userStreak declared at top

async function computeStreak(){
  if(!state.currentUser)return 0;
  const{data:logins}=await sb.from('user_logins').select('date').eq('user_id',state.currentUser.id).order('date',{ascending:false}).limit(400);
  if(!logins||!logins.length)return 0;
  const dates=[...new Set(logins.map(r=>r.date))].sort().reverse();
  const todayStr=today();
  let streak=0,expected=todayStr;
  for(const date of dates){
    if(date===expected){streak++;const d=new Date(expected+'T12:00:00');d.setDate(d.getDate()-1);expected=d.toISOString().slice(0,10);}
    else if(date<expected)break;
  }
  return streak;
}

async function loadStreak(){
  if(state.currentUser)await sb.from('user_logins').upsert({user_id:state.currentUser.id,date:today()},{onConflict:'user_id,date'});
  const n=await computeStreak();
  state.userStreak=n;
  const badge=document.getElementById('streak-badge');
  if(!badge)return;
  if(n===0){badge.style.display='none';return;}
  badge.style.display='flex';
  document.getElementById('streak-num').textContent=n;
  // Update FAB badge
  const fab=document.getElementById('bingo-fab');
  if(fab&&isEte()){fab.style.display='flex';}
  // Milestone pop — une seule fois par jour
  if([3,7,14,30,50,100].includes(n)){
    const popKey='streak_pop_shown_'+today();
    if(!localStorage.getItem(popKey)){
      localStorage.setItem(popKey,'1');
      const pop=document.getElementById('streak-pop');
      if(pop){
        document.getElementById('sp-num').textContent='🔥 '+n;
        document.getElementById('sp-msg').textContent=n+' jours de suite !';
        pop.classList.add('on');
        setTimeout(()=>pop.classList.remove('on'),2800);
      }
    }
  }
}

// ── "Pour aller plus loin" ───────────────────────────────────────────────────
async function loadContexte(){
  if(!state.todayAnec)return;
  const card=document.getElementById('contexte-card');
  if(!card)return;

  // Si le contexte est déjà en cache dans state.todayAnec, on l'affiche direct
  if(state.todayAnec.contexte){
    _renderContexte(state.todayAnec.contexte, state.todayAnec.sources||[]);
    return;
  }

  // Sinon : génération à la demande via l'Edge Function (PATCH)
  card.style.display='block';
  document.getElementById('contexte-txt').innerHTML='<span style="color:var(--ink3);font-size:.78rem">✨ Génération en cours…</span>';
  document.getElementById('contexte-sources').innerHTML='';
  card.classList.add('open');

  try{
    const res=await fetch(EDGE,{
      method:'PATCH',
      headers:{'Content-Type':'application/json', 'apikey': SB_ANON},
      body:JSON.stringify({id:state.todayAnec.id, anecdote:state.todayAnec.anecdote, theme:state.todayAnec.theme})
    });
    if(!res.ok)throw new Error('status '+res.status);
    const json=await res.json();
    if(json.contexte){
      state.todayAnec.contexte=json.contexte;
      state.todayAnec.sources=json.sources||[];
      _renderContexte(json.contexte, json.sources||[]);
    }else{
      document.getElementById('contexte-txt').textContent='Contenu bientôt disponible.';
    }
  }catch(e){
    document.getElementById('contexte-txt').textContent='Impossible de charger le contexte pour l\'instant.';
    console.warn('loadContexte error:',e);
  }
}

function _renderContexte(texte, sources){
  const card=document.getElementById('contexte-card');
  if(!card)return;
  card.style.display='block';
  document.getElementById('contexte-txt').textContent=texte;
  const srcEl=document.getElementById('contexte-sources');
  if(sources.length){
    srcEl.innerHTML=sources.map(s=>'<a class="contexte-src-lnk" href="'+s.url+'" target="_blank" rel="noopener"><span class="src-ico">🔗</span>'+s.title+'</a>').join('');
  }else{srcEl.innerHTML='';}
}

function toggleContexte(){
  const card=document.getElementById('contexte-card');
  if(card)card.classList.toggle('open');
}

// ── Share modal ──────────────────────────────────────────────────────────────
function shareAnec(){
  if(!state.todayAnec)return;
  const theme=state.todayAnec.theme||'Anecdote';
  const txt=state.todayAnec.anecdote||'';
  document.getElementById('share-preview-theme').textContent=(state.todayAnec.icon||'')+'  '+theme;
  document.getElementById('share-preview-txt').textContent=txt;
  document.getElementById('share-hint').textContent='';
  document.getElementById('share-bd').classList.add('on');
  completeBingoCell(10);
  localStorage.setItem('bingo_shared','1');
}
function closeShare(){document.getElementById('share-bd').classList.remove('on');}

function _shareText(){
  const theme=state.todayAnec?.theme||'Anecdote';
  const txt=state.todayAnec?.anecdote||'';
  return '💡 *'+theme+'* — Anecdote du Jour\n\n'+txt+'\n\n👉 https://anecdote-du-jour.pages.dev/';
}
function shareViaWhatsApp(){
  const url='https://wa.me/?text='+encodeURIComponent(_shareText());
  window.open(url,'_blank','noopener');
  document.getElementById('share-hint').textContent='✓ WhatsApp ouvert !';
}
function shareViaDiscord(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='✓ Texte copié — colle dans Discord !';
  }).catch(()=>{document.getElementById('share-hint').textContent='Copie manuelle : Ctrl+C';});
}
function copyShareText(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='✓ Copié dans le presse-papiers !';
    setTimeout(()=>{const h=document.getElementById('share-hint');if(h)h.textContent='';},2500);
  });
}



async function submitMystery(ws){
  const si=document.getElementById('mys-s-'+ws);
  const ri=document.getElementById('mys-r-'+ws);
  if(!si||!ri)return;
  const suspect=si.value.trim(),reason=ri.value.trim();
  if(!suspect||reason.length<20){showSystemNotif({title:'Réponse incomplète — nom + raisonnement requis',xpGain:0});return;}
  const{data}=await sb.from('weekly_mysteries').select('culprit,keywords,explanation').eq('week_start',ws).single();
  if(!data)return;
  const nameOk=data.culprit.toLowerCase().includes(suspect.toLowerCase())||suspect.toLowerCase().includes(data.culprit.split(' ').pop().toLowerCase());
  const kwHits=data.keywords.filter(kw=>reason.toLowerCase().includes(kw.toLowerCase()));
  const ok=nameOk&&kwHits.length>=2;
  localStorage.setItem('mys_v_'+ws,JSON.stringify({ok,suspect,reason,at:Date.now()}));
  if(ok){showSystemNotif({title:'Enquête résolue !',xpGain:50});if(typeof addXP==='function')addXP(50);}
  const mw=document.getElementById('hub-mystery-wrap');
  if(mw)buildWeeklyMystery(mw);
}

async function answerChallenge(challengeId,answer,correct_answer){
  if(!state.currentUser){showToast('⚠ï¸ Connecte-toi pour jouer !');return;}
  const correct=(answer===correct_answer);
  const{error}=await sb.from('challenge_responses').upsert({user_id:state.currentUser.id,challenge_id:challengeId,answer,correct},{onConflict:'user_id,challenge_id'});
  if(error){showToast('Erreur : '+error.message);return;}
  if(correct)showToast('🎉 Bonne réponse !');else showToast('❌ Raté ! Retente la semaine prochaine.');
  // Bingo: marquer "défi communautaire fait"
  completeBingoCell(14);
  // Recharger le challenge pour afficher résultats
  const el=document.querySelector('.challenge-card')?.parentElement;
  if(el)buildCommunityChallenge(el);
}

// ── Bingo de l'été ───────────────────────────────────────────────────────────
const BINGO_START=new Date('2026-06-21');
const BINGO_END  =new Date('2026-09-21T23:59:59');
const BINGO_CELLS=[
  {id:0, e:'📖', t:'Lis ta première anecdote'},
  {id:1, e:'⭐', t:'Fais un quiz à 100%'},
  {id:2, e:'🏆', t:'Joue en Ligue'},
  {id:3, e:'👥', t:'Ajoute un ami'},
  {id:4, e:'📚', t:'Lis 5 anecdotes'},
  {id:5, e:'💬', t:'Commente une anecdote'},
  {id:6, e:'🔬', t:'Lis une anecdote Science'},
  {id:7, e:'🏛ï¸', t:"Lis une anecdote Histoire"},
  {id:8, e:'🎨', t:"Lis une anecdote Art"},
  {id:9, e:'🔥', t:'3 jours de suite'},
  {id:10,e:'📤', t:"Partage une anecdote"},
  {id:11,e:'🎖ï¸', t:"Obtiens un badge"},
  {id:12,e:'🚀', t:"Lis une anecdote Espace"},
  {id:13,e:'🍽ï¸', t:"Lis une anecdote Gastro"},
  {id:14,e:'🎯', t:"Fais le défi communautaire"},
  {id:15,e:'🧠', t:"Fais un quiz"},
  {id:16,e:'📖', t:"Lis 10 anecdotes"},
  {id:17,e:'⚡', t:"Lis une anecdote Sport"},
  {id:18,e:'✨', t:"Case libre !", free:true},
  {id:19,e:'🌟', t:"Note une anecdote"},
  {id:20,e:'🔥', t:"7 jours de suite"},
  {id:21,e:'🤔', t:"Lis une anecdote Insolite"},
  {id:22,e:'🎮', t:"Joue une partie privée"},
  {id:23,e:'📅', t:"Lis 20 anecdotes"},
  {id:24,e:'🏆', t:"Lis 30 anecdotes"},
];

// state.bingoCompleted declared at top

function isEte(){const n=new Date();return n>=BINGO_START&&n<=BINGO_END;}

async function loadBingo(){
  if(!state.currentUser)return;
  // Case libre (18) toujours cochée
  completeBingoCell(18,false);
  const{data}=await sb.from('bingo_progress').select('cells').eq('user_id',state.currentUser.id).maybeSingle();
  if(data&&data.cells){data.cells.forEach(c=>state.bingoCompleted.add(c));}
  // Auto-check depuis les données
  await autocheckBingo();
  updateBingoFab();
}

async function autocheckBingo(){
  if(!state.currentUser)return;
  const[{data:reads},{data:qhist},{data:friends},{data:lgScores},{data:ratings},{data:themeReads}]=await Promise.all([
    sb.from('reads').select('id',{count:'exact',head:true}).eq('user_id',state.currentUser.id),
    sb.from('quiz_history').select('pct').eq('user_id',state.currentUser.id),
    sb.from('friendships').select('id',{count:'exact',head:true}).or('requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+state.currentUser.id).eq('status','accepted'),
    sb.from('league_scores').select('id',{count:'exact',head:true}).eq('user_id',state.currentUser.id),
    sb.from('ratings').select('id',{count:'exact',head:true}).eq('user_id',state.currentUser.id),
    sb.from('reads').select('anecdotes(theme)').eq('user_id',state.currentUser.id).limit(200),
  ]);
  const rc=reads?.length||0;
  const qlist=qhist||[];
  const fc=friends?.length||0;
  const lc=lgScores?.length||0;
  const ratc=ratings?.length||0;
  const themes=(themeReads||[]).map(r=>r.anecdotes?.theme||'').map(t=>t.toLowerCase());

  const checks={
    0:rc>=1, 1:qlist.some(q=>q.pct===100), 2:lc>=1, 3:fc>=1, 4:rc>=5,
    6:themes.some(t=>t.includes('science')), 7:themes.some(t=>t.includes('histoire')||t.includes('histor')),
    8:themes.some(t=>t.includes('art')), 9:state.userStreak>=3,
    10:localStorage.getItem('bingo_shared')==='1',
    12:themes.some(t=>t.includes('espace')), 13:themes.some(t=>t.includes('food')||t.includes('gastro')),
    15:qlist.length>=1, 16:rc>=10, 17:themes.some(t=>t.includes('sport')),
    19:ratc>=1, 20:state.userStreak>=7, 21:themes.some(t=>t.includes('insolite')),
    22:localStorage.getItem('bingo_multi')==='1',
    23:rc>=20, 24:rc>=30,
  };
  const prev=state.bingoCompleted.size;
  Object.entries(checks).forEach(([id,ok])=>{if(ok)state.bingoCompleted.add(Number(id));});
  state.bingoCompleted.add(18); // case libre
  if(state.bingoCompleted.size!==prev)saveBingo();
}

function completeBingoCell(id,save=true){
  if(state.bingoCompleted.has(id))return;
  state.bingoCompleted.add(id);
  updateBingoFab();
  if(save)saveBingo();
  // Re-render grid if modal open
  if(document.getElementById('bingo-bd').classList.contains('on'))renderBingoGrid();
}

async function saveBingo(){
  if(!state.currentUser)return;
  const cells=[...bingoCompleted];
  await sb.from('bingo_progress').upsert({user_id:state.currentUser.id,cells,updated_at:new Date().toISOString()},{onConflict:'user_id'});
}

function updateBingoFab(){
  const n=state.bingoCompleted.size;
  const badge=document.getElementById('bingo-fab-badge');
  if(badge)badge.textContent=n+'/25';
  const prog=document.getElementById('bingo-prog-fill');
  if(prog)prog.style.width=(n/25*100)+'%';
  const ptxt=document.getElementById('bingo-prog-txt');
  if(ptxt)ptxt.textContent=n+' / 25 cases cochées';
}

function renderBingoGrid(){
  const grid=document.getElementById('bingo-grid');
  if(!grid)return;
  grid.innerHTML=BINGO_CELLS.map(c=>{
    const done=state.bingoCompleted.has(c.id);
    return '<div class="bingo-cell'+(done?' done':'')+(c.free?' free':'')+'">'+
      (done?'<div class="bingo-check">✓</div>':'')+
      '<div class="bingo-cell-emoji">'+c.e+'</div>'+
      '<div class="bingo-cell-txt">'+c.t+'</div>'+
    '</div>';
  }).join('');
  updateBingoFab();
}

function openBingo(){
  if(!isEte()){showToast('🌞 Le bingo commence le 21 juin !');return;}
  renderBingoGrid();
  document.getElementById('bingo-bd').classList.add('on');
}
function closeBingo(){document.getElementById('bingo-bd').classList.remove('on');}

// ── Community challenge ──────────────────────────────────────────────────────
async function buildCommunityChallenge(el){
  if(!el)return;
  // Semaine en cours (lundi)
  const now=new Date();
  const dow=(now.getDay()+6)%7;
  const mon=new Date(now);mon.setDate(now.getDate()-dow);mon.setHours(0,0,0,0);
  const ws=mon.toISOString().slice(0,10);

  const{data:ch}=await sb.from('community_challenges').select('*').eq('week_start',ws).maybeSingle();
  if(!ch){el.innerHTML='<div class="empty"><span class="empty-ico">🎯</span><p style="color:var(--ink3);font-size:.8rem">Défi de la semaine bientôt disponible !</p></div>';return;}

  let userResp=null;
  if(state.currentUser){
    const{data:r}=await sb.from('challenge_responses').select('answer,correct').eq('user_id',state.currentUser.id).eq('challenge_id',ch.id).maybeSingle();
    userResp=r;
  }

  // Compter les réponses globales
  const{data:allResps}=await sb.from('challenge_responses').select('answer,correct').eq('challenge_id',ch.id);
  const total=(allResps||[]).length;
  const nbOk=(allResps||[]).filter(r=>r.correct).length;
  const pctOk=total?Math.round(nbOk/total*100):0;

  const opts=(ch.options||[]);
  const answered=!!userResp;

  const optHtml=opts.map((o,i)=>{
    let cls='challenge-opt';
    if(answered){
      if(i===ch.answer)cls+=' reveal-ok';
      if(userResp&&userResp.answer===i){cls+=(i===ch.answer?' ok':' err');}
    }
    return '<button class="'+cls+'" '+(answered?'disabled':'')+' onclick="answerChallenge(\''+ch.id+'\','+i+','+ch.answer+')">'+
      '<span style="font-weight:700;color:var(--ink3);margin-right:.4rem">'+String.fromCharCode(65+i)+'.</span>'+o+'</button>';
  }).join('');

  let bottomHtml='';
  if(answered){
    const ok=userResp.correct;
    bottomHtml='<div class="challenge-result"><span>'+(ok?'✅':'❌')+'</span><span>'+(ok?'Bonne réponse ! Bien joué 🎉':'Raté ! La bonne réponse est <strong>'+opts[ch.answer]+'</strong>')+'</span></div>'+
      (ch.explanation?'<div class="challenge-expl">📖 '+ch.explanation+'</div>':'')+
      '<div class="challenge-score-bar"><div class="challenge-score-fill" style="width:'+pctOk+'%"></div></div>'+
      '<div class="challenge-stats">'+nbOk+' / '+total+' joueurs ont trouvé ('+pctOk+'%)</div>';
  }else if(!state.currentUser){
    bottomHtml='<div style="margin-top:.75rem;text-align:center"><button class="btn-main" style="font-size:.75rem;padding:.5rem 1.25rem" onclick="show(\'screen-login\')">Se connecter pour jouer</button></div>';
  }

  el.innerHTML='<div class="challenge-card">'+
    '<div class="challenge-week">'+ch.icon+' Défi de la semaine</div>'+
    '<div class="challenge-q">'+ch.question+'</div>'+
    '<div class="challenge-opts">'+optHtml+'</div>'+
    bottomHtml+'</div>';
}




// ── XP pop animation ─────────────────────────────────────────────────────────
function popXP(amount,anchorEl){
  const pop=document.createElement('div');
  pop.className='xp-pop';
  pop.textContent='+'+amount+' XP';
  if(anchorEl){
    const r=anchorEl.getBoundingClientRect();
    pop.style.left=r.left+'px';pop.style.top=r.top+'px';
  }else{pop.style.left='50%';pop.style.top='40%';}
  document.body.appendChild(pop);
  setTimeout(()=>pop.remove(),1300);
}

  initOnboarding();
  if(isEte()){const f=document.getElementById('bingo-fab');if(f)f.style.display='flex';}
  if(state.currentUser){setTimeout(()=>{loadStreak();loadBingo();},50);}
  // expose v2 functions to global scope
  window.shareAnec=shareAnec;window.closeShare=closeShare;
  window.setReaction=setReaction;window.showDuelLobby=showDuelLobby;
  window.createDuel=createDuel;window.joinDuelByCode=joinDuelByCode;window.cancelDuel=cancelDuel;
  window.resumeDuel=resumeDuel;window.showJoinDuel=showJoinDuel;window.pickDuelTheme=pickDuelTheme;window.readyForNext=readyForNext;
  window.answerDuel=answerDuel;window.downloadShareImage=downloadShareImage;
  window.checkAndAwardBadges=checkAndAwardBadges;
  window.shareViaWhatsApp=shareViaWhatsApp;window.shareViaDiscord=shareViaDiscord;
  window.copyShareText=copyShareText;
  window.openBingo=openBingo;window.closeBingo=closeBingo;
  window.answerChallenge=answerChallenge;window.completeBingoCell=completeBingoCell;
  window.loadContexte=loadContexte;window.toggleContexte=toggleContexte;
  window.buildCommunityChallenge=buildCommunityChallenge;
})();


window.addEventListener('hashchange',_handleHashRouting);


// Banniere site
async function loadSiteBanner(){
  try{
    var d=await sb.from("app_config").select("value").eq("key","site_banner").maybeSingle();
    if(!d.data||!d.data.value)return;
    var b=JSON.parse(d.data.value);
    if(!b.enabled||!b.message)return;
    var el=document.getElementById("site-banner");
    if(!el){el=document.createElement("div");el.id="site-banner";document.body.insertBefore(el,document.body.firstChild);}
    var colors={info:"#3b82f6",warning:"#f59e0b",success:"#22c55e",error:"#ef4444"};
    var c=colors[b.type]||"#3b82f6";
    el.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9999;padding:.6rem 1rem;background:"+c+"18;border-bottom:2px solid "+c+";display:flex;align-items:center;justify-content:center;gap:.6rem;font-size:.82rem;font-weight:600;color:"+c;
    var icon=document.createElement("span");icon.textContent=b.type==="warning"?"WARNING":b.type==="error"?"ERROR":"INFO";
    var msg=document.createElement("span");msg.textContent=b.message;
    var btn=document.createElement("button");btn.textContent="x";
    btn.style.cssText="margin-left:.75rem;background:none;border:none;cursor:pointer;font-size:1rem;opacity:.7";
    btn.addEventListener("click",function(){el.style.display="none";});
    el.innerHTML="";el.append(icon,msg,btn);
    document.documentElement.style.setProperty("--banner-h","38px");
  }catch(e){}
}
setTimeout(loadSiteBanner,900);