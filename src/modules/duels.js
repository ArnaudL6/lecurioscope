import { state, sb, show, escHtml, showToast, setBtn, today } from '../shared.js';
import { awardXP, popXP, checkAndAwardBadges, getRank } from './xp.js';
import { _sendNotif } from './notifs.js';

let currentDuel=null,duelChannel=null;
const DUEL_THEMES=[
  {id:'histoire',label:'🏛️ Histoire'},{id:'science',label:'🔬 Science'},
  {id:'nature',label:'🌿 Nature'},{id:'insolite',label:'🤯 Insolite'},
  {id:'art',label:'🎨 Art'},{id:'espace',label:'🚀 Espace'},
  {id:'sport',label:'⚡ Sport'},{id:'gastro',label:'🍽️ Gastro'},
  {id:'legendes',label:'🔍 Légendes'},
];
// NOT FOUND: let _asyncRoundAnswers=

export function genDuelCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}

export function showJoinDuel(){
  const area=document.getElementById('duel-join-area');if(!area)return;
  area.innerHTML=`<div class="duel-join-input"><input id="duel-code-input" placeholder="ENTR\xc9E CODE" maxlength="6" oninput="this.value=this.value.toUpperCase()"/><button class="btn-main" onclick="joinDuelByCode()">Go !</button></div>`;
  setTimeout(()=>document.getElementById('duel-code-input')?.focus(),50);
}

export async function createDuel(){
  if(!state.currentUser)return;
  const code=genDuelCode();
  const{data,error}=await sb.from('duels').insert({code,challenger_id:state.currentUser.id,challenger_name:state.currentUser.username,status:'waiting',current_round:1,total_rounds:6,challenger_score:0,opponent_score:0,current_chooser_id:state.currentUser.id}).select().maybeSingle();
  if(error){showToast('Erreur : '+error.message);return;}
  if(!data){showToast('Erreur lors de la cr\u00e9ation du duel');return;}
  currentDuel=data;showDuelWaiting(data);
}

export function showDuelWaiting(duel){
  const el=document.getElementById('multi-content');
  if(!el)return;
  el.innerHTML=`<div class="duel-section"><div class="duel-code-box"><div style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px">Partage ce code \xe0 ton adversaire</div><div class="duel-code">${duel.code}</div><button class="btn-sec" style="margin-top:12px;font-size:.78rem" onclick="navigator.clipboard.writeText('${duel.code}').then(()=>showToast('✓ Code copi\xe9 !'))">📋 Copier le code</button></div><div class="duel-waiting"><div class="spinner"></div><div>En attente de ton adversaire…</div></div><button class="btn-sec" style="width:100%;margin-top:8px" onclick="cancelDuel('${duel.id}')">Annuler</button></div>`;
  subscribeToDuel(duel.id);
}

export async function cancelDuel(duelId){
  await sb.from('duels').update({status:'cancelled'}).eq('id',duelId);
  if(duelChannel){duelChannel.unsubscribe();duelChannel=null;}
  currentDuel=null;showDuelLobby();
}

export async function joinDuelByCode(){
  const code=document.getElementById('duel-code-input')?.value?.trim().toUpperCase();
  if(!code||code.length<6){showToast('Entre un code valide (6 caract\xe8res)');return;}
  if(!state.currentUser){showToast('Connecte-toi !');return;}
  const{data:duel,error}=await sb.from('duels').select('*').eq('code',code).eq('status','waiting').maybeSingle();
  if(error||!duel){showToast('Code introuvable ou duel d\xe9j\xe0 commenc\xe9');return;}
  if(duel.challenger_id===state.currentUser.id){showToast('Tu ne peux pas rejoindre ton propre duel !');return;}
  const{error:e2}=await sb.from('duels').update({opponent_id:state.currentUser.id,opponent_name:state.currentUser.username,status:'active'}).eq('id',duel.id);
  if(e2){showToast('Erreur : '+e2.message);return;}
  const{data:updated,error:e3}=await sb.from('duels').select('*').eq('id',duel.id).maybeSingle();
  if(e3||!updated){showToast('Impossible de rejoindre ce duel');return;}
  currentDuel=updated;subscribeToDuel(updated.id);renderDuelGame(updated);
}

export async function resumeDuel(duelId){
  const{data:duel}=await sb.from('duels').select('*').eq('id',duelId).maybeSingle();
  if(!duel)return;currentDuel=duel;subscribeToDuel(duelId);renderDuelGame(duel);
}

export function subscribeToDuel(duelId){
  if(duelChannel){duelChannel.unsubscribe();}
  duelChannel=sb.channel('duel-'+duelId)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'duels',filter:'id=eq.'+duelId},p=>{currentDuel=p.new;renderDuelGame(p.new);})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'duel_rounds',filter:'duel_id=eq.'+duelId},p=>{renderDuelRound(p.new);})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'duel_rounds',filter:'duel_id=eq.'+duelId},p=>{renderDuelRound(p.new);})
    .subscribe();
}

export async function renderDuelGame(duel){
  const el=document.getElementById('multi-content');if(!el)return;
  if(duel.status==='waiting'){showDuelWaiting(duel);return;}
  if(duel.status==='completed'){renderDuelResult(duel);return;}
  const ic=duel.challenger_id===state.currentUser.id;
  const myName=ic?duel.challenger_name:duel.opponent_name;
  const oppName=ic?(duel.opponent_name||'?'):duel.challenger_name;
  const myS=ic?duel.challenger_score:duel.opponent_score;
  const opS=ic?duel.opponent_score:duel.challenger_score;
  const isMyTurn=duel.current_chooser_id===state.currentUser.id;
  el.innerHTML=`<div class="duel-section"><div class="duel-round-info">Ronde ${duel.current_round} / ${duel.total_rounds}</div><div class="duel-players"><div class="duel-player${ic?' active':''}"><div class="duel-player-name">${myName}</div><div class="duel-player-score">${myS}</div></div><div class="duel-vs">⚔️</div><div class="duel-player${!ic?' active':''}"><div class="duel-player-name">${oppName}</div><div class="duel-player-score">${opS}</div></div></div><div id="duel-round-content"></div></div>`;
  const{data:round}=await sb.from('duel_rounds').select('*').eq('duel_id',duel.id).eq('round_number',duel.current_round).maybeSingle();
  if(!round){
    if(isMyTurn)showThemePicker(duel.id,duel.current_round);
    else document.getElementById('duel-round-content').innerHTML=`<div class="duel-waiting"><div class="spinner"></div><div>${oppName} choisit un th\xe8me…</div></div>`;
  }else{renderDuelRound(round);}
}

export function showThemePicker(duelId,roundNumber){
  const el=document.getElementById('duel-round-content');if(!el)return;
  el.innerHTML=`<div style="text-align:center;font-weight:700;font-size:.85rem;margin-bottom:12px">C'est ton tour ! Choisis un th\xe8me :</div><div class="duel-theme-grid">${DUEL_THEMES.map(t=>`<button class="duel-theme-btn" onclick="pickDuelTheme('${duelId}',${roundNumber},'${t.id}')">${t.label}</button>`).join('')}</div>`;
}

export async function pickDuelTheme(duelId,roundNumber,theme){
  // Désactiver tous les boutons immédiatement pour éviter double-clic
  document.querySelectorAll('.duel-theme-btn').forEach(b=>{b.disabled=true;b.style.opacity='.5';});
  // Vérifier si ce round existe déjà (double appel possible)
  const{data:existing}=await sb.from('duel_rounds').select('id').eq('duel_id',duelId).eq('round_number',roundNumber).maybeSingle();
  if(existing)return;
  const{data:anecs}=await sb.from('anecdotes').select('id').eq('theme',theme).limit(50);
  const anecPool=(anecs&&anecs.length)?anecs:(await sb.from('anecdotes').select('id').limit(100)).data||[];
  if(!anecPool.length){showToast('Pas encore de questions disponibles !');return;}
  const{data:usedR}=await sb.from('duel_rounds').select('anecdote_id').eq('duel_id',duelId);
  const usedIds=new Set((usedR||[]).map(r=>r.anecdote_id));
  const avail=anecPool.filter(a=>!usedIds.has(a.id));
  const pool=avail.length?avail:anecPool;
  const anecId=pool[Math.floor(Math.random()*pool.length)].id;
  const{data:qs}=await sb.from('questions').select('*').eq('anecdote_id',anecId);
  if(!qs||!qs.length){showToast('Pas de question pour cette anecdote');return;}
  const q=qs[Math.floor(Math.random()*qs.length)];
  const{error}=await sb.from('duel_rounds').insert({duel_id:duelId,round_number:roundNumber,chooser_id:state.currentUser.id,theme,anecdote_id:anecId,question:{type:q.type,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation},status:'answering'});
  if(error)showToast('Erreur : '+error.message);
}

export function renderDuelRound(round){
  const el=document.getElementById('duel-round-content');if(!el||!round)return;
  const ic=currentDuel?currentDuel.challenger_id===state.currentUser.id:false;
  const myField=ic?'challenger_answer':'opponent_answer';
  const myAnswer=round[myField];
  const hasAnswered=myAnswer!==null&&myAnswer!==undefined;
  const q=round.question;if(!q)return;
  const opts=q.options||[];
  const corrAns=q.answer;
  if(round.status==='completed'){
    const cA=round.challenger_answer,oA=round.opponent_answer;
    const cN=currentDuel.challenger_name,oN=currentDuel.opponent_name;
    const ic2=currentDuel?currentDuel.challenger_id===state.currentUser.id:false;
    const myReadyField2=ic2?'challenger_ready':'opponent_ready';
    const myReady2=round[myReadyField2]||false;
    el.innerHTML=
      `<div style="margin-bottom:10px"><div style="font-size:.82rem;font-weight:700;margin-bottom:8px">🎯 ${q.question}</div>`+
      opts.map((o,i)=>`<div style="padding:8px 12px;border-radius:8px;border:1.5px solid ${i===corrAns?'#22c55e':'var(--b2)'};background:${i===corrAns?'rgba(34,197,94,.1)':'var(--s2)'};font-size:.78rem;margin:3px 0">${i===corrAns?'✅ ':''}${o}</div>`).join('')+
      `</div>`+
      `<div class="duel-result-row"><span class="duel-result-icon">${cA===corrAns?'✅':'❌'}</span><div class="duel-result-name">${cN}</div><div class="duel-result-ans">${opts[cA]||'?'}</div></div>`+
      `<div class="duel-result-row"><span class="duel-result-icon">${oA===corrAns?'✅':'❌'}</span><div class="duel-result-name">${oN}</div><div class="duel-result-ans">${opts[oA]||'?'}</div></div>`+
      (q.explanation?`<div style="font-size:.72rem;line-height:1.55;color:var(--ink3);padding:10px 12px;background:var(--s2);border-radius:10px;border-left:3px solid var(--a);margin:8px 0">💡 ${q.explanation}</div>`:'')+
      (myReady2
        ?`<div class="duel-waiting" style="padding:8px 0"><div class="spinner"></div><div>En attente de l'adversaire…</div></div>`
        :`<button class="btn-main" style="width:100%;margin-top:6px" onclick="readyForNext('${round.id}','${round.duel_id}')">Question suivante ➜</button>`);
    return;
  }
  if(hasAnswered){
    const isCorrect=myAnswer===corrAns;
    const icH=currentDuel?currentDuel.challenger_id===state.currentUser.id:false;
    const myReadyField=icH?'challenger_ready':'opponent_ready';
    const myReady=round[myReadyField]||false;
    el.innerHTML=`<div style="font-size:.85rem;font-weight:600;margin-bottom:10px">🎯 ${q.question}</div>`+
      opts.map((o,i)=>{
        let border='var(--b2)',bg='var(--s2)',op='.45';
        if(i===corrAns){border='#22c55e';bg='rgba(34,197,94,.12)';op='1';}
        else if(i===myAnswer&&i!==corrAns){border='#ef4444';bg='rgba(239,68,68,.10)';op='1';}
        else if(i===myAnswer){op='1';}
        return `<div style="padding:10px 12px;border-radius:10px;border:1.5px solid ${border};background:${bg};font-size:.8rem;margin:5px 0;opacity:${op}">${i===corrAns?'✅ ':i===myAnswer&&i!==corrAns?'❌ ':''}${o}</div>`;
      }).join('')+
      `<div style="font-size:.8rem;font-weight:700;margin:10px 0 4px;color:${isCorrect?'#22c55e':'#ef4444'}">${isCorrect?'✅ Bonne réponse !':'❌ Mauvaise réponse'}</div>`+
      (q.explanation?`<div style="font-size:.75rem;line-height:1.55;color:var(--ink3);padding:10px 12px;background:var(--s2);border-radius:10px;border-left:3px solid var(--a);margin-bottom:10px">💡 ${q.explanation}</div>`:'')+
      (myReady
        ?`<div class="duel-waiting" style="padding:8px 0"><div class="spinner"></div><div>En attente de l'adversaire…</div></div>`
        :`<button class="btn-main" style="width:100%;margin-top:6px" onclick="readyForNext('${round.id}','${round.duel_id}')">Question suivante ➜</button>`);
    return;
  }
  el.innerHTML=`<div style="font-size:.85rem;font-weight:600;margin-bottom:10px">🎯 ${q.question}</div>`+
    opts.map((o,i)=>`<button onclick="answerDuel('${round.id}','${round.duel_id}',${i})" style="display:block;width:100%;text-align:left;padding:11px 14px;border-radius:10px;border:1.5px solid var(--b2);background:var(--s2);font-size:.8rem;margin:5px 0;cursor:pointer;font-family:inherit;color:var(--ink);transition:.15s" onmouseover="this.style.borderColor='var(--a)'" onmouseout="this.style.borderColor='var(--b2)'">${o}</button>`).join('');
}

export async function answerDuel(roundId,duelId,answer){
  if(!currentDuel)return;
  const ic=currentDuel.challenger_id===state.currentUser.id;
  const field=ic?'challenger_answer':'opponent_answer';
  const corrField=ic?'challenger_correct':'opponent_correct';
  const{data:round}=await sb.from('duel_rounds').select('*').eq('id',roundId).maybeSingle();
  if(!round)return;
  const correct=answer===round.question.answer;
  const otherField=ic?'opponent_answer':'challenger_answer';
  const otherDone=round[otherField]!==null&&round[otherField]!==undefined;
  const upd={[field]:answer,[corrField]:correct};
  if(otherDone)upd.status='completed';
  await sb.from('duel_rounds').update(upd).eq('id',roundId);
  if(correct){
    const sField=ic?'challenger_score':'opponent_score';
    const cur=ic?currentDuel.challenger_score:currentDuel.opponent_score;
    await sb.from('duels').update({[sField]:cur+1}).eq('id',duelId);
  }
  // Pas d'avance auto — on attend que les deux cliquent "Question suivante"
}

export async function readyForNext(roundId,duelId){
  if(!currentDuel||!state.currentUser)return;
  const ic=currentDuel.challenger_id===state.currentUser.id;
  const myReadyField=ic?'challenger_ready':'opponent_ready';
  const otherReadyField=ic?'opponent_ready':'challenger_ready';
  await sb.from('duel_rounds').update({[myReadyField]:true}).eq('id',roundId);
  const{data:round}=await sb.from('duel_rounds').select('*').eq('id',roundId).maybeSingle();
  if(!round)return;
  if(round[otherReadyField]){
    const nextR=currentDuel.current_round+1;
    if(nextR>currentDuel.total_rounds){
      await sb.from('duels').update({status:'completed'}).eq('id',duelId);
    }else{
      const nextC=currentDuel.current_chooser_id===currentDuel.challenger_id?currentDuel.opponent_id:currentDuel.challenger_id;
      await sb.from('duels').update({current_round:nextR,current_chooser_id:nextC}).eq('id',duelId);
    }
  }
}

export async function showDuelLobby(){
  const el=document.getElementById('multi-content');if(!el)return;
  document.getElementById('multi-title-txt').innerHTML='<em>Duels</em>';
  document.getElementById('multi-sub').textContent='Tour par tour — 5 manches, 3 questions chacune.';
  if(!state.currentUser){
    el.innerHTML='<div class="duel-waiting"><p style="margin-bottom:16px">Connecte-toi pour jouer en duel !</p><button class="btn-main" onclick="show(\'screen-login\')">Se connecter</button></div>';
    return;
  }
  el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--ink3);font-size:.8rem;">⏳ Chargement…</div>';
  // Charger les duels actifs
  const{data:duels}=await sb.from('async_duels')
    .select('*').or('player_a.eq.'+state.currentUser.id+',player_b.eq.'+state.currentUser.id)
    .in('status',['pending','active']).order('updated_at',{ascending:false});
  const activeHtml=(duels&&duels.length)?
    '<div class="duel-active-label">Duels en cours</div>'+
    duels.map(d=>{
      const isA=d.player_a===state.currentUser.id;
      const oppName=isA?d.player_b_name:d.player_a_name;
      const myScore=isA?d.score_a:d.score_b;
      const opScore=isA?d.score_b:d.score_a;
      const myTurn=d.current_turn===state.currentUser.id;
      const statusTxt=d.status==='pending'?'⏳ En attente d\'adversaire':
        myTurn?'🎯 À ton tour !':'⏳ Tour de '+oppName;
      return '<div class="duel-async-item" onclick="openAsyncDuel(\''+d.id+'\')">'+
        '<div style="flex:1"><div class="duel-async-vs">vs '+(oppName||'Adversaire aléatoire')+'</div>'+
        '<div class="duel-async-status'+(myTurn?' my-turn':'')+'">'+statusTxt+' · Manche '+d.current_round+'/'+d.total_rounds+'</div></div>'+
        '<div class="duel-async-score">'+myScore+' – '+opScore+'</div>'+
      '</div>';
    }).join('')
  :'';
  el.innerHTML='<div class="duel-async-lobby">'+
    '<div class="duel-async-actions">'+
      '<button class="btn-main" onclick="showChallengeFriend()">⚔️ Défier un ami</button>'+
      '<button class="btn-sec" onclick="joinRandomDuel()">🎲 Adversaire aléatoire</button>'+
    '</div>'+
    (activeHtml?'<div class="duel-active-list">'+activeHtml+'</div>':'<div style="text-align:center;padding:1.5rem 1rem;color:var(--ink3);font-size:.8rem;">Aucun duel en cours. Lance-toi !</div>')+
  '</div>';
}

export async function showChallengeFriend(){
  const el=document.getElementById('multi-content');if(!el)return;
  document.getElementById('multi-title-txt').innerHTML='<em>Défier</em> un ami';
  const backBtn=document.querySelector('#screen-multi .btn-back');
  if(backBtn){backBtn.style.display='block';}
  el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--ink3);">⏳ Chargement des amis…</div>';
  const{data:friends}=await sb.from('friendships')
    .select('*,req:profiles!friendships_requester_id_fkey(id,username),adr:profiles!friendships_addressee_id_fkey(id,username)')
    .or('requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+state.currentUser.id)
    .eq('status','accepted');
  if(!friends||!friends.length){
    el.innerHTML='<div class="duel-friend-list"><div style="text-align:center;padding:2rem;color:var(--ink3);font-size:.8rem;">Tu n\'as pas encore d\'amis.<br><a onclick="goProfile();switchTab(\'amis\')" style="color:var(--a);cursor:pointer;">Chercher des amis →</a></div></div>';
    return;
  }
  const items=friends.map(f=>{
    const isReq=f.requester_id===state.currentUser.id;
    const friend=isReq?f.adr:f.req;
    if(!friend)return '';
    const av=(friend.username||'?')[0].toUpperCase();
    return '<div class="duel-friend-item">'+
      '<div class="duel-friend-av">'+av+'</div>'+
      '<div class="duel-friend-name">'+friend.username+'</div>'+
      '<button class="duel-challenge-btn" id="challenge-btn-'+friend.id+'" onclick="challengeFriend(\''+friend.id+'\',\''+friend.username+'\')">Défier</button>'+
    '</div>';
  }).join('');
  el.innerHTML='<div class="duel-friend-list">'+items+'</div>';
}

export async function challengeFriend(friendId,friendName){
  if(!state.currentUser)return;
  const btn=document.getElementById('challenge-btn-'+friendId);
  if(btn){btn.disabled=true;btn.textContent='⏳';}
  // Créer le duel
  const{data:duel,error}=await sb.from('async_duels').insert({
    player_a:state.currentUser.id,player_a_name:state.currentUser.username,
    player_b:friendId,player_b_name:friendName,
    status:'active',current_turn:state.currentUser.id,current_round:1
  }).select().maybeSingle();
  if(error||!duel){showToast('Erreur lors de la création du duel');if(btn){btn.disabled=false;btn.textContent='Défier';}return;}
  // Notifier l'ami
  await _sendNotif(friendId,'duel_invite',{from:state.currentUser.username,duel_id:duel.id});
  showToast('✓ Défi envoyé à '+friendName+' !');
  openAsyncDuel(duel.id);
}

export async function joinRandomDuel(){
  if(!state.currentUser){showToast('Connecte-toi !');return;}
  showToast('🔍 Recherche d\'adversaire…');
  // Chercher un duel aléatoire en attente d'un joueur
  const{data:waiting}=await sb.from('async_duels')
    .select('*').eq('status','pending').eq('is_random',true)
    .is('player_b',null).neq('player_a',state.currentUser.id).limit(1).maybeSingle();
  if(waiting){
    // Rejoindre ce duel
    const{error}=await sb.from('async_duels').update({
      player_b:state.currentUser.id,player_b_name:state.currentUser.username,
      status:'active',current_turn:waiting.player_a
    }).eq('id',waiting.id);
    if(error){showToast('Erreur : '+error.message);return;}
    await _sendNotif(waiting.player_a,'duel_your_turn',{opponent:state.currentUser.username,duel_id:waiting.id});
    showToast('✓ Adversaire trouvé !');
    openAsyncDuel(waiting.id);
  }else{
    // Créer un duel aléatoire en attente
    const{data:duel,error}=await sb.from('async_duels').insert({
      player_a:state.currentUser.id,player_a_name:state.currentUser.username,
      status:'pending',current_turn:state.currentUser.id,is_random:true
    }).select().maybeSingle();
    if(error||!duel){showToast('Erreur');return;}
    showToast('⏳ En attente d\'un adversaire… Tu seras notifié dès qu\'il arrive !');
    openAsyncDuel(duel.id);
  }
}

export async function openAsyncDuel(duelId){
  const el=document.getElementById('multi-content');if(!el)return;
  document.getElementById('multi-title-txt').innerHTML='<em>Duel</em>';
  el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--ink3);">⏳ Chargement…</div>';
  const{data:duel}=await sb.from('async_duels').select('*').eq('id',duelId).maybeSingle();
  if(!duel){showToast('Duel introuvable');showDuelLobby();return;}
  _asyncDuel=duel;show('screen-multi');renderAsyncDuelView(duel);
}

export async function renderAsyncDuelView(duel){
  const el=document.getElementById('multi-content');if(!el)return;
  const isA=duel.player_a===state.currentUser.id;
  const myScore=isA?duel.score_a:duel.score_b;
  const opScore=isA?duel.score_b:duel.score_a;
  const oppName=isA?duel.player_b_name:duel.player_a_name;
  const myTurn=duel.current_turn===state.currentUser.id;

  // Scoreboard
  const scoreHtml='<div class="duel-score-header">'+
    '<div class="duel-score-player mine"><div class="duel-score-name">Toi</div><div class="duel-score-val">'+myScore+'</div></div>'+
    '<div class="duel-score-sep">⚔️</div>'+
    '<div class="duel-score-player"><div class="duel-score-name">'+(oppName||'Adversaire')+'</div><div class="duel-score-val">'+opScore+'</div></div>'+
  '</div>'+
  '<div class="duel-round-label">Manche '+duel.current_round+' / '+duel.total_rounds+'</div>';

  if(duel.status==='pending'&&duel.is_random){
    el.innerHTML=scoreHtml+'<div class="duel-turn-wait"><div class="spinner"></div>En attente d\'un adversaire…<br><br><button class="btn-sec" style="margin-top:.5rem;font-size:.75rem" onclick="cancelAsyncDuel(\''+duel.id+'\')">Annuler</button></div>';
    return;
  }
  if(duel.status==='completed'){renderAsyncDuelResult(duel);return;}
  if(duel.status==='pending'){
    el.innerHTML=scoreHtml+'<div class="duel-turn-wait">⏳ En attente que <strong>'+(oppName||'ton adversaire')+'</strong> rejoigne le duel.</div>';
    return;
  }
  // Chercher le round actuel
  const{data:round}=await sb.from('async_duel_rounds')
    .select('*').eq('duel_id',duel.id).eq('round_number',duel.current_round).maybeSingle();
  const myAnswerField=isA?'answers_a':'answers_b';
  const iHaveAnswered=round&&round[myAnswerField]!==null&&round[myAnswerField]!==undefined;

  if(myTurn&&(!round||!iHaveAnswered)){
    if(!round){
      // Je dois choisir le thème
      renderAsyncThemePicker(el,scoreHtml,duel);
    }else{
      // Le round existe (l'autre l'a créé), je dois juste répondre aux questions
      renderAsyncQuestions(el,scoreHtml,duel,round);
    }
  }else if(!myTurn&&(!round||!iHaveAnswered)){
    el.innerHTML=scoreHtml+'<div class="duel-turn-wait"><div class="spinner"></div>C\'est au tour de <strong>'+(oppName||'ton adversaire')+'</strong>.<br><small style="color:var(--ink3)">Tu seras notifié quand ce sera ton tour.</small></div>';
  }else if(iHaveAnswered&&round&&(isA?round.answers_b:round.answers_a)===null){
    el.innerHTML=scoreHtml+'<div class="duel-turn-wait"><div class="spinner"></div><strong>'+(oppName||'Ton adversaire')+'</strong> n\'a pas encore répondu à cette manche.<br><small style="color:var(--ink3)">Tu seras notifié quand ce sera ton tour.</small></div>';
  }else{
    el.innerHTML=scoreHtml+'<div class="duel-turn-wait">⏳ Manche en cours…</div>';
  }
}

export function renderAsyncThemePicker(el,scoreHtml,duel){
  const btnHtml=ASYNC_DUEL_THEMES.map(t=>
    '<button class="duel-round-theme-btn" onclick="asyncPickTheme(\''+duel.id+'\','+duel.current_round+',\''+t.id+'\')">'+t.icon+'<br>'+t.label+'</button>'
  ).join('');
  el.innerHTML=scoreHtml+
    '<div style="font-weight:700;font-size:.82rem;margin-bottom:.75rem;text-align:center;">🎯 C\'est ton tour ! Choisis un thème pour cette manche :</div>'+
    '<div class="duel-round-theme-grid">'+btnHtml+'</div>';
}

export async function asyncPickTheme(duelId,roundNumber,theme){
  // Désactiver boutons
  document.querySelectorAll('.duel-round-theme-btn').forEach(b=>{b.disabled=true;b.style.opacity='.5';});
  const el=document.getElementById('multi-content');
  if(el)el.innerHTML+='<div style="text-align:center;padding:1rem;color:var(--ink3);font-size:.78rem;">⏳ Génération des questions…</div>';
  // Chercher 3 questions sur ce thème
  const{data:anecs}=await sb.from('anecdotes').select('id').eq('theme',theme).limit(100);
  const pool=(anecs&&anecs.length)?anecs:(await sb.from('anecdotes').select('id').limit(100)).data||[];
  if(!pool.length){showToast('Pas de questions disponibles pour ce thème');showDuelLobby();return;}
  // Tirer 3 anecdotes aléatoires
  const shuffled=[...pool].sort(()=>Math.random()-.5).slice(0,3);
  const anecIds=shuffled.map(a=>a.id);
  const{data:allQs}=await sb.from('questions').select('*').in('anecdote_id',anecIds);
  if(!allQs||!allQs.length){showToast('Pas de questions disponibles');showDuelLobby();return;}
  // Prendre 1 question par anecdote (3 questions total)
  const questions=anecIds.map(aid=>{
    const q=(allQs.filter(q=>q.anecdote_id===aid)||[]).sort(()=>Math.random()-.5)[0];
    return q?{type:q.type,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation}:null;
  }).filter(Boolean).slice(0,3);
  if(questions.length<1){showToast('Pas assez de questions');showDuelLobby();return;}
  // Insérer le round
  const isA=_asyncDuel&&_asyncDuel.player_a===state.currentUser.id;
  const answers_me={answers:[],score:0,answered_at:null};
  const{error}=await sb.from('async_duel_rounds').insert({
    duel_id:duelId,round_number:roundNumber,theme,initiated_by:state.currentUser.id,questions,
    answers_a:isA?null:null,answers_b:null
  });
  if(error){showToast('Erreur : '+error.message);return;}
  // Recharger le duel
  const{data:duel}=await sb.from('async_duels').select('*').eq('id',duelId).maybeSingle();
  if(duel){_asyncDuel=duel;renderAsyncDuelView(duel);}
}

export function renderAsyncQuestions(el, scoreHtml, duel, round) {
  _asyncCurrentRound  = round;
  _asyncRoundAnswers  = [];
  _asyncRoundQIdx     = 0;
  window._asyncRoundQs = round.questions || [];
  if (!window._asyncRoundQs.length) { showToast('Aucune question dans cette manche'); return; }
  el.innerHTML = scoreHtml + '<div id="duel-q-zone"></div>';
  renderAsyncQuestion(duel);
}

export function renderAsyncQuestion(duel) {
  const qZone = document.getElementById('duel-q-zone');
  if (!qZone) return;
  const qs  = window._asyncRoundQs;
  const idx = _asyncRoundQIdx;
  if (idx >= qs.length) { submitAsyncAnswers(duel); return; }
  const q    = qs[idx];
  const isVF = q.type === 'vf';
  const total = qs.length;
  const pct   = Math.round((idx / total) * 100);

  const opts = q.options.map((o, i) =>
    '<button class="q-opt" onclick="answerAsyncQ(' + i + ',\'' + duel.id + '\')">' +
    (isVF ? o : String.fromCharCode(65 + i) + '. ' + o) +
    '</button>'
  ).join('');

  qZone.innerHTML =
    '<div class="q-block">' +
      '<div class="q-header">' +
        '<span class="q-prog-txt">Question ' + (idx + 1) + ' / ' + total + '</span>' +
      '</div>' +
      '<div class="q-prog-bar"><div class="q-prog-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="q-theme-chip">' + (q.theme || '') + '</div>' +
      '<div class="q-text">' + q.question + '</div>' +
      '<div class="q-opts">' + opts + '</div>' +
    '</div>';
}

export function answerAsyncQ(optIdx, duelId) {
  const qs = window._asyncRoundQs;
  const q  = qs[_asyncRoundQIdx];
  if (!q) return;
  const correct = (optIdx === q.correct_index);
  _asyncRoundAnswers.push({ question: q.question, chosen: optIdx, correct: correct });

  // Flash feedback
  const btns = document.querySelectorAll('.q-opt');
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct_index) b.classList.add('correct');
    else if (i === optIdx && !correct) b.classList.add('wrong');
  });

  setTimeout(() => {
    _asyncRoundQIdx++;
    // Reload duel then continue
    sb.from('async_duels').select('*').eq('id', duelId).maybeSingle().then(({ data: duel }) => {
      if (duel) renderAsyncQuestion(duel);
    });
  }, 900);
}

export async function submitAsyncAnswers(duel) {
  const qs      = window._asyncRoundQs;
  const score   = _asyncRoundAnswers.filter(a => a.correct).length;
  const roundNo = _asyncCurrentRound ? _asyncCurrentRound.round_number : 1;

  // Determine which score column to update
  const isChallenger = (duel.challenger_id === state.currentUser.id);
  const scoreCol     = isChallenger ? 'challenger_score' : 'opponent_score';
  const answersCol   = isChallenger ? 'challenger_answers' : 'opponent_answers';
  const doneCol      = isChallenger ? 'challenger_done' : 'opponent_done';

  // Update the round row
  const { error: rErr } = await sb.from('async_duel_rounds')
    .update({
      [scoreCol]:   (duel[scoreCol] || 0) + score,
      [answersCol]: _asyncRoundAnswers,
      [doneCol]:    true
    })
    .eq('duel_id', duelId)
    .eq('round_number', roundNo);

  if (rErr) { showToast('Erreur sauvegarde : ' + rErr.message); return; }

  await advanceAsyncDuel(duel, roundNo, score);
}

export async function advanceAsyncDuel(duel, roundNo, roundScore) {
  const isChallenger = (duel.challenger_id === state.currentUser.id);
  const opponentId   = isChallenger ? duel.opponent_id : duel.challenger_id;

  // Reload fresh duel state
  const { data: freshDuel } = await sb.from('async_duels').select('*').eq('id', duel.id).maybeSingle();
  if (!freshDuel) return;

  // Check if opponent also finished this round
  const challDone = freshDuel.challenger_round_done;
  const oppDone   = freshDuel.opponent_round_done;

  let newStatus   = freshDuel.status;
  let newRound    = freshDuel.current_round;
  let nextTurn    = freshDuel.current_turn;
  let scoreUpdate = {};

  // Update this player's score on the duel
  const myScoreCol = isChallenger ? 'challenger_score' : 'opponent_score';
  scoreUpdate[myScoreCol] = (freshDuel[myScoreCol] || 0) + roundScore;

  if (isChallenger) scoreUpdate.challenger_round_done = true;
  else              scoreUpdate.opponent_round_done   = true;

  const bothDone = (isChallenger ? true : challDone) && (isChallenger ? oppDone : true);

  if (bothDone) {
    // Both answered — advance round or finish
    newRound = freshDuel.current_round + 1;
    if (newRound > 5) {
      newStatus  = 'finished';
      nextTurn   = null;
    } else {
      // Alternate who picks theme: challenger picks odd rounds, opponent picks even
      nextTurn = (newRound % 2 === 1) ? freshDuel.challenger_id : freshDuel.opponent_id;
    }
    scoreUpdate.current_round         = newRound;
    scoreUpdate.current_turn          = nextTurn;
    scoreUpdate.status                = newStatus;
    scoreUpdate.challenger_round_done = false;
    scoreUpdate.opponent_round_done   = false;
  }

  await sb.from('async_duels').update(scoreUpdate).eq('id', duel.id);

  // Notify opponent
  if (opponentId) {
    const notifType = (newStatus === 'finished') ? 'duel_result' : 'duel_your_turn';
    const payload   = { duel_id: duel.id };
    if (notifType === 'duel_result') payload.winner_id = resolveWinner(scoreUpdate, freshDuel);
    await _sendNotif(opponentId, notifType, payload);
  }

  // Show result screen
  const { data: finalDuel } = await sb.from('async_duels').select('*').eq('id', duel.id).maybeSingle();
  if (finalDuel) renderAsyncDuelResult(finalDuel, roundScore);
}

export function resolveWinner(updates, duel) {
  const cs = (updates.challenger_score !== undefined) ? updates.challenger_score : duel.challenger_score;
  const os = (updates.opponent_score   !== undefined) ? updates.opponent_score   : duel.opponent_score;
  if (cs > os)  return duel.challenger_id;
  if (os > cs)  return duel.opponent_id;
  return null; // draw
}

export function renderAsyncDuelResult(duel, roundScore) {
  const el = document.getElementById('screen-duel');
  if (!el) return;

  const isChallenger = (duel.challenger_id === state.currentUser.id);
  const myScore      = isChallenger ? (duel.challenger_score || 0) : (duel.opponent_score || 0);
  const theirScore   = isChallenger ? (duel.opponent_score   || 0) : (duel.challenger_score || 0);
  const finished     = (duel.status === 'finished');

  let emoji, title, sub;
  if (finished) {
    if (myScore > theirScore)       { emoji = '🏆'; title = 'Victoire !';   sub = myScore + ' – ' + theirScore; }
    else if (theirScore > myScore)  { emoji = '😢'; title = 'Défaite';      sub = myScore + ' – ' + theirScore; }
    else                            { emoji = '🤝'; title = 'Égalité !';    sub = myScore + ' – ' + theirScore; }
  } else {
    emoji = '✅'; title = 'Manche terminée !';
    sub   = 'Tu as marqué ' + roundScore + ' point' + (roundScore > 1 ? 's' : '') + ' cette manche. En attente de l\'adversaire…';
  }

  el.innerHTML =
    '<div class="duel-result-card">' +
      '<div class="duel-result-emoji">' + emoji + '</div>' +
      '<div class="duel-result-title">' + title + '</div>' +
      '<div class="duel-result-sub">' + sub + '</div>' +
      (finished
        ? '<button class="btn-primary" onclick="showDuelLobby()">Retour aux duels</button>'
        : '<button class="btn-secondary" onclick="showDuelLobby()">Voir mes duels</button>') +
    '</div>';
}

export async function cancelAsyncDuel(duelId) {
  if (!confirm('Abandonner ce duel ?')) return;
  const { error } = await sb.from('async_duels').update({ status: 'cancelled' }).eq('id', duelId);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Duel annulé');
  showDuelLobby();
}
