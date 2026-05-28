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
import { _handleHashRouting } from './modules/notifs.js';
import { state, sb } from './shared.js';

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
    } else {currentUser.email=session.user.email||'';}
  }
  updateHeader();
  // PrÃ©charger l'anecdote en arriÃ¨re-plan sans l'afficher
  loadTodayBackground();
  if(state.currentUser){
    showHub();
    loadFavs();checkFriendRequests();loadNotifications();subscribeNotifications();subscribeNewHunters();
  } else {
    show('screen-login');
  }

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// v2 FEATURES
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

// ââ Streak ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// state.userStreak declared at top

async function computeStreak(){
  if(!state.currentUser)return 0;
  const{data:logins}=await sb.from('user_logins').select('date').eq('user_id',currentUser.id).order('date',{ascending:false}).limit(400);
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
  if(state.currentUser)await sb.from('user_logins').upsert({user_id:currentUser.id,date:today()},{onConflict:'user_id,date'});
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
  // Milestone pop â une seule fois par jour
  if([3,7,14,30,50,100].includes(n)){
    const popKey='streak_pop_shown_'+today();
    if(!localStorage.getItem(popKey)){
      localStorage.setItem(popKey,'1');
      const pop=document.getElementById('streak-pop');
      if(pop){
        document.getElementById('sp-num').textContent='ð¥ '+n;
        document.getElementById('sp-msg').textContent=n+' jours de suite !';
        pop.classList.add('on');
        setTimeout(()=>pop.classList.remove('on'),2800);
      }
    }
  }
}

// ââ "Pour aller plus loin" âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function loadContexte(){
  if(!state.todayAnec)return;
  const card=document.getElementById('contexte-card');
  if(!card)return;

  // Si le contexte est dÃ©jÃ  en cache dans state.todayAnec, on l'affiche direct
  if(todayAnec.contexte){
    _renderContexte(todayAnec.contexte, todayAnec.sources||[]);
    return;
  }

  // Sinon : gÃ©nÃ©ration Ã  la demande via l'Edge Function (PATCH)
  card.style.display='block';
  document.getElementById('contexte-txt').innerHTML='<span style="color:var(--ink3);font-size:.78rem">â¨ GÃ©nÃ©ration en coursâ¦</span>';
  document.getElementById('contexte-sources').innerHTML='';
  card.classList.add('open');

  try{
    const res=await fetch(EDGE,{
      method:'PATCH',
      headers:{'Content-Type':'application/json', 'apikey': SB_ANON},
      body:JSON.stringify({id:todayAnec.id, anecdote:todayAnec.anecdote, theme:todayAnec.theme})
    });
    if(!res.ok)throw new Error('status '+res.status);
    const json=await res.json();
    if(json.contexte){
      todayAnec.contexte=json.contexte;
      todayAnec.sources=json.sources||[];
      _renderContexte(json.contexte, json.sources||[]);
    }else{
      document.getElementById('contexte-txt').textContent='Contenu bientÃ´t disponible.';
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
    srcEl.innerHTML=sources.map(s=>'<a class="contexte-src-lnk" href="'+s.url+'" target="_blank" rel="noopener"><span class="src-ico">ð</span>'+s.title+'</a>').join('');
  }else{srcEl.innerHTML='';}
}

function toggleContexte(){
  const card=document.getElementById('contexte-card');
  if(card)card.classList.toggle('open');
}

// ââ Share modal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function shareAnec(){
  if(!state.todayAnec)return;
  const theme=todayAnec.theme||'Anecdote';
  const txt=todayAnec.anecdote||'';
  document.getElementById('share-preview-theme').textContent=(todayAnec.icon||'')+'  '+theme;
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
  return 'ð¡ *'+theme+'* â Anecdote du Jour\n\n'+txt+'\n\nð https://anecdote-du-jour.pages.dev/';
}
function shareViaWhatsApp(){
  const url='https://wa.me/?text='+encodeURIComponent(_shareText());
  window.open(url,'_blank','noopener');
  document.getElementById('share-hint').textContent='â WhatsApp ouvert !';
}
function shareViaDiscord(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='â Texte copiÃ© â colle dans Discord !';
  }).catch(()=>{document.getElementById('share-hint').textContent='Copie manuelle : Ctrl+C';});
}
function copyShareText(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='â CopiÃ© dans le presse-papiers !';
    setTimeout(()=>{const h=document.getElementById('share-hint');if(h)h.textContent='';},2500);
  });
}



async function submitMystery(ws){
  const si=document.getElementById('mys-s-'+ws);
  const ri=document.getElementById('mys-r-'+ws);
  if(!si||!ri)return;
  const suspect=si.value.trim(),reason=ri.value.trim();
  if(!suspect||reason.length<20){showSystemNotif({title:'RÃ©ponse incomplÃ¨te â nom + raisonnement requis',xpGain:0});return;}
  const{data}=await sb.from('weekly_mysteries').select('culprit,keywords,explanation').eq('week_start',ws).single();
  if(!data)return;
  const nameOk=data.culprit.toLowerCase().includes(suspect.toLowerCase())||suspect.toLowerCase().includes(data.culprit.split(' ').pop().toLowerCase());
  const kwHits=data.keywords.filter(kw=>reason.toLowerCase().includes(kw.toLowerCase()));
  const ok=nameOk&&kwHits.length>=2;
  localStorage.setItem('mys_v_'+ws,JSON.stringify({ok,suspect,reason,at:Date.now()}));
  if(ok){showSystemNotif({title:'EnquÃªte rÃ©solueÂ !',xpGain:50});if(typeof addXP==='function')addXP(50);}
  const mw=document.getElementById('hub-mystery-wrap');
  if(mw)buildWeeklyMystery(mw);
}

async function answerChallenge(challengeId,answer,correct_answer){
  if(!state.currentUser){showToast('â ï¸ Connecte-toi pour jouer !');return;}
  const correct=(answer===correct_answer);
  const{error}=await sb.from('challenge_responses').upsert({user_id:currentUser.id,challenge_id:challengeId,answer,correct},{onConflict:'user_id,challenge_id'});
  if(error){showToast('Erreur : '+error.message);return;}
  if(correct)showToast('ð Bonne rÃ©ponse !');else showToast('â RatÃ© ! Retente la semaine prochaine.');
  // Bingo: marquer "dÃ©fi communautaire fait"
  completeBingoCell(14);
  // Recharger le challenge pour afficher rÃ©sultats
  const el=document.querySelector('.challenge-card')?.parentElement;
  if(el)buildCommunityChallenge(el);
}

// ââ Bingo de l'Ã©tÃ© âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const BINGO_START=new Date('2026-06-21');
const BINGO_END  =new Date('2026-09-21T23:59:59');
const BINGO_CELLS=[
  {id:0, e:'ð', t:'Lis ta premiÃ¨re anecdote'},
  {id:1, e:'â­', t:'Fais un quiz Ã  100%'},
  {id:2, e:'ð', t:'Joue en Ligue'},
  {id:3, e:'ð¥', t:'Ajoute un ami'},
  {id:4, e:'ð', t:'Lis 5 anecdotes'},
  {id:5, e:'ð¬', t:'Commente une anecdote'},
  {id:6, e:'ð¬', t:'Lis une anecdote Science'},
  {id:7, e:'ðï¸', t:"Lis une anecdote Histoire"},
  {id:8, e:'ð¨', t:"Lis une anecdote Art"},
  {id:9, e:'ð¥', t:'3 jours de suite'},
  {id:10,e:'ð¤', t:"Partage une anecdote"},
  {id:11,e:'ðï¸', t:"Obtiens un badge"},
  {id:12,e:'ð', t:"Lis une anecdote Espace"},
  {id:13,e:'ð½ï¸', t:"Lis une anecdote Gastro"},
  {id:14,e:'ð¯', t:"Fais le dÃ©fi communautaire"},
  {id:15,e:'ð§ ', t:"Fais un quiz"},
  {id:16,e:'ð', t:"Lis 10 anecdotes"},
  {id:17,e:'â¡', t:"Lis une anecdote Sport"},
  {id:18,e:'â¨', t:"Case libre !", free:true},
  {id:19,e:'ð', t:"Note une anecdote"},
  {id:20,e:'ð¥', t:"7 jours de suite"},
  {id:21,e:'ð¤', t:"Lis une anecdote Insolite"},
  {id:22,e:'ð®', t:"Joue une partie privÃ©e"},
  {id:23,e:'ð', t:"Lis 20 anecdotes"},
  {id:24,e:'ð', t:"Lis 30 anecdotes"},
];

// state.bingoCompleted declared at top

function isEte(){const n=new Date();return n>=BINGO_START&&n<=BINGO_END;}

async function loadBingo(){
  if(!state.currentUser)return;
  // Case libre (18) toujours cochÃ©e
  completeBingoCell(18,false);
  const{data}=await sb.from('bingo_progress').select('cells').eq('user_id',currentUser.id).maybeSingle();
  if(data&&data.cells){data.cells.forEach(c=>bingoCompleted.add(c));}
  // Auto-check depuis les donnÃ©es
  await autocheckBingo();
  updateBingoFab();
}

async function autocheckBingo(){
  if(!state.currentUser)return;
  const[{data:reads},{data:qhist},{data:friends},{data:lgScores},{data:ratings},{data:themeReads}]=await Promise.all([
    sb.from('reads').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id),
    sb.from('quiz_history').select('pct').eq('user_id',currentUser.id),
    sb.from('friendships').select('id',{count:'exact',head:true}).or('requester_id.eq.'+currentUser.id+',addressee_id.eq.'+currentUser.id).eq('status','accepted'),
    sb.from('league_scores').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id),
    sb.from('ratings').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id),
    sb.from('reads').select('anecdotes(theme)').eq('user_id',currentUser.id).limit(200),
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
  const prev=bingoCompleted.size;
  Object.entries(checks).forEach(([id,ok])=>{if(ok)bingoCompleted.add(Number(id));});
  bingoCompleted.add(18); // case libre
  if(bingoCompleted.size!==prev)saveBingo();
}

function completeBingoCell(id,save=true){
  if(bingoCompleted.has(id))return;
  bingoCompleted.add(id);
  updateBingoFab();
  if(save)saveBingo();
  // Re-render grid if modal open
  if(document.getElementById('bingo-bd').classList.contains('on'))renderBingoGrid();
}

async function saveBingo(){
  if(!state.currentUser)return;
  const cells=[...bingoCompleted];
  await sb.from('bingo_progress').upsert({user_id:currentUser.id,cells,updated_at:new Date().toISOString()},{onConflict:'user_id'});
}

function updateBingoFab(){
  const n=bingoCompleted.size;
  const badge=document.getElementById('bingo-fab-badge');
  if(badge)badge.textContent=n+'/25';
  const prog=document.getElementById('bingo-prog-fill');
  if(prog)prog.style.width=(n/25*100)+'%';
  const ptxt=document.getElementById('bingo-prog-txt');
  if(ptxt)ptxt.textContent=n+' / 25 cases cochÃ©es';
}

function renderBingoGrid(){
  const grid=document.getElementById('bingo-grid');
  if(!grid)return;
  grid.innerHTML=BINGO_CELLS.map(c=>{
    const done=bingoCompleted.has(c.id);
    return '<div class="bingo-cell'+(done?' done':'')+(c.free?' free':'')+'">'+
      (done?'<div class="bingo-check">â</div>':'')+
      '<div class="bingo-cell-emoji">'+c.e+'</div>'+
      '<div class="bingo-cell-txt">'+c.t+'</div>'+
    '</div>';
  }).join('');
  updateBingoFab();
}

function openBingo(){
  if(!isEte()){showToast('ð Le bingo commence le 21 juin !');return;}
  renderBingoGrid();
  document.getElementById('bingo-bd').classList.add('on');
}
function closeBingo(){document.getElementById('bingo-bd').classList.remove('on');}

// ââ Community challenge ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
async function buildCommunityChallenge(el){
  if(!el)return;
  // Semaine en cours (lundi)
  const now=new Date();
  const dow=(now.getDay()+6)%7;
  const mon=new Date(now);mon.setDate(now.getDate()-dow);mon.setHours(0,0,0,0);
  const ws=mon.toISOString().slice(0,10);

  const{data:ch}=await sb.from('community_challenges').select('*').eq('week_start',ws).maybeSingle();
  if(!ch){el.innerHTML='<div class="empty"><span class="empty-ico">ð¯</span><p style="color:var(--ink3);font-size:.8rem">DÃ©fi de la semaine bientÃ´t disponible !</p></div>';return;}

  let userResp=null;
  if(state.currentUser){
    const{data:r}=await sb.from('challenge_responses').select('answer,correct').eq('user_id',currentUser.id).eq('challenge_id',ch.id).maybeSingle();
    userResp=r;
  }

  // Compter les rÃ©ponses globales
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
    bottomHtml='<div class="challenge-result"><span>'+(ok?'â':'â')+'</span><span>'+(ok?'Bonne rÃ©ponse ! Bien jouÃ© ð':'RatÃ© ! La bonne rÃ©ponse est <strong>'+opts[ch.answer]+'</strong>')+'</span></div>'+
      (ch.explanation?'<div class="challenge-expl">ð '+ch.explanation+'</div>':'')+
      '<div class="challenge-score-bar"><div class="challenge-score-fill" style="width:'+pctOk+'%"></div></div>'+
      '<div class="challenge-stats">'+nbOk+' / '+total+' joueurs ont trouvÃ© ('+pctOk+'%)</div>';
  }else if(!state.currentUser){
    bottomHtml='<div style="margin-top:.75rem;text-align:center"><button class="btn-main" style="font-size:.75rem;padding:.5rem 1.25rem" onclick="show(\'screen-login\')">Se connecter pour jouer</button></div>';
  }

  el.innerHTML='<div class="challenge-card">'+
    '<div class="challenge-week">'+ch.icon+' DÃ©fi de la semaine</div>'+
    '<div class="challenge-q">'+ch.question+'</div>'+
    '<div class="challenge-opts">'+optHtml+'</div>'+
    bottomHtml+'</div>';
}




// ââ XP pop animation âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
// DÃ©clencher au chargement si hash prÃ©sent (aprÃ¨s auth)
document.addEventListener('DOMContentLoaded',()=>setTimeout(_handleHashRouting,800));
// âââââââââââââââââââââââââââââââ
_handleHashRouting();
