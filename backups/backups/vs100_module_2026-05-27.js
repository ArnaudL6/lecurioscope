// ╔══════════════════════════════════════════╗
// ║   MODULE 1 CONTRE 100 — BACKUP COMPLET  ║
// ║   2026-05-27                         ║
// ╚══════════════════════════════════════════╝
//
// ÉTAT DU MODULE :
// ✅ Lobby avec dots colorés (sans noms) + légende
// ✅ Partie infinie (jusqu'à 0 bot)
// ✅ Nation : 0.5% chance unique, successRate 0.90-0.97
// ✅ Retry = reset complet (nouveaux bots)
// ✅ Questions filtrées aux anecdotes lues
// ✅ Arène max-width 560px centrée
//
// TIERS :  Nation 90-97% | S 88-93% | A 82-92%
//          B 72-85% | C 60-75% | D 45-65% | E 30-50%
//
// ════════════════════════════════════════════
// JAVASCRIPT
// ════════════════════════════════════════════

// ── generateVs100Bots
function generateVs100Bots(){
  // Fourchettes de rangs (du plus haut au plus bas)
  const TIERS=[
    {id:'S',minPct:1, maxPct:4, minRate:0.88,maxRate:0.93,color:'#a855f7'},
    {id:'A',minPct:2, maxPct:7, minRate:0.82,maxRate:0.92,color:'#f97316'},
    {id:'B',minPct:5, maxPct:12,minRate:0.72,maxRate:0.85,color:'#fbbf24'},
    {id:'C',minPct:12,maxPct:25,minRate:0.60,maxRate:0.75,color:'#34d399'},
    {id:'D',minPct:20,maxPct:35,minRate:0.45,maxRate:0.65,color:'#60a5fa'},
  ];
  // Chaque rang tire un count aléatoire dans sa fourchette, E reçoit le reste
  let rem=100;
  const counts={};
  for(let t=0;t<TIERS.length;t++){
    const tier=TIERS[t];
    const maxPossible=rem-(TIERS.length-1-t); // garder au moins 1 par rang restant + E
    const c=Math.max(0,Math.min(maxPossible,Math.round(tier.minPct+Math.random()*(tier.maxPct-tier.minPct))));
    counts[tier.id]=c;
    rem-=c;
  }
  counts['E']=Math.max(0,rem);
  TIERS.push({id:'E',minRate:0.30,maxRate:0.50,color:'#9ca3af'});

  const bots=[];let nameIdx=0;
  for(const tier of TIERS){
    const count=counts[tier.id]||0;
    for(let k=0;k<count;k++){
      bots.push({
        id:bots.length,
        name:BOT_NAMES_POOL[nameIdx%BOT_NAMES_POOL.length],
        rank:tier.id,color:tier.color,
        successRate:tier.minRate+Math.random()*(tier.maxRate-tier.minRate),
        eliminated:false
      });
      nameIdx++;
    }
  }
  // Nation : 0.5% de chance qu'un bot soit promu (difficile mais pas imbattable)
  if(Math.random()<0.005){const ri=Math.floor(Math.random()*bots.length);bots[ri]={...bots[ri],rank:'Nation',color:'#ff007f',successRate:0.90+Math.random()*0.07};}
  return bots;
}


// ── fetchVs100Questions
function fetchVs100Questions(){
  try{
    const _t=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000));
    const uid=currentUser?.id||null;
    const _q=sb.rpc('get_random_questions',{n:50,p_user_id:uid});
    const{data,error}=await Promise.race([_q,_t]);
    if(error||!data||data.length<10){console.error('fetchVs100',error);return null;}
    return data.sort(()=>Math.random()-.5).map(q=>({question:q.question,answers:q.options,correctIdx:q.answer}));
  }catch(e){console.error('fetchVs100',e);}
  return null;
}

// ── show1vs100Lobby
function show1vs100Lobby(){
  setRoute('vs100');
  const sc=getOrCreateVs100Screen();
  const previewBots=generateVs100Bots();
  vs100State={bots:previewBots,questions:null,currentQ:0,playerEliminated:false,botsAlive:100,_timer:null};
  const _rc={Nation:'#ff007f',S:'#a855f7',A:'#f97316',B:'#fbbf24',C:'#34d399',D:'#60a5fa',E:'#6b7280'};
const _rk={};previewBots.forEach(b=>{_rk[b.rank]=(_rk[b.rank]||0)+1;});
const dotWall=previewBots.map(b=>`<div class="vs100-wall-dot" style="background:${b.color}44;border:1.5px solid ${b.color}77;width:.9rem;height:.9rem;margin:.15rem;border-radius:50%;flex-shrink:0;" title="${b.rank}"></div>`).join('');
const legend=['Nation','S','A','B','C','D','E'].filter(r=>_rk[r]).map(r=>`<span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:#aaa"><span style="width:.6rem;height:.6rem;border-radius:50%;background:${_rc[r]};display:inline-block"></span>${r} (${_rk[r]})</span>`).join('');;
  sc.innerHTML=`
<div class="vs100-lobby">
  <div class="vs100-lobby-header">
    <button class="vs100-back-btn" onclick="showHub()">&#8592; Retour</button>
    <div class="vs100-logo-wrap">
      <div class="vs100-logo-1">1</div>
      <div class="vs100-logo-vs">CONTRE</div>
      <div class="vs100-logo-100">100</div>
    </div>
    <p class="vs100-lobby-sub">Affronte 100 challengers. Reste le dernier debout.</p>
  </div>
  <div class="vs100-rules-grid">
    <div class="vs100-rule"><span>&#10067;</span><span>Questions illimitées &#183; 4 choix</span></div>
    <div class="vs100-rule"><span>&#129302;</span><span>Bots rangs E &#8594; Nation</span></div>
    <div class="vs100-rule"><span>&#9201;</span><span>20 secondes par question</span></div>
    <div class="vs100-rule"><span>&#128128;</span><span>1 erreur &#61; fin de partie</span></div>
    <div class="vs100-rule"><span>&#127942;</span><span>Tous &#233;limin&#233;s &#61; +500 XP</span></div>
    <div class="vs100-rule"><span>&#128200;</span><span>Les forts survivent plus longtemps</span></div>
  </div>
  <div style="margin:1rem 0;background:rgba(255,255,255,.03);border-radius:.75rem;border:1px solid rgba(255,255,255,.08);overflow:hidden">
    <div style="padding:.75rem 1rem;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3)">
      &#9876;&#65039; LES 100 CHALLENGERS
      <span style="background:rgba(255,255,255,.07);padding:.2rem .5rem;border-radius:.3rem;font-size:.7rem">100 participants</span>
    </div>
    <div id="vs100-part-list" style="display:flex;flex-wrap:wrap;justify-content:center;padding:.5rem">${dotWall}</div><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem;padding:.3rem .5rem .5rem">${legend}</div>
  </div>
  <button class="vs100-launch-btn" id="vs100-launch-btn" onclick="start1vs100()">&#9889; LANCER LA PARTIE</button>
</div>`;
  show('screen-vs100');updateNav('');
}


// ── start1vs100
function start1vs100(){
  const btn=document.getElementById('vs100-launch-btn');
  if(btn){btn.textContent='&#9203; Pr&#233;paration...';btn.disabled=true;}
  const questions=await fetchVs100Questions();
  if(!questions){if(btn){btn.textContent='&#9889; Lancer la partie';btn.disabled=false;}return;}
  const bots=generateVs100Bots();
  vs100State={questions,bots,currentQ:0,playerEliminated:false,botsAlive:100,_timer:null};
  getOrCreateVs100Screen();
  show('screen-vs100');updateNav('');renderVs100Question();
}

// ── getOrCreateVs100Screen
function getOrCreateVs100Screen(){let sc=document.getElementById('screen-vs100');if(!sc){sc=document.createElement('div');sc.id='screen-vs100';sc.className='screen';(document.querySelector('main')||document.body).appendChild(sc);}return sc;}

// ── renderVs100Question
function renderVs100Question(){
  const s=vs100State;
  if(!s)return;
  if(s.currentQ>=s.questions.length){const more=await fetchVs100Questions();if(more&&more.length>0){s.questions=[...s.questions,...more];}else{endVs100Victory();return;}}
  const q=s.questions[s.currentQ];
  const alive=s.bots.filter(b=>!b.eliminated).length;
  const sc=getOrCreateVs100Screen();

  const botWall=s.bots.map(b=>`<div class="vs100-wall-dot ${b.eliminated?'vs100-dot-dead':''}" id="wbot-${b.id}" style="${b.eliminated?'':'background:'+b.color+'44;border-color:'+b.color+'55;'}" title="${b.name} [${b.rank}]"></div>`).join('');

  sc.innerHTML=`
<div class="vs100-arena">
  <div class="vs100-arena-top">
    <button class="vs100-back-btn" onclick="if(confirm('Abandonner la partie ?'))showHub()">✕</button>
    <div class="vs100-arena-info">
      <span class="vs100-q-badge">Q${s.currentQ+1}/10</span>
      <span class="vs100-alive-badge">👥 <span id="vs100-alive-count">${alive}</span> restants</span>
    </div>
    <div class="vs100-timer-ring" id="vs100-timer">20</div>
  </div>
  <div class="vs100-wall" id="vs100-wall">${botWall}</div>
  <div class="vs100-question-box">
    <div class="vs100-q-text">${q.question}</div>
    <div class="vs100-answers-grid" id="vs100-answers">
      ${q.answers.map((a,i)=>`<button class="vs100-ans-btn" id="vs100-ans-${i}" onclick="pickVs100Answer(${i})">${a}</button>`).join('')}
    </div>
  </div>
</div>`;

  let timeLeft=20;
  if(s._timer)clearInterval(s._timer);
  s._timer=setInterval(()=>{
    timeLeft--;
    const el=document.getElementById('vs100-timer');
    if(el){
      el.textContent=timeLeft;
      if(timeLeft<=5)el.classList.add('vs100-timer-danger');
    }
    if(timeLeft<=0){clearInterval(s._timer);s._timer=null;pickVs100Answer(-1);}
  },1000);
}


// ── endVs100Defeat
function endVs100Defeat(q,chosen){
  const sc=getOrCreateVs100Screen();
  const s=vs100State;
  const correct=q.answers[q.correctIdx];
  const picked=chosen>=0?q.answers[chosen]:'⏱ Temps écoulé';
  sc.innerHTML=`
<div class="vs100-defeat">
  <div class="vs100-defeat-skull">💀</div>
  <div class="vs100-defeat-title">ÉLIMINÉ</div>
  <div class="vs100-defeat-msg">Les challengers ont eu raison de toi !</div>
  <div class="vs100-defeat-card">
    <div class="vs100-dc-row"><span>Questions réussies</span><span class="vs100-dc-val">${s.currentQ}</span></div>
    <div class="vs100-dc-row"><span>Ta réponse</span><span class="vs100-dc-val vs100-dc-wrong">${picked}</span></div>
    <div class="vs100-dc-row"><span>Bonne réponse</span><span class="vs100-dc-val vs100-dc-ok">${correct}</span></div>
    <div class="vs100-dc-row"><span>Challengers restants</span><span class="vs100-dc-val" style="color:#f97316;">${s.botsAlive} / 100</span></div>
  </div>
  <div class="vs100-defeat-btns">
    <button class="vs100-retry-btn" onclick="start1vs100()">🔄 Réessayer</button>
    <button class="vs100-home-btn" onclick="showHub()">← Accueil</button>
  </div>
</div>`;
}



// ── endVs100Victory
function endVs100Victory(){
  const xpGain=500;
  if(currentUser)await awardXP(xpGain,'1 Contre 100 — Victoire !');
  const sc=getOrCreateVs100Screen();
  const s=vs100State;
  const totalQ=s?s.questions.length:10;
  const pArr=[];
  for(let i=0;i<20;i++){pArr.push('<div class="vs100-vp" style="--vi:'+i+';"></div>');}
  const particles=pArr.join('');
  sc.innerHTML=
'<div class="vs100-victory">'+
  particles+
  '<div class="vs100-victory-inner">'+
    '<div class="vs100-victory-trophy">🏆</div>'+
    '<div class="vs100-victory-title">VICTOIRE !</div>'+
    '<div class="vs100-victory-sub">Tu as éliminé les 100 challengers !</div>'+
    '<div class="vs100-victory-card">'+
      '<div class="vs100-vc-row"><span>Réponses parfaites</span><span style="color:#fbbf24;">'+totalQ+' / '+totalQ+'</span></div>'+
      '<div class="vs100-vc-row"><span>Bots éliminés</span><span style="color:#34d399;">100 / 100</span></div>'+
      '<div class="vs100-vc-row"><span>XP remporté</span><span style="color:#a855f7;">+'+xpGain+' XP</span></div>'+
    '</div>'+
    '<button class="vs100-back-gold" onclick="showHub()">← Retour au Système</button>'+
   '</div>'+
'</div>';
}

// deploy trigger

// deploy trigger 2

// deploy trigger 3



// ════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════

#screen-vs100{overflow-y:auto;display:flex;justify-content:center;align-items:flex-start;}
.vs100-lobby{max-width:480px;margin:0 auto;padding:1.5rem 1rem 3rem;}
.vs100-lobby-header{text-align:center;margin-bottom:1.5rem;}
.vs100-back-btn{background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);font-size:.75rem;padding:.35rem .8rem;border-radius:.5rem;cursor:pointer;margin-bottom:1rem;}
.vs100-back-btn:hover{background:rgba(255,255,255,.05);}
.vs100-logo-wrap{display:flex;align-items:baseline;justify-content:center;gap:.4rem;margin:.5rem 0;}
.vs100-logo-1{font-size:4rem;font-weight:900;color:#a855f7;text-shadow:0 0 30px #a855f755;font-family:'Space Grotesk',sans-serif;line-height:1;}
.vs100-logo-vs{font-size:.8rem;font-weight:800;letter-spacing:.2em;color:rgba(255,255,255,.3);text-transform:uppercase;align-self:center;}
.vs100-logo-100{font-size:4rem;font-weight:900;color:#ec4899;text-shadow:0 0 30px #ec489955;font-family:'Space Grotesk',sans-serif;line-height:1;}
.vs100-lobby-sub{font-size:.8rem;color:rgba(255,255,255,.45);margin:.4rem 0 0;}
.vs100-rules-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1.4rem;}
.vs100-rule{display:flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:.65rem;padding:.6rem .75rem;font-size:.72rem;color:rgba(255,255,255,.6);}
.vs100-rule span:first-child{font-size:1rem;}
.vs100-preview-wrap{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:.85rem;padding:1rem;margin-bottom:1.4rem;}
.vs100-preview-label{font-size:.55rem;font-weight:800;letter-spacing:.18em;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:.65rem;text-align:center;}
.vs100-preview-grid{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-bottom:.65rem;}
.vs100-dot{width:10px;height:10px;border-radius:50%;transition:transform .2s;}
.vs100-preview-legend{display:flex;flex-wrap:wrap;gap:.4rem .85rem;justify-content:center;}
.vs100-leg-dot{display:inline-block;width:8px;height:8px;border-radius:50;vertical-align:middle;margin-right:3px;}
.vs100-leg-lbl{font-size:.6rem;color:rgba(255,255,255,.4);vertical-align:middle;}
.vs100-launch-btn{width:100%;padding:1rem;background:linear-gradient(135deg,#a855f7,#ec4899);border:none;border-radius:.85rem;color:#fff;font-size:1rem;font-weight:800;letter-spacing:.08em;cursor:pointer;box-shadow:0 4px 24px rgba(168,85,247,.4);transition:transform .15s,box-shadow .15s;}
.vs100-launch-btn:hover{transform:translateY(-2px);box-shadow:0 6px 32px rgba(168,85,247,.5);}
.vs100-launch-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}

/* ═══════════════════════════════════════════════════════════
   1 CONTRE 100 — ARÈNE (QUESTION)
═══════════════════════════════════════════════════════════ */
.vs100-arena{display:flex;flex-direction:column;min-height:100vh;padding:2rem 1.4rem 2rem;width:100%;max-width:560px;margin:0 auto;}
.vs100-arena-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
.vs100-arena-info{display:flex;align-items:center;gap:.6rem;}
.vs100-q-badge{font-size:.6rem;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.4);background:rgba(255,255,255,.07);padding:.25rem .55rem;border-radius:20px;}
.vs100-alive-badge{font-size:.7rem;font-weight:700;color:#34d399;}
.vs100-timer-ring{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:800;font-family:'Space Grotesk',monospace;color:#fff;transition:border-color .3s,color .3s;}
.vs100-timer-danger{border-color:#ef4444 !important;color:#ef4444 !important;animation:vs100-pulse .5s infinite;}
@keyframes vs100-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}

/* Bot wall */
.vs100-wall{display:flex;flex-wrap:wrap;gap:4px;padding:.85rem;background:rgba(255,255,255,.02);border-radius:.85rem;border:1px solid rgba(255,255,255,.08);margin-bottom:1.1rem;}
.vs100-wall-dot{width:11px;height:11px;border-radius:3px;border:1px solid transparent;transition:background .3s,border-color .3s,transform .3s;}
.vs100-dot-dead{background:#111 !important;border-color:#1e1e1e !important;}
.vs100-dot-elim{transform:scale(1.5);background:#ef4444 !important;border-color:#ef4444 !important;}
@keyframes vs100-elim{0%{transform:scale(1.5);opacity:1;}100%{transform:scale(0);opacity:0;}}

/* Question & answers */
.vs100-question-box{flex:1;display:flex;flex-direction:column;gap:1rem;}
.vs100-q-text{font-size:1rem;font-weight:700;color:#fff;line-height:1.5;text-align:center;padding:1.1rem 1rem;background:rgba(255,255,255,.04);border-radius:.85rem;border:1px solid rgba(255,255,255,.1);}
.vs100-answers-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;}
.vs100-ans-btn{padding:.9rem .75rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:.75rem;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,transform .12s;text-align:center;line-height:1.35;}
.vs100-ans-btn:hover:not(:disabled){background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);transform:translateY(-1px);}
.vs100-ans-btn:disabled{cursor:not-allowed;}
.vs100-ans-ok{background:rgba(52,211,153,.18) !important;border-color:#34d399 !important;color:#34d399 !important;}
.vs100-ans-ko{background:rgba(239,68,68,.18) !important;border-color:#ef4444 !important;color:#ef4444 !important;}

/* Interlude panel */
.vs100-interlude{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;padding:1.5rem;opacity:0;transition:opacity .25s;}
.vs100-interlude-show{opacity:1;}
.vs100-interlude-box{background:#0d0d1a;border:1px solid rgba(168,85,247,.3);border-radius:1.1rem;padding:1.75rem 1.5rem;text-align:center;max-width:340px;width:100%;}
.vs100-interlude-elim{font-size:1rem;color:rgba(255,255,255,.6);margin-bottom:.75rem;}
.vs100-interlude-count{font-size:3rem;font-weight:900;color:#ec4899;font-family:'Space Grotesk',sans-serif;text-shadow:0 0 20px #ec489966;display:block;}
.vs100-interlude-lbl{font-size:.75rem;color:rgba(255,255,255,.4);display:block;margin-bottom:.75rem;}
.vs100-interlude-next{font-size:.6rem;font-weight:700;letter-spacing:.15em;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:1rem;}
.vs100-continue-btn{background:linear-gradient(135deg,#a855f7,#ec4899);border:none;border-radius:.65rem;color:#fff;font-size:.85rem;font-weight:700;padding:.7rem 1.75rem;cursor:pointer;}

/* ═══════════════════════════════════════════════════════════
   1 CONTRE 100 — DÉFAITE
═══════════════════════════════════════════════════════════ */
.vs100-defeat{max-width:400px;margin:0 auto;padding:2rem 1.2rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.9rem;}
.vs100-defeat-skull{font-size:3.5rem;}
.vs100-defeat-title{font-size:2rem;font-weight:900;color:#ef4444;font-family:'Space Grotesk',sans-serif;letter-spacing:.06em;text-shadow:0 0 20px #ef444455;}
.vs100-defeat-msg{font-size:.8rem;color:rgba(255,255,255,.45);}
.vs100-defeat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:.85rem;padding:1rem 1.1rem;width:100%;}
.vs100-dc-row{display:flex;justify-content:space-between;align-items:center;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.78rem;color:rgba(255,255,255,.5);}
.vs100-dc-row:last-child{border-bottom:none;}
.vs100-dc-val{font-weight:700;color:#fff;}
.vs100-dc-wrong{color:#ef4444 !important;}
.vs100-dc-ok{color:#34d399 !important;}
.vs100-defeat-btns{display:flex;gap:.7rem;width:100%;}
.vs100-retry-btn{flex:1;padding:.8rem;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.4);border-radius:.7rem;color:#a855f7;font-weight:700;font-size:.82rem;cursor:pointer;}
.vs100-home-btn{flex:1;padding:.8rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:.7rem;color:rgba(255,255,255,.6);font-weight:600;font-size:.82rem;cursor:pointer;}

/* ═══════════════════════════════════════════════════════════
   1 CONTRE 100 — VICTOIRE
═══════════════════════════════════════════════════════════ */
.vs100-victory{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 40%,rgba(168,85,247,.12),transparent 70%),#080810;}
.vs100-victory-inner{position:relative;z-index:2;text-align:center;padding:2rem 1.5rem;max-width:380px;}
.vs100-victory-trophy{font-size:4rem;display:block;margin-bottom:.5rem;}
.vs100-victory-title{font-size:2.5rem;font-weight:900;color:#fbbf24;font-family:'Space Grotesk',sans-serif;letter-spacing:.06em;text-shadow:0 0 30px #fbbf2455;margin-bottom:.4rem;}
.vs100-victory-sub{font-size:.85rem;color:rgba(255,255,255,.5);margin-bottom:1.2rem;}
.vs100-victory-card{background:rgba(255,255,255,.05)
