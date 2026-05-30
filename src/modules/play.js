import { state, sb, show, escHtml, fmt, showToast, setBtn, today } from '../shared.js';
import { awardXP, popXP, checkAndAwardBadges, calcXP, calcLevel } from './xp.js';
import { _sendNotif } from './notifs.js';

const LEAGUE_DIFF={1:{label:'Facile',cls:'easy',correct:8,wrong:-25},2:{label:'Moyen',cls:'medium',correct:20,wrong:-12},3:{label:'Difficile',cls:'hard',correct:40,wrong:-5}};
const LEAGUE_Q_COUNT=10;
let _lgState=null;
let _playModsCache=null;


export function goPlay(){
  state.prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';
  updateNav('bn-play');
  renderPlayChoice();
  show('screen-multi');
}

export function goLigue(){
  state.prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';
  updateNav('bn-league');
  document.getElementById('multi-title-txt').innerHTML='<em>Ligue</em>';
  document.getElementById('multi-sub').textContent='';
  const backBtn=document.querySelector('#screen-multi .btn-back');
  if(backBtn)backBtn.style.display='none';
  show('screen-multi');
  buildLeagueDashboard();
}

export async function buildLeagueDashboard(){
  if(!state.currentUser){
    document.getElementById('multi-content').innerHTML='<div style="text-align:center;padding:2rem;"><p style="color:var(--ink3);margin-bottom:1rem;">Connecte-toi pour accÃ©der Ã  la ligue.</p><button class="btn-main" onclick="show(\'screen-login\')">Se connecter</button></div>';
    return;
  }
  document.getElementById('multi-content').innerHTML=
    '<div class="sl-section-header" style="margin-bottom:1rem;"><span class="sl-section-icon">â</span><span>LIGUE HEBDOMADAIRE</span></div>'+
    '<div style="display:flex;gap:.6rem;margin-bottom:1.25rem;">'+
    '<button class="sl-btn-primary" style="flex:1;" onclick="goLeaguePlay()">â¡ Jouer en Ligue</button>'+
    '<button class="btn-sec" style="flex:1;margin-top:0;" onclick="goMultiPlay()">ð® PrivÃ©e</button>'+
    '</div>'+
    '<div id="ldash-ranking" style="margin-bottom:1.5rem;"></div>'+
    '<div id="ldash-pending" style="margin-bottom:.5rem;"></div>'+
    '<div class="friend-search" style="margin-bottom:.75rem;"><input id="friend-q" placeholder="Rechercher un pseudoâ¦"/><button onclick="searchFriend()">Rechercher</button></div>'+
    '<div id="friend-results"></div>'+
    '<div style="margin-top:1rem;"><div class="sl-section-header" style="margin-bottom:.75rem;"><span class="sl-section-icon">ð¥</span><span>ALLIÃS</span></div><div id="friend-list-own"></div></div>';
  await buildWeeklyLeague(document.getElementById('ldash-ranking'));
  await buildPendingRequests(document.getElementById('ldash-pending'));
  await loadFriends();
}

export async function renderPlayChoice(){
  document.getElementById('multi-title-txt').innerHTML='<em>Jouer</em>';
  document.getElementById('multi-sub').textContent='';
  const backBtn=document.querySelector('#screen-multi .btn-back');
  if(backBtn)backBtn.style.display='block';
  document.getElementById('multi-content').innerHTML='<div style="text-align:center;padding:2rem;color:var(--ink3);">⏳</div>';

  if(!_playModsCache){
    try{const{data}=await sb.from('app_config').select('value').eq('key','play_modes').maybeSingle();
    if(data?.value)_playModsCache=JSON.parse(data.value);}catch(_){}
    if(!_playModsCache)_playModsCache=[];
  }

  const MODES=[
    {id:'solo',  rank:'C-RANG',rankColor:'#34d399',xp:'+100 XP', icon:'🎯', name:'SOLO',         desc:'Révise tes anecdotes — à ton rythme',      action:'goSoloPlay()',   color:'#34d399'},
    {id:'prive', rank:'B-RANG',rankColor:'#fbbf24',xp:'+150 XP', icon:'🎮', name:'PARTIE PRIVÉE', desc:'Défie tes amis en temps réel',             action:'goMultiPlay()', color:'#fbbf24'},
    {id:'duel',  rank:'A-RANG',rankColor:'#f97316',xp:'+200 XP', icon:'⚔️', name:'DUEL QUIZ',    desc:'Tour par tour — choisis le thème',          action:'showDuelLobby()',color:'#f97316'},
    {id:'vs100', rank:'S-RANG',rankColor:'#ef4444',xp:'+500 XP', icon:'⚡', name:'1 CONTRE 100', desc:'Affronte 100 challengers. Reste le dernier.', action:'show1vs100Lobby()',color:'#ef4444'},
    {id:'ligue', rank:'A-RANG',rankColor:'#a855f7',xp:'+300 XP', icon:'🏆', name:'LIGUE',        desc:'Classement hebdomadaire — grimpe les rangs',  action:'goLigue()',      color:'#a855f7'},
  ];

  const cfg=_playModsCache;
  const visible=MODES.filter(m=>{const c=cfg.find(x=>x.id===m.id);return !c||c.enabled!==false;});
  
  const cards=visible.map(m=>
    '<div class="play-gate" onclick="'+m.action+'" style="--gc:'+m.color+'">'+
      '<div class="play-gate-hd">'+
        '<div style="display:flex;align-items:center;gap:.4rem">'+
          '<span class="play-gate-rank" style="border-color:'+m.rankColor+';color:'+m.rankColor+'">'+m.rank+'</span>'+
          '<span class="play-gate-xp">'+m.xp+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="play-gate-bd">'+
        '<span class="play-gate-icon">'+m.icon+'</span>'+
        '<div>'+
          '<div class="play-gate-name">'+m.name+'</div>'+
          '<div class="play-gate-desc">'+m.desc+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="play-gate-enter">▶ ENTRER</div>'+
    '</div>'
  ).join('');

  document.getElementById('multi-content').innerHTML='<div class="play-gates-grid">'+cards+'</div>';
}

export async function goSoloPlay(){
  document.getElementById('multi-title-txt').innerHTML='<em>Quiz</em> Solo';
  document.getElementById('multi-sub').textContent='Chargement de tes anecdotesâ¦';
  document.getElementById('multi-content').innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--ink3);font-size:.8rem;">â³ Chargementâ¦</div>';

  if(!state.currentUser){
    // Pas connectÃ© â quiz du jour uniquement
    show('screen-anec');updateNav('bn-anec');
    setTimeout(()=>{const a=document.getElementById('quiz-solo-area');if(a)a.scrollIntoView({behavior:'smooth',block:'start'});},200);
    return;
  }

  const{data:reads}=await sb.from('reads').select('anecdote_id').eq('user_id',state.currentUser.id);
  const anecIds=(reads||[]).map(r=>r.anecdote_id);

  if(!anecIds.length){
    document.getElementById('multi-sub').textContent='';
    document.getElementById('multi-content').innerHTML='<div class="quiz-gate"><span class="quiz-gate-icon">ð</span><h3>Aucune anecdote lue</h3><p style="color:var(--ink3);font-size:.8rem;margin-top:.4rem;">Lis des anecdotes pour dÃ©bloquer le quiz de rÃ©vision !</p><button class="btn-main" style="margin-top:1rem;" onclick="goHome();updateNav(\'bn-anec\');">Lire maintenant</button></div>';
    return;
  }

  const[{data:questions},{data:anecData}]=await Promise.all([
    sb.from('questions').select('*').in('anecdote_id',anecIds),
    sb.from('anecdotes').select('id,theme,icon,anecdote').in('id',anecIds)
  ]);
  if(!questions||!questions.length){
    return;
  }
  window._soloAnecMap={};
  (anecData||[]).forEach(a=>{window._soloAnecMap[a.id]=a;});
  window._soloHistoryQs=questions;
  const total=questions.length;
  const opts=[5,10,20,total].filter((v,i,a)=>v<=total&&a.indexOf(v)===i);
  const btnHtml=opts.map(n=>'<button class="btn-q-count'+(n===Math.min(10,total)?' sel':'')+'" onclick="selectSoloCount(this,'+n+')">'+n+'</button>').join('');
  document.getElementById('multi-sub').textContent=anecIds.length+' anecdotes Â· '+total+' questions disponibles';
  document.getElementById('multi-content').innerHTML='<div class="quiz-gate"><span class="quiz-gate-icon">ð§ </span><h3>Quiz de rÃ©vision</h3><p>Combien de questions ?</p><div class="q-count-row" style="display:flex;gap:.5rem;justify-content:center;margin:.75rem 0;">'+btnHtml+'</div><button class="btn-quiz" onclick="startSoloHistoryQuiz()">Lancer le quiz</button></div>';
}

export function selectSoloCount(btn,n){document.querySelectorAll('#multi-content .btn-q-count').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');}

export function startSoloHistoryQuiz(){
  const allQs=window._soloHistoryQs||[];
  const selBtn=document.querySelector('#multi-content .btn-q-count.sel');
  const count=selBtn?parseInt(selBtn.textContent):Math.min(10,allQs.length);
  const qs=[...allQs].sort(()=>Math.random()-.5).slice(0,count);
  window._soloQuizState={questions:qs,idx:0,score:0,active:true};
  renderSoloQuizQ();
}

export function renderSoloQuizQ(){
  const{questions,idx}=window._soloQuizState,q=questions[idx],prog=Math.round(idx/questions.length*100),isVF=q.type==='vf';
  const opts=isVF?'<div class="q-opts q-vf">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerSoloQ('+i+')">'+o+'</button>').join('')+'</div>':'<div class="q-opts">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerSoloQ('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('')+'</div>';
  const _anec=window._soloAnecMap&&window._soloAnecMap[q.anecdote_id];

  document.getElementById('multi-content').innerHTML='<div class="q-block"><div class="q-header"><span class="q-prog-txt">Question '+(idx+1)+' / '+questions.length+'</span></div><div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div><div class="q-body"><span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span><div class="q-text">'+q.question+'</div>'+opts+'<div class="q-fb" id="q-fb-solo"></div><button class="btn-next" id="btn-next-solo" onclick="nextSoloQ()">â Suite</button></div></div>';
}

export function answerSoloQ(i){
  const q=window._soloQuizState.questions[window._soloQuizState.idx];
  const opts=document.querySelectorAll('#multi-content .q-opt');opts.forEach(b=>b.disabled=true);
  const ok=i===q.answer;if(ok)window._soloQuizState.score++;
  opts[i].classList.add(ok?'ok':'err');if(!ok&&q.answer<opts.length)opts[q.answer].classList.add('ok');
  const fb=document.getElementById('q-fb-solo');if(fb){fb.textContent=q.explanation||'';fb.className='q-fb on '+(ok?'ok':'err');}
  const btn=document.getElementById('btn-next-solo');if(btn)btn.classList.add('on');
}

export function nextSoloQ(){window._soloQuizState.idx++;if(window._soloQuizState.idx>=window._soloQuizState.questions.length)finishSoloHistoryQuiz();else renderSoloQuizQ();}

export async function finishSoloHistoryQuiz(){
  window._soloQuizState.active=false;
  const{score,questions}=window._soloQuizState;
  const pct=Math.round(score/questions.length*100);
  if(state.currentUser){try{await sb.from('quiz_history').insert({user_id:state.currentUser.id,anecdote_id:questions[0].anecdote_id,score,total:questions.length,pct,date:today()});}catch(_){}}
  const e=pct>=80?'ð':pct>=60?'â­':'ðª',t=pct>=80?'Excellent !':pct>=60?'Bien jouÃ© !':'Continue !',m=pct>=80?'Parfaite maÃ®trise !':pct>=60?'Solide ! Reviens demain.':'Chaque jour on apprend.';
  document.getElementById('multi-content').innerHTML='<div class="q-result"><span class="qr-emoji">'+e+'</span><span class="qr-score">'+pct+'%</span><div class="qr-title">'+t+'</div><div class="qr-msg">'+m+'</div><div style=\"display:flex;gap:.6rem;margin-top:1.25rem;justify-content:center;\"><button class=\"btn-sec\" onclick=\"goHome();updateNav(&apos;bn-anec&apos;)\">â Accueil</button><button class=\"btn-main\" onclick=\"goSoloPlay()\">Rejouer</button></div></div>';
}

export function goMultiPlay(){if(typeof completeBingoCell==='function'){localStorage.setItem('bingo_multi','1');completeBingoCell(22);}
  if(!state.currentUser){showToast('â  Connecte-toi pour jouer en multijoueur !');show('screen-login');return;}
  document.getElementById('multi-title-txt').innerHTML='<em>Quiz</em> Multijoueur';
  document.getElementById('multi-sub').textContent='CrÃ©ez une salle ou rejoignez-en une avec un code.';
  renderMultiLobbyChoice();
}

export function goMulti(){goPlay();}

export function renderMultiLobbyChoice(){
  document.getElementById('multi-content').innerHTML=
    '<div class="multi-grid">'+
    '<div class="multi-card" onclick="showCreateForm()"><span class="multi-card-icon">ð®</span><div class="multi-card-title">CrÃ©er une salle</div><div class="multi-card-desc">HÃ©bergez une partie et invitez vos amis avec un code Ã  4 chiffres.</div></div>'+
    '<div class="multi-card" onclick="showJoinForm()"><span class="multi-card-icon">ð</span><div class="multi-card-title">Rejoindre</div><div class="multi-card-desc">Entrez le code donnÃ© par l\'hÃ´te pour rejoindre sa partie.</div></div>'+
    '</div>';
}

export function showCreateForm(){
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:340px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div style="font-size:.56rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--a);margin-bottom:.2rem;">Partie privÃ©e</div>'+
    '<div style="font-family:\'DM Serif Display\',serif;font-size:1.5rem;font-style:italic;color:var(--ink);margin-bottom:1.1rem;">Combien de questions ?</div>'+
    '<div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">'+
    [5,8,10,15,20].map(n=>'<button class="btn-q-count'+(n===10?' sel':'')+'" onclick="selectRoomCount(this,'+n+')">'+n+'</button>').join('')+
    '</div>'+
    '</div>'+
    '<button class="btn-main" onclick="createRoom()">CrÃ©er la salle â</button>'+
    '<div style="text-align:center;margin-top:.9rem;"><a style="color:var(--ink3);cursor:pointer;font-size:.74rem;" onclick="renderMultiLobbyChoice()">â Retour</a></div>'+
    '</div>';
}

export function selectRoomCount(btn,n){document.querySelectorAll('#multi-content .btn-q-count').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');}

export function showJoinForm(){
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:320px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div style="font-size:.56rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--a);margin-bottom:.2rem;">Rejoindre une salle</div>'+
    '<div style="font-family:\'DM Serif Display\',serif;font-size:1.5rem;font-style:italic;color:var(--ink);margin-bottom:1rem;">Entre le code</div>'+
    '<input class="room-code-input" id="join-code" placeholder="0000" maxlength="4" style="border-radius:.5rem;margin-bottom:0;" oninput="this.value=this.value.replace(/\\D/g,\'\')"/>'+
    '</div>'+
    '<button class="btn-main" onclick="joinRoom()">Rejoindre la salle â</button>'+
    '<div style="text-align:center;margin-top:.9rem;"><a style="color:var(--ink3);cursor:pointer;font-size:.74rem;" onclick="renderMultiLobbyChoice()">â Retour</a></div>'+
    '</div>';
}

export async function createRoom(){
  if(!state.currentUser){showToast('â  Connexion requise.');return;}
  const code=String(Math.floor(1000+Math.random()*9000));
  const selQBtn=document.querySelector('#multi-content .btn-q-count.sel');const qCount=selQBtn?parseInt(selQBtn.textContent):10;
  const{data:allQs,error:qErr}=await sb.from('questions').select('*').limit(500);
  if(qErr||!allQs||!allQs.length){showToast('â  Impossible de charger les questions.');return;}
  const questions=[...allQs].sort(()=>Math.random()-.5).slice(0,Math.min(allQs.length,qCount));
  const insertData={code,host_id:state.currentUser.id,status:'waiting',questions};
  if(state.todayAnec)insertData.anecdote_id=state.todayAnec.id;
  const{data:session,error}=await sb.from('quiz_sessions').insert(insertData).select().single();
  if(error){showToast('â  Erreur: '+error.message);return;}
  await sb.from('quiz_participants').insert({session_id:session.id,user_id:state.currentUser.id,username:state.currentUser.username,score:0});
  state.multiState={session,questions:session.questions,qIdx:0,score:0,answered:false,isHost:true};
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:340px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div class="lobby-code-lbl">Code de la salle</div>'+
    '<div class="lobby-code">'+code+'</div>'+
    '<button onclick="navigator.clipboard.writeText(\''+code+'\').then(()=>showToast(\'â Code copiÃ© !\'))" style="margin-top:.65rem;padding:.32rem 1.1rem;border-radius:.5rem;border:1px solid var(--a);background:var(--adim);color:var(--a);font-family:inherit;font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;cursor:pointer;">ð Copier le code</button>'+
    '</div>'+
    '<div id="multi-scores" style="margin-top:.5rem;"></div>'+
    '<button class="btn-main" style="margin-top:1rem;" onclick="startMultiGame()">ð® Lancer la partie</button>'+
    '</div>';
  document.getElementById('multi-sub').textContent='En attente de joueurs...';
  state.multiChannel=sb.channel('room:'+code)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'quiz_participants',filter:'session_id=eq.'+session.id},()=>loadMultiScores())
    .on('broadcast',{event:'game_start'},(p)=>startMultiClient(p.payload))
    .on('broadcast',{event:'player_ready'},(p)=>{state.multiState.readyPlayers=state.multiState.readyPlayers||new Set();state.multiState.readyPlayers.add(p.payload?.userId);checkMultiAllReady(p.payload?.qIdx);})
    .on('broadcast',{event:'game_end'},()=>showMultiScoreboard())
    .subscribe();
  loadMultiScores();
}

export async function joinRoom(){
  const code=document.getElementById('join-code')?.value?.trim();
  if(!code||code.length!==4){showToast('â  Code invalide');return;}
  const{data:session,error}=await sb.from('quiz_sessions').select('*').eq('code',code).eq('status','waiting').maybeSingle();
  if(error||!session){showToast('â  Salle introuvable ou partie dÃ©jÃ  commencÃ©e');return;}
  const{error:e2}=await sb.from('quiz_participants').insert({session_id:session.id,user_id:state.currentUser.id,username:state.currentUser.username,score:0});
  if(e2&&!e2.message.includes('duplicate')){showToast('â  '+e2.message);return;}
  state.multiState={session,questions:session.questions,qIdx:0,score:0,answered:false,isHost:false};
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:340px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div class="lobby-code-lbl">Rejoint la salle</div>'+
    '<div class="lobby-code">'+code+'</div>'+
    '</div>'+
    '<div id="multi-scores" style="margin-top:.5rem;"></div>'+
    '<div style="text-align:center;margin-top:1rem;padding:.85rem;border-radius:.75rem;background:var(--adim);border:1px solid var(--b1);">'+
    '<div style="width:7px;height:7px;border-radius:50%;background:var(--a);margin:0 auto .5rem;box-shadow:0 0 8px var(--aglow);animation:pulse-c 1.4s ease-in-out infinite;"></div>'+
    '<div style="font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--a);">En attente du lancementâ¦</div>'+
    '</div>'+
    '</div>';
  document.getElementById('multi-sub').textContent="En attente de l'hÃ´teâ¦";
  state.multiChannel=sb.channel('room:'+code)
    .on('broadcast',{event:'game_start'},(p)=>startMultiClient(p.payload))
    .on('broadcast',{event:'player_ready'},(p)=>{state.multiState.readyPlayers=state.multiState.readyPlayers||new Set();state.multiState.readyPlayers.add(p.payload?.userId);checkMultiAllReady(p.payload?.qIdx);})
    .on('broadcast',{event:'game_end'},()=>showMultiScoreboard())
    .subscribe();
  loadMultiScores();
}

export async function startMultiGame(){
  const questions=state.multiState.questions;
  const{data:parts}=await sb.from('quiz_participants').select('user_id').eq('session_id',state.multiState.session.id);
  const totalPlayers=Math.max(1,(parts||[]).length);
  state.multiState.totalPlayers=totalPlayers;
  await sb.from('quiz_sessions').update({status:'playing'}).eq('id',state.multiState.session.id);
  await state.multiChannel.send({type:'broadcast',event:'game_start',payload:{questions,totalPlayers}});
  startMultiClient();
}

export function startMultiClient(data){
  if(data){
    if(Array.isArray(data)){if(data.length)state.multiState.questions=data;}
    else{if(data.questions&&data.questions.length)state.multiState.questions=data.questions;if(data.totalPlayers)state.multiState.totalPlayers=data.totalPlayers;}
  }
  state.multiState.readyPlayers=new Set();
  renderMultiQ(0);
}

export function renderMultiQ(idx){
  if(!state.multiState||!state.multiState.questions||idx>=state.multiState.questions.length){showMultiScoreboard();return;}
  state.multiState.qIdx=idx;state.multiState.answered=false;
  const q=state.multiState.questions[idx],prog=Math.round(idx/state.multiState.questions.length*100),isVF=q.type==='vf';
  const opts=isVF?'<div class="q-opts q-vf">'+q.options.map((o,i)=>'<button class="q-opt" id="mopt-'+i+'" onclick="submitMultiAnswer('+i+')">'+o+'</button>').join('')+'</div>':'<div class="q-opts">'+q.options.map((o,i)=>'<button class="q-opt" id="mopt-'+i+'" onclick="submitMultiAnswer('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('')+'</div>';
  document.getElementById('multi-content').innerHTML='<div class="q-block"><div class="q-header"><span class="q-prog-txt">Question '+(idx+1)+' / '+state.multiState.questions.length+'</span></div><div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div><div class="q-body"><span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span><div class="q-text">'+q.question+'</div>'+opts+'<div class="q-fb" id="q-fb-multi"></div><div id="multi-scores"></div><div id="multi-next-btn"></div></div></div>';
  loadMultiScores();
}

export async function submitMultiAnswer(i){
  if(state.multiState.answered)return;state.multiState.answered=true;
  const q=state.multiState.questions[state.multiState.qIdx];
  document.querySelectorAll('.q-opt').forEach(b=>b.disabled=true);
  const ok=i===q.answer;if(ok)state.multiState.score++;
  document.getElementById('mopt-'+i)?.classList.add(ok?'ok':'err');
  if(!ok)document.getElementById('mopt-'+q.answer)?.classList.add('ok');
  const fb=document.getElementById('q-fb-multi');if(fb){fb.textContent=q.explanation||'';fb.className='q-fb on '+(ok?'ok':'err');}
  await sb.from('quiz_participants').update({score:state.multiState.score}).eq('session_id',state.multiState.session.id).eq('user_id',state.currentUser.id);
  const nextDiv=document.getElementById('multi-next-btn');
  if(nextDiv)nextDiv.innerHTML='<button class="btn-main" style="margin-top:1rem;" onclick="readyForNextMulti()">Question suivante â</button>';
  setTimeout(loadMultiScores,500);
}

export async function readyForNextMulti(){
  const qIdx=state.multiState.qIdx;
  const nextDiv=document.getElementById('multi-next-btn');
  if(nextDiv)nextDiv.innerHTML='<div style="text-align:center;padding:.65rem;font-size:.72rem;color:var(--ink3);margin-top:.75rem;background:var(--adim);border-radius:.5rem;">â³ En attente des autres joueursâ¦</div>';
  state.multiState.readyPlayers=state.multiState.readyPlayers||new Set();
  state.multiState.readyPlayers.add(state.currentUser.id);
  await state.multiChannel.send({type:'broadcast',event:'player_ready',payload:{userId:state.currentUser.id,qIdx}});
  checkMultiAllReady(qIdx);
}

export async function checkMultiAllReady(qIdx){
  if(qIdx!==state.multiState.qIdx)return;
  const total=state.multiState.totalPlayers||1;
  const ready=(state.multiState.readyPlayers||new Set()).size;
  if(ready<total)return;
  state.multiState.readyPlayers=new Set();
  const next=qIdx+1;
  if(next>=state.multiState.questions.length){
    if(state.multiState.isHost){
      await sb.from('quiz_sessions').update({status:'done'}).eq('id',state.multiState.session.id);
      await state.multiChannel.send({type:'broadcast',event:'game_end',payload:{}});
    }
    showMultiScoreboard();
  }else{
    renderMultiQ(next);
  }
}

export async function showMultiScoreboard(){
  const{data:players}=await sb.from('quiz_participants').select('*').eq('session_id',state.multiState.session.id).order('score',{ascending:false});
  const medals=['ð¥','ð¥','ð¥'];
  const rows=(players||[]).map((p,i)=>'<div class="score-row"><div class="score-pos '+(i===0?'gold':'')+'">'+( medals[i]||('#'+(i+1)))+'</div><div class="score-name">'+p.username+'</div><div class="score-val">'+p.score+'pts</div></div>').join('');
  document.getElementById('multi-content').innerHTML='<div class="q-result"><span class="qr-emoji">ð</span><div class="qr-title">Partie terminÃ©e !</div><div class="qr-msg">Classement final</div></div><div class="scores-board">'+rows+'</div><button class="btn-main" style="margin-top:1.25rem;" onclick="renderMultiLobbyChoice()">Nouvelle partie</button>';
}

export async function loadMultiScores(){
  const el=document.getElementById('multi-scores');if(!el)return;
  const{data:players}=await sb.from('quiz_participants').select('*').eq('session_id',state.multiState.session.id).order('score',{ascending:false});
  if(!players||players.length<=1){el.innerHTML='';return;}
  el.innerHTML='<div style="font-size:.56rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-bottom:.4rem;">Scores en direct</div><div class="scores-board">'+players.map((p,i)=>'<div class="score-row"><div class="score-pos '+(i===0?'gold':'')+'">'+String(i+1).padStart(2,'0')+'</div><div class="score-name">'+p.username+'</div><div class="score-val">'+p.score+'</div></div>').join('')+'</div>';
}

export function leaveMulti(){if(state.multiChannel)state.multiChannel.unsubscribe();state.multiState=null;state.multiChannel=null;renderPlayChoice();}

export async function goLeaguePlay(){
  if(!state.currentUser){showToast('\u26a0 Connecte-toi pour jouer en ligue !');show('screen-login');return;}
  document.getElementById('multi-title-txt').innerHTML='<em>Mode</em> Ligue';
  document.getElementById('multi-sub').textContent='Chargement des questions\u2026';
  document.getElementById('multi-content').innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--ink3);font-size:.8rem;">\u23f3 Chargement\u2026</div>';
  const{data:qs,error}=await sb.from('questions').select('*').order('id');
  if(!qs||!qs.length){document.getElementById('multi-content').innerHTML='<div class="quiz-gate"><span class="quiz-gate-icon">\ud83d\ude34</span><h3>Aucune question disponible</h3></div>';return;}
  const shuffled=[...qs].sort(()=>Math.random()-.5).slice(0,LEAGUE_Q_COUNT);
  const _lgAnecIds=[...new Set(shuffled.map(q=>q.anecdote_id))];
  const{data:_lgAnecData}=await sb.from('anecdotes').select('id,theme,icon,anecdote').in('id',_lgAnecIds);
  const _lgAnecMap={};
  (_lgAnecData||[]).forEach(a=>{_lgAnecMap[a.id]=a;});

  // Calculer les points actuels de la semaine
  const now=new Date();const weekStart=new Date(now);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));weekStart.setHours(0,0,0,0);
  const ws=weekStart.toISOString().slice(0,10);
  const{data:existing}=await sb.from('league_scores').select('points,answers_correct,answers_wrong').eq('user_id',state.currentUser.id).eq('week_start',ws).maybeSingle();

  _lgState={questions:shuffled,idx:0,sessionPts:0,sessionCorrect:0,sessionWrong:0,weekStart:ws,prevPts:existing?.points||0,prevCorrect:existing?.answers_correct||0,prevWrong:existing?.answers_wrong||0,streak:[],anecMap:_lgAnecMap};
  document.getElementById('multi-sub').textContent=shuffled.length+' questions \u00b7 semaine en cours';
  renderLeagueQ();
}

export function renderLeagueQ(){
  const s=_lgState,q=s.questions[s.idx],d=LEAGUE_DIFF[q.difficulty||2];
  const prog=Math.round(s.idx/s.questions.length*100);
  const isVF=q.type==='vf';
  const streakHtml=s.streak.map(r=>'<div class="league-streak-dot'+(r?'correct':'wrong')+'"></div>').join('');
  const optsHtml=isVF?
    q.options.map((o,i)=>'<button class="q-opt" onclick="answerLeagueQ('+i+')">'+o+'</button>').join(''):
    q.options.map((o,i)=>'<button class="q-opt" onclick="answerLeagueQ('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('');
  document.getElementById('multi-content').innerHTML=
    '<div class="league-mode-wrap">'+
    '<div class="league-score-display">'+
      '<div class="league-score-big">'+s.sessionPts+'<span style="font-size:1rem;opacity:.7"> pts</span></div>'+
      '<div class="league-score-sub">cette session &bull; total: '+(s.prevPts+s.sessionPts)+' pts</div>'+
    '</div>'+
    '<div style="text-align:center;margin-bottom:.75rem;">'+
      '<span class="league-diff-badge '+d.cls+'">'+d.label+'</span>'+
      '<div class="league-pts-preview">'+
        '<span class="league-pts-correct">+'+d.correct+' si correct</span>'+
        '<span style="color:var(--ink3);margin:0 .25rem">&nbsp;/&nbsp;</span>'+
        '<span class="league-pts-wrong">'+d.wrong+' si faux</span>'+
      '</div>'+
    '</div>'+
    '<div class="league-streak-bar" style="margin-bottom:.75rem;">'+streakHtml+'</div>'+
    '<div class="q-block">'+
      '<div class="q-header"><span class="q-prog-txt">Question '+(s.idx+1)+' / '+s.questions.length+'</span></div>'+
      '<div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div>'+
      '<div class="q-body">'+
        '<span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span>'+
        '<div class="q-text">'+q.question+'</div>'+
        '<div class="q-opts'+(isVF?' q-vf':'')+'">'+optsHtml+'</div>'+
        '<div class="q-fb" id="q-fb-league"></div>'+
        '<button class="btn-next" id="btn-next-league" onclick="nextLeagueQ()">\u2192 Suite</button>'+
      '</div>'+
    '</div>'+
    '</div>';
}

export function answerLeagueQ(i){
  const s=_lgState,q=s.questions[s.idx],d=LEAGUE_DIFF[q.difficulty||2];
  const opts=document.querySelectorAll('#multi-content .q-opt');opts.forEach(b=>b.disabled=true);
  const ok=i===q.answer;
  const delta=ok?d.correct:d.wrong;
  s.sessionPts+=delta;
  if(ok)s.sessionCorrect++;else s.sessionWrong++;
  s.streak.push(ok);
  opts[i].classList.add(ok?'ok':'err');
  if(!ok&&q.answer<opts.length)opts[q.answer].classList.add('ok');
  const fb=document.getElementById('q-fb-league');
  if(fb){
    fb.className='q-fb on '+(ok?'ok':'err');
    fb.innerHTML=(ok?'<span style="font-size:.85rem">+'+d.correct+' pts</span>':'<span style="font-size:.85rem">'+d.wrong+' pts</span>')+
      (q.explanation?'<br><span style="font-size:.72rem;opacity:.85">'+q.explanation+'</span>':'');
  }
  const btn=document.getElementById('btn-next-league');if(btn)btn.classList.add('on');
}

export function nextLeagueQ(){
  _lgState.idx++;
  if(_lgState.idx>=_lgState.questions.length)finishLeague();
  else renderLeagueQ();
}

export async function finishLeague(){
  const s=_lgState;
  const newPts=Math.max(0,s.prevPts+s.sessionPts);
  const newCorrect=s.prevCorrect+s.sessionCorrect;
  const newWrong=s.prevWrong+s.sessionWrong;
  // Sauvegarder dans league_scores
  try{
    await sb.from('league_scores').upsert({
      user_id:state.currentUser.id,week_start:s.weekStart,
      points:newPts,answers_correct:newCorrect,answers_wrong:newWrong,
      updated_at:new Date().toISOString()
    },{onConflict:'user_id,week_start'});
  }catch(e){console.warn('league save err',e);}
  const gain=s.sessionPts>=0;
  const emoji=s.sessionCorrect>s.sessionWrong?'\ud83c\udfc6':s.sessionCorrect===s.sessionWrong?'\u2694\ufe0f':'\ud83d\udcaa';
  document.getElementById('multi-content').innerHTML=
    '<div class="league-end-card">'+
      '<div style="font-size:2rem;margin-bottom:.5rem;">'+emoji+'</div>'+
      '<div style="font-family:var(--serif);font-size:1.1rem;font-weight:700;margin-bottom:.25rem;">Session termin\u00e9e !</div>'+
      '<div class="league-end-score">'+(gain?'+':'')+s.sessionPts+' pts</div>'+
      '<div class="league-end-stats">'+
        '<div><div style="font-size:1.1rem;font-weight:700;color:var(--gr)">'+s.sessionCorrect+'</div><div>correct</div></div>'+
        '<div><div style="font-size:1.1rem;font-weight:700;color:var(--re)">'+s.sessionWrong+'</div><div>faux</div></div>'+
        '<div><div style="font-size:1.1rem;font-weight:700;color:var(--a)">'+newPts+'</div><div>total semaine</div></div>'+
      '</div>'+
      '<div style="font-size:.72rem;color:var(--ink3);margin-bottom:1rem;">Classement mis \u00e0 jour</div>'+
      '<button class="btn-main" style="margin-right:.5rem;" onclick="goLeaguePlay()">Rejouer</button>'+
      '<button class="btn-sec" onclick="renderPlayChoice()">Menu</button>'+
      '<button class="btn-sec" onclick="goHome();updateNav(\'bn-anec\')">ð  Accueil</button>'+
    '</div>';
  // Mettre Ã  jour le classement dans l'onglet social
  const leagueEl=document.getElementById('weekly-league-wrap');if(leagueEl)buildWeeklyLeague(leagueEl);
}
