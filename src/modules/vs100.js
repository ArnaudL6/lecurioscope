import { state, sb, show, escHtml, showToast, RANKS, today } from '../shared.js';
import { awardXP, calcXP, calcLevel, getRank } from './xp.js';

const BOT_RANKS_DEF=[
  {id:'E',count:40,minRate:0.30,maxRate:0.50,color:'#9ca3af'},
  {id:'D',count:25,minRate:0.45,maxRate:0.65,color:'#60a5fa'},
  {id:'C',count:20,minRate:0.60,maxRate:0.75,color:'#34d399'},
  {id:'B',count:10,minRate:0.72,maxRate:0.85,color:'#fbbf24'},
  {id:'A',count:4, minRate:0.82,maxRate:0.92,color:'#f97316'},
  {id:'S',count:1, minRate:0.90,maxRate:0.97,color:'#a855f7'},
];

const BOT_NAMES_POOL=[
  'ThÃ©o42','LucasQ','Emma_X','JujuPro','Naomie','Zak99','BirH','KilianK',
  'Sofia3','MaxDev','ClÃ©ment','InÃ¨sZ','ThibO','CharlyB','JÃ©rÃ©my','NoÃ©M',
  'AlinaS','Baptiste','Florent','ChloÃ©X','AntoineR','MaevaQ','OlivierT','SarahV',
  'RemiC','PaulaD','TomG','IsaH','KarimL','ValÃ©ryM','DorianN','LauraO',
  'VincentP','NathalQ','GregR','StephS','AnnikaT','MarcV','JuliettW','CyrilX',
  'AurelyY','GastonZ','SimonA','MarieB','RafaelC','EloiseD','EdouardE','LeaF',
  'AlbanG','CamilH','DamienI','FlorJ','GuillK','HenriL','IreneM','JacqN',
  'KevO','LisaP','MathQ','NinaR','OlgaS','PierrT','RoxanU','SamuelV',
  'TaniaW','UgoX','ViolaY','WilZ','XavA','YannB','ZoÃ©C','ActD',
  'BeatE','CedF','DelphG','EtienH','FabI','GenevJ','HugoK','IrinaL',
  'JoakM','KatiaN','LorenO','MariP','NicoQ','OctavR','PercS','QuinT',
  'RomU','SylvV','ThierW','UlanX','VictY','WendZ','XimA','YvetB',
  'ZachC','AbelD'
];

const FALLBACK_VS100=[
  {question:"Quelle est la capitale de l'Australie ?",answers:["Sydney","Melbourne","Canberra","Brisbane"],correctIdx:2},
  {question:"Combien de cÃ´tÃ©s a un hexagone ?",answers:["5","6","7","8"],correctIdx:1},
  {question:"Qui a peint la Joconde ?",answers:["Michel-Ange","RaphaÃ«l","LÃ©onard de Vinci","Botticelli"],correctIdx:2},
  {question:"En quelle annÃ©e a eu lieu la RÃ©volution franÃ§aise ?",answers:["1789","1769","1799","1815"],correctIdx:0},
  {question:"Quel est l'Ã©lÃ©ment chimique de symbole 'Fe' ?",answers:["Fluor","Fer","Francium","Fermium"],correctIdx:1},
  {question:"Quelle planÃ¨te est la plus grande du systÃ¨me solaire ?",answers:["Saturne","Neptune","Jupiter","Uranus"],correctIdx:2},
  {question:"Combien d'os contient le corps humain adulte ?",answers:["196","206","216","226"],correctIdx:1},
  {question:"Qui a Ã©crit 'Les MisÃ©rables' ?",answers:["Balzac","Zola","Hugo","Flaubert"],correctIdx:2},
  {question:"Quelle est la vitesse de la lumiÃ¨re (km/s) ?",answers:["100 000","200 000","300 000","400 000"],correctIdx:2},
  {question:"En quelle annÃ©e l'Homme a-t-il marchÃ© sur la Lune pour la premiÃ¨re fois ?",answers:["1965","1967","1969","1971"],correctIdx:2},
];

export function generateVs100Bots(){
  // Fourchettes de rangs (du plus haut au plus bas)
  const TIERS=[
    {id:'S',minPct:1, maxPct:4, minRate:0.88,maxRate:0.93,color:'#a855f7'},
    {id:'A',minPct:2, maxPct:7, minRate:0.82,maxRate:0.92,color:'#f97316'},
    {id:'B',minPct:5, maxPct:12,minRate:0.72,maxRate:0.85,color:'#fbbf24'},
    {id:'C',minPct:12,maxPct:25,minRate:0.60,maxRate:0.75,color:'#34d399'},
    {id:'D',minPct:20,maxPct:35,minRate:0.45,maxRate:0.65,color:'#60a5fa'},
  ];
  // Chaque rang tire un count alÃ©atoire dans sa fourchette, E reÃ§oit le reste
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

export async function fetchVs100Questions(){
  try{
    const _t=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000));
    const uid=state.currentUser?.id||null;
    const _q=sb.rpc('get_random_questions',{n:50,p_user_id:uid});
    const{data,error}=await Promise.race([_q,_t]);
    if(error||!data||data.length<10){console.error('fetchVs100',error);return null;}
    return data.sort(()=>Math.random()-.5).map(q=>({question:q.question,answers:q.options,correctIdx:q.answer}));
  }catch(e){console.error('fetchVs100',e);}
  return null;
}

export function show1vs100Lobby(){
  setRoute('vs100');
  const sc=getOrCreateVs100Screen();
  const previewBots=generateVs100Bots();
  state.vs100State={bots:previewBots,questions:null,currentQ:0,playerEliminated:false,botsAlive:100,_timer:null};
  const _rc={Nation:'#ff007f',S:'#a855f7',A:'#f97316',B:'#fbbf24',C:'#34d399',D:'#60a5fa',E:'#6b7280'};
const _rk={};previewBots.forEach(b=>{_rk[b.rank]=(_rk[b.rank]||0)+1;});
const dotWall=previewBots.map(b=>`<div class="vs100-wall-dot" style="background:${b.color}44;border:1.5px solid ${b.color}77;width:.9rem;height:.9rem;margin:.15rem;border-radius:50%;flex-shrink:0;" title="${b.rank}"></div>`).join('');
const legend=['Nation','S','A','B','C','D','E'].filter(r=>_rk[r]).map(r=>`<span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:#aaa"><span style="width:.6rem;height:.6rem;border-radius:50%;background:${_rc[r]};display:inline-block"></span>${r}Â (${_rk[r]})</span>`).join('');;
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
    <div class="vs100-rule"><span>&#10067;</span><span>Questions illimitÃ©es &#183; 4 choix</span></div>
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

export function getOrCreateVs100Screen(){let sc=document.getElementById('screen-vs100');if(!sc){sc=document.createElement('div');sc.id='screen-vs100';sc.className='screen';(document.querySelector('main')||document.body).appendChild(sc);}return sc;}

export async function renderVs100Question(){
  const s=state.vs100State;
  if(!s)return;
  if(s.currentQ>=s.questions.length){const more=await fetchVs100Questions();if(more&&more.length>0){s.questions=[...s.questions,...more];}else{endVs100Victory();return;}}
  const q=s.questions[s.currentQ];
  const alive=s.bots.filter(b=>!b.eliminated).length;
  const sc=getOrCreateVs100Screen();

  const botWall=s.bots.map(b=>`<div class="vs100-wall-dot ${b.eliminated?'vs100-dot-dead':''}" id="wbot-${b.id}" style="${b.eliminated?'':'background:'+b.color+'44;border-color:'+b.color+'55;'}" title="${b.name} [${b.rank}]"></div>`).join('');

  sc.innerHTML=`
<div class="vs100-arena">
  <div class="vs100-arena-top">
    <button class="vs100-back-btn" onclick="if(confirm('Abandonner la partie ?'))showHub()">â</button>
    <div class="vs100-arena-info">
      <span class="vs100-q-badge">Q${s.currentQ+1}/10</span>
      <span class="vs100-alive-badge">ð¥ <span id="vs100-alive-count">${alive}</span> restants</span>
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

export async function start1vs100(){
  const btn=document.getElementById('vs100-launch-btn');
  if(btn){btn.textContent='&#9203; Pr&#233;paration...';btn.disabled=true;}
  const questions=await fetchVs100Questions();
  if(!questions){if(btn){btn.textContent='&#9889; Lancer la partie';btn.disabled=false;}return;}
  const bots=generateVs100Bots();
  state.vs100State={questions,bots,currentQ:0,playerEliminated:false,botsAlive:100,_timer:null};
  getOrCreateVs100Screen();
  show('screen-vs100');updateNav('');renderVs100Question();
}

export async function pickVs100Answer(chosen){
  const s=state.vs100State;
  if(!s)return;
  if(s._timer){clearInterval(s._timer);s._timer=null;}
  const q=s.questions[s.currentQ];
  const playerOK=chosen===q.correctIdx;

  // Lock buttons + highlight
  document.querySelectorAll('.vs100-ans-btn').forEach((btn,i)=>{
    btn.disabled=true;
    if(i===q.correctIdx)btn.classList.add('vs100-ans-ok');
    else if(i===chosen&&!playerOK)btn.classList.add('vs100-ans-ko');
  });

  // Bots answer
  const aliveBots=s.bots.filter(b=>!b.eliminated);
  const eliminated=[];
  aliveBots.forEach(bot=>{
    if(Math.random()>bot.successRate){bot.eliminated=true;eliminated.push(bot);}
  });
  s.botsAlive=s.bots.filter(b=>!b.eliminated).length;

  // Animate bot eliminations
  await vs100AnimateElim(eliminated);

  // Show explanation
  const expl = q.explanation||'';
  if(expl){
    const qBox=document.querySelector('.vs100-question-box');
    if(qBox){
      const explDiv=document.createElement('div');
      explDiv.className='vs100-expl';
      explDiv.innerHTML='ð¡ '+expl;
      qBox.appendChild(explDiv);
    }
  }

  // Update alive counter
  const aliveEl=document.getElementById('vs100-alive-count');
  if(aliveEl)aliveEl.textContent=s.botsAlive;

  if(!playerOK){
    await vs100Delay(700);
    endVs100Defeat(q,chosen);
    return;
  }

  s.currentQ++;
  if(s.botsAlive===0){await vs100Delay(400);endVs100Victory();return;}

  // Show inter-question panel
  await new Promise(res=>{const btn=document.createElement('button');btn.className='sl-btn vs100-continue-btn';btn.textContent='Continuer â';btn.onclick=()=>{btn.remove();res();};const qb=document.getElementById('vs100-qbox');if(qb)qb.appendChild(btn);else res();});
  vs100ShowInterlude(eliminated.length,s.botsAlive,s.currentQ);
}

export function vs100AnimateElim(eliminated){
  return new Promise(resolve=>{
    eliminated.forEach(bot=>{
      const el=document.getElementById('wbot-'+bot.id);
      if(!el)return;
      el.classList.add('vs100-dot-elim');
      setTimeout(()=>{
        el.classList.remove('vs100-dot-elim');
        el.classList.add('vs100-dot-dead');
        el.style.background='';
        el.style.borderColor='';
      },500);
    });
    setTimeout(resolve,900);
  });
}

export function vs100Delay(ms){return new Promise(r=>setTimeout(r,ms));}

export function vs100ShowInterlude(elimCount,botsLeft,nextQ){
  const sc=getOrCreateVs100Screen();
  const panel=document.createElement('div');
  panel.className='vs100-interlude';
  panel.innerHTML=`
    <div class="vs100-interlude-box">
      <div class="vs100-interlude-elim">ð <strong>${elimCount}</strong> challenger${elimCount>1?'s':''} Ã©liminÃ©${elimCount>1?'s':''}</div>
      <div class="vs100-interlude-remain">
        <span class="vs100-interlude-count">${botsLeft}</span>
        <span class="vs100-interlude-lbl">challenger${botsLeft>1?'s':''} encore debout</span>
      </div>
      <div class="vs100-interlude-next">Question ${nextQ}</div>
      <button class="vs100-continue-btn" onclick="this.closest('.vs100-interlude').remove();renderVs100Question();">Continuer â¶</button>
    </div>`;
  sc.appendChild(panel);
  requestAnimationFrame(()=>panel.classList.add('vs100-interlude-show'));
}

export function endVs100Defeat(q,chosen){
  const sc=getOrCreateVs100Screen();
  const s=state.vs100State;
  const correct=q.answers[q.correctIdx];
  const picked=chosen>=0?q.answers[chosen]:'â± Temps Ã©coulÃ©';
  sc.innerHTML=`
<div class="vs100-defeat">
  <div class="vs100-defeat-skull">ð</div>
  <div class="vs100-defeat-title">ÃLIMINÃ</div>
  <div class="vs100-defeat-msg">Les challengers ont eu raison de toi !</div>
  <div class="vs100-defeat-card">
    <div class="vs100-dc-row"><span>Questions rÃ©ussies</span><span class="vs100-dc-val">${s.currentQ}</span></div>
    <div class="vs100-dc-row"><span>Ta rÃ©ponse</span><span class="vs100-dc-val vs100-dc-wrong">${picked}</span></div>
    <div class="vs100-dc-row"><span>Bonne rÃ©ponse</span><span class="vs100-dc-val vs100-dc-ok">${correct}</span></div>
    <div class="vs100-dc-row"><span>Challengers restants</span><span class="vs100-dc-val" style="color:#f97316;">${s.botsAlive} / 100</span></div>
  </div>
  <div class="vs100-defeat-btns">
    <button class="vs100-retry-btn" onclick="start1vs100()">ð RÃ©essayer</button>
    <button class="vs100-home-btn" onclick="showHub()">â Accueil</button>
  </div>
</div>`;
}

export async function endVs100Victory(){
  const xpGain=500;
  if(state.currentUser)await awardXP(xpGain,'1 Contre 100 â Victoire !');
  const sc=getOrCreateVs100Screen();
  const s=state.vs100State;
  const totalQ=s?s.questions.length:10;
  const pArr=[];
  for(let i=0;i<20;i++){pArr.push('<div class="vs100-vp" style="--vi:'+i+';"></div>');}
  const particles=pArr.join('');
  sc.innerHTML=
'<div class="vs100-victory">'+
  particles+
  '<div class="vs100-victory-inner">'+
    '<div class="vs100-victory-trophy">ð</div>'+
    '<div class="vs100-victory-title">VICTOIRE !</div>'+
    '<div class="vs100-victory-sub">Tu as Ã©liminÃ© les 100 challengers !</div>'+
    '<div class="vs100-victory-card">'+
      '<div class="vs100-vc-row"><span>RÃ©ponses parfaites</span><span style="color:#fbbf24;">'+totalQ+' / '+totalQ+'</span></div>'+
      '<div class="vs100-vc-row"><span>Bots Ã©liminÃ©s</span><span style="color:#34d399;">100 / 100</span></div>'+
      '<div class="vs100-vc-row"><span>XP remportÃ©</span><span style="color:#a855f7;">+'+xpGain+' XP</span></div>'+
    '</div>'+
    '<button class="vs100-back-gold" onclick="showHub()">â Retour au SystÃ¨me</button>'+
   '</div>'+
'</div>';
}
