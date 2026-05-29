import { state, sb, show, escHtml, fmt, today } from '../shared.js';
import { awardXP, popXP, checkAndAwardBadges } from './xp.js';
import { _sendNotif, subscribeNotifications } from './notifs.js';

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
  {id:7, e:'🏛️', t:"Lis une anecdote Histoire"},
  {id:8, e:'🎨', t:"Lis une anecdote Art"},
  {id:9, e:'🔥', t:'3 jours de suite'},
  {id:10,e:'📤', t:"Partage une anecdote"},
  {id:11,e:'🎖️', t:"Obtiens un badge"},
  {id:12,e:'🚀', t:"Lis une anecdote Espace"},
  {id:13,e:'🍽️', t:"Lis une anecdote Gastro"},
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

// bingoCompleted declared at top

export function goHome(){showHub();}

export async function buildWeeklyLeague(el){
  if(!el)return;
  if(!state.currentUser){el.innerHTML='<div class="empty"><span class="empty-ico">🏆</span><p>Connectez-vous pour voir le classement.</p></div>';return;}
  const now=new Date();
  const weekStart=new Date(now);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));weekStart.setHours(0,0,0,0);
  const ws=weekStart.toISOString().slice(0,10);

  // Top 20 global
  const{data:scores}=await sb.from('league_scores')
    .select('user_id,points,answers_correct,answers_wrong')
    .eq('week_start',ws)
    .order('points',{ascending:false})
    .limit(20);

  const top20=(scores||[]);
  const top20Ids=top20.map(s=>s.user_id);
  const myInTop=top20Ids.includes(state.currentUser.id);

  // Récupérer aussi le score du joueur si pas dans le top 20
  let myEntry=null;
  if(!myInTop){
    const{data:myScore}=await sb.from('league_scores').select('user_id,points,answers_correct,answers_wrong').eq('week_start',ws).eq('user_id',state.currentUser.id).maybeSingle();
    if(myScore)myEntry=myScore;
  }

  // Profils
  const allIds=[...new Set([...top20Ids,...(myEntry?[state.currentUser.id]:[])])];
  const{data:profiles}=allIds.length?await sb.from('profiles').select('id,username,avatar_url').in('id',allIds):{data:[]};
  const pMap={};const avMap={};(profiles||[]).forEach(p=>{pMap[p.id]=p.username;avMap[p.id]=p.avatar_url||'';});

  const sMap={};top20.forEach(s=>sMap[s.user_id]=s);
  if(myEntry)sMap[myEntry.user_id]=myEntry;

  // Rang du joueur si pas dans top 20
  let myRank=null;
  if(!myInTop&&myEntry){
    const{count}=await sb.from('league_scores').select('*',{count:'exact',head:true}).eq('week_start',ws).gt('points',myEntry.points);
    myRank=(count||0)+1;
  }

  const medals=['🥇','🥈','🥉'];
  function rowHtml(uid,rank,isMe){
    const s=sMap[uid]||{points:0,answers_correct:0,answers_wrong:0};
    const name=pMap[uid]||'Anonyme';
    const av=avMap[uid]||'';
    const correct=s.answers_correct||0,wrong=s.answers_wrong||0;
    const statsHtml=(correct||wrong)?'<div style="font-size:.55rem;color:var(--ink3)">✓'+correct+' ✗'+wrong+'</div>':'';
    const avHtml=av?'<img src="'+av+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>':name[0].toUpperCase();
    const extra=isMe?'':(' data-uid="'+uid+'" data-uname="'+escHtml(name)+'" style="cursor:pointer" onclick="viewUserProfile(this.dataset.uid,this.dataset.uname)"');
    return '<div class="league-row'+(isMe?' me':'')+'"'+extra+'>'+
      '<div class="league-rank">'+(medals[rank-1]||rank)+'</div>'+
      '<div class="league-av">'+avHtml+'</div>'+
      '<div class="league-name">'+name+(isMe?' (vous)':'')+'</div>'+
      '<div style="text-align:right"><div class="league-xp">'+s.points+' pts</div>'+statsHtml+'</div>'+
    '</div>';
  }

  let html='<div class="league-section-title">🏆 Classement semaine — Top 20</div>';
  if(!top20.length){
    html+='<div class="empty"><span class="empty-ico">🏃</span><p>Aucun joueur cette semaine. Lance une partie !</p></div>';
  }else{
    html+=top20.map((s,i)=>rowHtml(s.user_id,i+1,s.user_id===state.currentUser.id)).join('');
    if(!myInTop&&myEntry){
      html+='<div style="border-top:1px dashed var(--b2);margin:8px 0;padding-top:8px;font-size:.65rem;color:var(--ink3);text-align:center">Votre position</div>';
      html+=rowHtml(state.currentUser.id,myRank,true);
    }else if(!myInTop&&!myEntry){
      html+='<div style="border-top:1px dashed var(--b2);margin:8px 0;padding-top:8px;font-size:.65rem;color:var(--ink3);text-align:center">Vous n\'êtes pas encore classé cette semaine</div>';
    }
  }
  el.innerHTML=html;
}

export async function buildActivityFeed(el){
  if(!el||!state.currentUser)return;
  const{data:friendData}=await sb.from('friendships').select('requester_id,addressee_id').or('requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+state.currentUser.id).eq('status','accepted');
  const friendIds=(friendData||[]).map(f=>f.requester_id===state.currentUser.id?f.addressee_id:f.requester_id);
  if(!friendIds.length){el.innerHTML='<div class="league-section-title">📣 Activité des amis</div><div class="empty"><span class="empty-ico">👥</span><p>Ajoutez des amis pour voir leur activité.</p></div>';return;}
  const[{data:reads},{data:quizzes}]=await Promise.all([
    sb.from('reads').select('user_id,created_at').in('user_id',friendIds).order('created_at',{ascending:false}).limit(20),
    sb.from('quiz_history').select('user_id,created_at,pct').in('user_id',friendIds).order('created_at',{ascending:false}).limit(20)
  ]);
  const{data:profiles}=await sb.from('profiles').select('id,username,avatar_url').in('id',friendIds);
  const pMap={};const avMapC={};(profiles||[]).forEach(p=>{pMap[p.id]=p.username;avMapC[p.id]=p.avatar_url||'';});
  const now=new Date();
  function timeAgo(d){const s=Math.floor((now-d)/1000);if(s<60)return'il y a '+s+'s';if(s<3600)return'il y a '+Math.floor(s/60)+'min';if(s<86400)return'il y a '+Math.floor(s/3600)+'h';return'il y a '+Math.floor(s/86400)+'j';}
  const events=[
    ...(reads||[]).map(r=>({uid:r.user_id,type:'read',date:new Date(r.created_at),text:'a lu une anecdote'})),
    ...(quizzes||[]).map(q=>({uid:q.user_id,type:'quiz',date:new Date(q.created_at),text:'a obtenu '+q.pct+'% au quiz'}))
  ].sort((a,b)=>b.date-a.date).slice(0,15);
  if(!events.length){el.innerHTML='<div class="league-section-title">📣 Activité des amis</div><div class="empty"><span class="empty-ico">📫</span><p>Aucune activité récente.</p></div>';return;}
  el.innerHTML='<div class="league-section-title">📣 Activité des amis</div>'+
    events.map(ev=>'<div class="activity-item" style="cursor:pointer" onclick="viewUserProfile(\''+ev.uid+'\',\''+( pMap[ev.uid]||'Ami')+'\')">'+'<div class="activity-av">'+(avMapAct[ev.uid]?'<img src="'+avMapAct[ev.uid]+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>':(pMap[ev.uid]||'?')[0].toUpperCase())+'</div><div><div class="activity-text"><strong>'+(pMap[ev.uid]||'Ami')+'</strong> '+ev.text+'</div><div class="activity-time">'+timeAgo(ev.date)+'</div></div></div>').join('');
}

export async function checkFriendRequests(){
  if(!state.currentUser)return;
  const{data}=await sb.from('friendships')
    .select('id,requester_id,req:profiles!friendships_requester_id_fkey(username)')
    .eq('addressee_id',state.currentUser.id)
    .eq('status','pending');
  const count=(data||[]).length;
  const badge=document.getElementById('friend-req-badge');
  if(badge){
    badge.style.display=count>0?'flex':'none';
    badge.textContent=count>0?String(count):'';
  }
  return data||[];
}

export async function buildPendingRequests(el){
  const pending=await checkFriendRequests();
  if(!pending.length){el.innerHTML='';return;}
  el.innerHTML='<div class="pending-req-title">🔔 '+pending.length+' demande'+(pending.length>1?'s':'')+' d\'ami</div>'+
    pending.map(f=>{
      const uname=f.req?.username||'Utilisateur';
      return '<div class="pending-req-item">'+
        '<div class="pending-req-av">'+uname[0].toUpperCase()+'</div>'+
        '<div class="pending-req-name">'+uname+'</div>'+
        '<div class="pending-req-btns">'+
          '<button class="btn-accept-req" onclick="acceptFriend(\''+f.id+'\')">✓ Accepter</button>'+
          '<button class="btn-decline-req" onclick="declineFriend(\''+f.id+'\')">✕</button>'+
        '</div>'+
      '</div>';
    }).join('');
}

export async function declineFriend(fid){
  await sb.from('friendships').delete().eq('id',fid);
  showToast('Demande refusée.');
  checkFriendRequests();
  buildAmisTab();
}

export async function answerChallenge(challengeId,answer,correct_answer){
  if(!state.currentUser){showToast('⚠️ Connecte-toi pour jouer !');return;}
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

export function isEte(){const n=new Date();return n>=BINGO_START&&n<=BINGO_END;}

export async function loadBingo(){
  if(!state.currentUser)return;
  // Case libre (18) toujours cochée
  completeBingoCell(18,false);
  const{data}=await sb.from('bingo_progress').select('cells').eq('user_id',state.currentUser.id).maybeSingle();
  if(data&&data.cells){data.cells.forEach(c=>state.bingoCompleted.add(c));}
  // Auto-check depuis les données
  await autocheckBingo();
  updateBingoFab();
}

export async function autocheckBingo(){
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

export function completeBingoCell(id,save=true){
  if(state.bingoCompleted.has(id))return;
  state.bingoCompleted.add(id);
  updateBingoFab();
  if(save)saveBingo();
  // Re-render grid if modal open
  if(document.getElementById('bingo-bd').classList.contains('on'))renderBingoGrid();
}

export async function saveBingo(){
  if(!state.currentUser)return;
  const cells=[...bingoCompleted];
  await sb.from('bingo_progress').upsert({user_id:state.currentUser.id,cells,updated_at:new Date().toISOString()},{onConflict:'user_id'});
}

export function updateBingoFab(){
  const n=state.bingoCompleted.size;
  const badge=document.getElementById('bingo-fab-badge');
  if(badge)badge.textContent=n+'/25';
  const prog=document.getElementById('bingo-prog-fill');
  if(prog)prog.style.width=(n/25*100)+'%';
  const ptxt=document.getElementById('bingo-prog-txt');
  if(ptxt)ptxt.textContent=n+' / 25 cases cochées';
}

export function renderBingoGrid(){
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

export function openBingo(){
  if(!isEte()){showToast('🌞 Le bingo commence le 21 juin !');return;}
  renderBingoGrid();
  document.getElementById('bingo-bd').classList.add('on');
}

export function closeBingo(){document.getElementById('bingo-bd').classList.remove('on');}

export async function buildCommunityChallenge(el){
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

export async function showHub(){
  setRoute('hub');
  show('screen-hub');
  let readToday=false,enigmaToday=false,quizToday=false;
  let xp=state.currentUserXP||0;
  let rank=state.currentUserRank||RANKS[0];
  let nextRank=getNextRank(xp);

  if(state.currentUser){
    const[{data:rd},{data:en},{data:qz}]=await Promise.all([
      sb.from('reads').select('id').eq('user_id',state.currentUser.id).eq('date',today()).maybeSingle(),
      sb.from('enigma_responses').select('id').eq('user_id',state.currentUser.id).eq('date',today()).maybeSingle(),
      sb.from('quiz_history').select('id').eq('user_id',state.currentUser.id).eq('date',today()).maybeSingle(),
    ]);
    readToday=!!rd;enigmaToday=!!en;quizToday=!!qz;
    if(!state.currentUserXP&&state.currentUser){
      const[{data:allReads},{data:allQuiz},{data:allEnigma}]=await Promise.all([
        sb.from('reads').select('date').eq('user_id',state.currentUser.id),
        sb.from('quiz_history').select('pct').eq('user_id',state.currentUser.id),
        sb.from('enigma_responses').select('is_correct').eq('user_id',state.currentUser.id),
      ]);
      const streak=state.userStreak;
      xp=calcSLXP({reads:(allReads||[]).length,quizzes:allQuiz||[],enigmas:allEnigma||[],streak});
      state.currentUserXP=xp;state.currentUserRank=getRank(xp);rank=state.currentUserRank;nextRank=getNextRank(xp);
    }
  }

  const done=(readToday?1:0)+(enigmaToday?1:0)+(quizToday?1:0);
  const xpToNext=nextRank?nextRank.minXP:rank.minXP;
  const xpFrom=rank.minXP;
  const pctRank=nextRank?Math.round((xp-xpFrom)/(xpToNext-xpFrom)*100):100;
  const dateStr=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

  let hub=document.getElementById('screen-hub');
  if(!hub){
    hub=document.createElement('div');hub.id='screen-hub';hub.className='screen';
    const first=document.querySelector('.screen');
    if(first)first.parentNode.insertBefore(hub,first);else document.body.appendChild(hub);
  }

  const gateAnec={rank:'E',icon:'💡',name:'Le Saviez-Vous ?',desc:"L'anecdote surprenante du jour",xp:'+50 XP',done:readToday,action:"goAnec()"};
  const gateEnigma={rank:'B',icon:'🔐',name:'Crack le code !',desc:"Résous l'énigme du jour",xp:'+150 XP',done:enigmaToday,action:"goEnigme()"};
  const gateQuiz={rank:'C',icon:'🎯',name:'Quiz',desc:"Teste tes connaissances",xp:'+100 XP',done:quizToday,action:"renderPlayChoice();show('screen-play');updateNav('bn-play');"};

  function gateHTML(g){
    const rk=RANKS.find(r=>r.id===g.rank)||RANKS[0];
    return `<div class="sl-gate ${g.done?'sl-gate-done':''}" onclick="${g.action}" style="--gate-color:${rk.color};--gate-glow:${rk.glow};">
      <div class="sl-gate-header">
        <span class="sl-gate-rank" style="color:${rk.color};border-color:${rk.color};">${g.rank}-RANG</span>
        <span class="sl-gate-xp">${g.xp}</span>
      </div>
      <div class="sl-gate-body">
        <span class="sl-gate-icon">${g.icon}</span>
        <div class="sl-gate-info">
          <div class="sl-gate-name">${g.name}</div>
          <div class="sl-gate-desc">${g.desc}</div>
        </div>
      </div>
      <div class="sl-gate-action">
        ${g.done
          ? '<span class="sl-gate-done-badge">✓ COMPLÉTÉ</span>'
          : '<span class="sl-gate-enter">▶ ENTRER</span>'}
      </div>
    </div>`;
  }

  hub.innerHTML=`
<div class="sl-hub">

  <div class="sl-system-header">
    <div class="sl-system-label">⚡ THE SYSTEM</div>
    <div class="sl-system-date">${cap(dateStr)}</div>
  </div>

  
  <div class="sl-hub-cols">
    <div class="sl-hub-left">

      ${state.currentUser?`
      <div class="sl-hunter-card" style="--rank-color:${rank.color};--rank-glow:${rank.glow};--rank-bg:${rank.bg};">
        <div class="sl-hunter-top">
          <div class="sl-hunter-info">
            <div class="sl-hunter-label">CHASSEUR</div>
            <div class="sl-hunter-name">${state.currentUser.username}</div>
          </div>
          <div class="sl-rank-badge" style="color:${rank.color};border-color:${rank.color};box-shadow:${rank.glow};">
            <span class="sl-rank-id">${rank.label}</span>
            <span class="sl-rank-title">${rank.title}</span>
          </div>
        </div>
        <div class="sl-xp-section">
          <div class="sl-xp-row">
            <span class="sl-xp-label">XP TOTAL</span>
            <span class="sl-xp-val" style="color:${rank.color};">${xp.toLocaleString('fr-FR')}</span>
            ${nextRank?`<span class="sl-xp-next">/ ${nextRank.minXP.toLocaleString('fr-FR')} → ${nextRank.label}</span>`:'<span class="sl-xp-next">⭐ RANG MAXIMUM</span>'}
          </div>
          <div class="sl-xp-track">
            <div class="sl-xp-fill" style="width:${pctRank}%;background:${rank.color};box-shadow:0 0 8px ${rank.color}66;"></div>
          </div>
        </div>
        <div class="sl-hunter-streak">
          <span class="sl-streak-icon">🔥</span>
          <span>${state.userStreak} jour${state.userStreak!==1?'s':''} de streak</span>
          ${done===3?'<span class="sl-missions-done">⚡ Missions complètes !</span>':'<span class="sl-missions-left">'+(3-done)+' mission'+(3-done>1?'s':'')+' restante'+(3-done>1?'s':'')+'</span>'}
        </div>
        <button class="sl-stats-btn" onclick="showStatsWindow()">📊 Stats</button>
      </div>`:`
      <div class="sl-guest-card">
        <div class="sl-system-label">⚡ THE SYSTEM</div>
        <div style="font-size:.85rem;color:var(--ink3);margin-top:.5rem;">Connecte-toi pour rejoindre le Système.</div>
        <button class="sl-btn-primary" style="margin-top:1rem;" onclick="show('screen-login')">S'éveiller →</button>
      </div>`}

      <div class="sl-section-header sl-section-arena">
        <span class="sl-section-icon">⚔</span>
        <span>ARÈNE</span>
        <span class="sl-section-new">NOUVEAU</span>
      </div>
      <div class="sl-arena-section">
        <div class="sl-arena-gate" onclick="show1vs100Lobby()">
          <div class="sl-arena-gate-hd">
            <span class="sl-arena-tag">S-RANG</span>
            <span class="sl-arena-xp">+500 XP</span>
          </div>
                <div class="sl-arena-gate-bd">
            <span class="sl-arena-ico">⚡</span>
            <div>
              <div class="sl-arena-name">1 CONTRE 100</div>
              <div class="sl-arena-desc">Affronte 100 challengers. Reste le dernier debout.</div>
            </div>
          </div>
          <div class="sl-arena-enter">▶ ENTRER DANS L'ARÈNE</div>
        </div>
      </div>
      <div id="hub-mystery-wrap" style="margin-top:1rem;"></div>

               
    </div>
    <div class="sl-hub-right">

      <div class="sl-section-header">
        <span class="sl-section-icon">⚔</span>
        <span>QUÊTES JOURNALIÈRES</span>
        <span class="sl-section-count">${done}/3</span>
      </div>
      <div class="sl-gates">
        ${gateHTML(gateAnec)}
        ${gateHTML(gateEnigma)}
        ${gateHTML(gateQuiz)}
      </div>

      <div class="sl-section-header sl-section-locked">
        <span class="sl-section-icon">🔒</span>
        <span>PORTAILS FERMÉS</span>
        <span class="sl-section-count">BIENTÔT</span>
      </div>
      <div class="sl-locked-gates">
        ${[
          {rank:'S',icon:'🎙',name:'Mais dis moi ?'},
          {rank:'A',icon:'📅',name:'Éphéméride'},
          {rank:'S',icon:'💬',name:"T'as dit quoi ?!"},
        ].map(g=>{
          const rk=RANKS.find(r=>r.id===g.rank)||RANKS[5];
          return `<div class="sl-locked-gate">
            <span class="sl-locked-icon">${g.icon}</span>
            <span class="sl-locked-name">${g.name}</span>
            <span class="sl-locked-rank" style="color:${rk.color};">[${g.rank}-RANG]</span>
          </div>`;
        }).join('')}
      </div>



    </div>
  </div>

</div>`;

  show('screen-hub');updateNav('');
  setTimeout(()=>{const mw=document.getElementById('hub-mystery-wrap');if(mw)buildWeeklyMystery(mw);},200);
}
