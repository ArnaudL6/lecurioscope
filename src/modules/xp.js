import { state, sb, RANKS } from '../shared.js';

export function calcXP(reads,quizzes,streak){return reads*10+quizzes*20+streak*5;}

export function calcLevel(xp){
  let lvl=LEVELS[0],next=LEVELS[1];
  for(let i=LEVELS.length-1;i>=0;i--){if(xp>=LEVELS[i].min){lvl=LEVELS[i];next=LEVELS[i+1]||null;break;}}
  return{lvl,next};
}

export function calcSLXP({reads=0,quizzes=[],enigmas=[],streak=0}){
  let xp=reads*50;
  xp+=quizzes.length*80;
  xp+=quizzes.filter(q=>q.pct===100).length*120;
  xp+=quizzes.filter(q=>q.pct>=80&&q.pct<100).length*40;
  xp+=enigmas.filter(e=>e.is_correct).length*150;
  xp+=enigmas.filter(e=>!e.is_correct).length*20;
  let mult=1;
  if(streak>=100)mult=1.5;else if(streak>=30)mult=1.2;else if(streak>=7)mult=1.1;
  return Math.round(xp*mult);
}
export function getRank(xp){let r=RANKS[0];for(let i=RANKS.length-1;i>=0;i--){if(xp>=RANKS[i].minXP){r=RANKS[i];break;}}return r;}

export function getNextRank(xp){for(let i=0;i<RANKS.length;i++){if(xp<RANKS[i].minXP)return RANKS[i];}return null;}

export function showSystemNotif({title='Quête accomplie',xpGain=0,rank=null}){
  const old=document.getElementById('sl-notif');if(old)old.remove();
  const el=document.createElement('div');
  el.id='sl-notif';el.className='sl-notif';
  const r=rank||state.currentUserRank||RANKS[0];
  el.innerHTML=`
    <div class="sl-notif-inner" style="border-color:${r.color};box-shadow:${r.glow};">
      <div class="sl-notif-top"><span class="sl-notif-icon">⚡</span><span class="sl-notif-label">QUÊTE ACCOMPLIE</span></div>
      <div class="sl-notif-title">${title}</div>
      <div class="sl-notif-xp" style="color:${r.color};">+${xpGain} XP</div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('sl-notif-in'));
  setTimeout(()=>{el.classList.remove('sl-notif-in');setTimeout(()=>el.remove(),400);},3200);
}
export function showLevelUp(newRank){
  const old=document.getElementById('sl-levelup');if(old)old.remove();
  const el=document.createElement('div');
  el.id='sl-levelup';el.className='sl-levelup-overlay';
  el.innerHTML=`
    <div class="sl-levelup-inner">
      <div class="sl-levelup-particles">${Array.from({length:20},(_,i)=>`<span class="sl-particle" style="--i:${i};color:${newRank.color};">◆</span>`).join('')}</div>
      <div class="sl-levelup-content">
        <div class="sl-levelup-label">RANG SUPÉRIEUR DÉBLOQUÉ</div>
        <div class="sl-levelup-rank" style="color:${newRank.color};text-shadow:${newRank.glow};">${newRank.label}</div>
        <div class="sl-levelup-title">${newRank.title}</div>
        <div class="sl-levelup-sub">Félicitations, Chasseur.</div>
      </div>
      <button class="sl-levelup-btn" style="border-color:${newRank.color};color:${newRank.color};" onclick="document.getElementById('sl-levelup').remove()">CONTINUER →</button>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('sl-levelup-in'));
  setTimeout(()=>{if(document.getElementById('sl-levelup'))document.getElementById('sl-levelup').remove();},8000);
}

export async function awardXP(amount,questTitle){
  if(!state.currentUser)return;
  const prevRank=state.currentUserRank||RANKS[0];
  state.currentUserXP=(state.currentUserXP||0)+amount;
  const newRank=getRank(state.currentUserXP);
  state.currentUserRank=newRank;
  showSystemNotif({title:questTitle,xpGain:amount,rank:newRank});
  if(newRank.id!==prevRank.id){
    setTimeout(()=>showLevelUp(newRank),1500);
  }
  sb.from('profiles').update({xp:state.currentUserXP}).eq('id',state.currentUser.id);
}

export async function showStatsWindow(){
  if(!state.currentUser){showToast('Connecte-toi pour voir tes stats !');return;}
  const[{data:reads},{data:quizzes},{data:enigmas},{data:friends}]=await Promise.all([
    sb.from('reads').select('date').eq('user_id',state.currentUser.id),
    sb.from('quiz_history').select('pct,date').eq('user_id',state.currentUser.id),
    sb.from('enigma_responses').select('is_correct').eq('user_id',state.currentUser.id),
    sb.from('friendships').select('id').or('requester_id.eq.'+state.currentUser.id+',addressee_id.eq.'+state.currentUser.id).eq('status','accepted'),
  ]);
  const r=reads||[],q=quizzes||[],e=enigmas||[],f=friends||[];
  const streak=computeStreak(r.map(x=>x.date));
  const avgQuiz=q.length?Math.round(q.reduce((a,b)=>a+b.pct,0)/q.length):0;
  const enigmaCorrect=e.filter(x=>x.is_correct).length;
  const xp=calcSLXP({reads:r.length,quizzes:q,enigmas:e,streak});
  const rank=getRank(xp);
  const nextRank=getNextRank(xp);

  const INT=Math.min(100,avgQuiz);
  const SAG=Math.min(100,Math.round(r.length/3.65));
  const END=Math.min(100,Math.round(streak/3.65));
  const FOR=Math.min(100,enigmaCorrect*10);

  const old=document.getElementById('sl-stats-bd');if(old)old.remove();
  const bd=document.createElement('div');bd.id='sl-stats-bd';bd.className='sl-stats-backdrop';
  bd.onclick=ev=>{if(ev.target===bd)bd.remove();};
  bd.innerHTML=`
    <div class="sl-stats-panel" style="--rank-color:${rank.color};--rank-glow:${rank.glow};">
      <button class="sl-stats-close" onclick="document.getElementById('sl-stats-bd').remove()">✕</button>
      <div class="sl-stats-header">
        <div class="sl-stats-title">FENÊTRE DE STATUT</div>
        <div class="sl-stats-name">${state.currentUser.username}</div>
        <div class="sl-stats-rank" style="color:${rank.color};">[ RANG ${rank.label} — ${rank.title} ]</div>
      </div>
      <div class="sl-stats-xp">
        <div class="sl-stats-xp-row">
          <span>XP</span>
          <span style="color:${rank.color};">${xp.toLocaleString('fr-FR')} / ${(nextRank?.minXP||xp).toLocaleString('fr-FR')}</span>
        </div>
        <div class="sl-xp-track"><div class="sl-xp-fill" style="width:${nextRank?Math.round((xp-rank.minXP)/(nextRank.minXP-rank.minXP)*100):100}%;background:${rank.color};"></div></div>
      </div>
      <div class="sl-stats-grid">
        ${[
          {key:'INT',label:'Intelligence',val:INT,desc:avgQuiz+'% moy. quiz',color:'#60a5fa'},
          {key:'SAG',label:'Sagesse',val:SAG,desc:r.length+' anecdotes lues',color:'#34d399'},
          {key:'END',label:'Endurance',val:END,desc:streak+' jours de streak',color:'#f97316'},
          {key:'FOR',label:'Force',val:FOR,desc:enigmaCorrect+' énigmes résolues',color:'#a855f7'},
        ].map(s=>`
          <div class="sl-stat-item">
            <div class="sl-stat-key" style="color:${s.color};">${s.key}</div>
            <div class="sl-stat-label">${s.label}</div>
            <div class="sl-stat-bar-wrap">
              <div class="sl-stat-bar"><div class="sl-stat-fill" style="width:${s.val}%;background:${s.color};"></div></div>
              <span class="sl-stat-num" style="color:${s.color};">${s.val}</span>
            </div>
            <div class="sl-stat-desc">${s.desc}</div>
          </div>`).join('')}
      </div>
      <div class="sl-stats-footer">
        <div class="sl-stats-misc">
          <span>🤝 ${f.length} ami${f.length!==1?'s':''}</span>
          <span>🎯 ${q.length} quiz</span>
          <span>🔐 ${e.length} énigmes</span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(bd);
}

export function popXP(amount,anchorEl){
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

export async function checkAndAwardBadges(badgeData){
  if(!state.currentUser)return;
  try{
    const{data:saved}=await sb.from('user_badges').select('badge_id').eq('user_id',state.currentUser.id);
    const savedSet=new Set((saved||[]).map(b=>b.badge_id));
    const newOnes=BADGES_DEF.filter(b=>b.check(badgeData)&&!savedSet.has(b.id));
    for(const badge of newOnes){
      await sb.from('user_badges').insert({user_id:state.currentUser.id,badge_id:badge.id});
      showToast('🏅 Badge débloqué : '+badge.icon+' '+badge.name+' !');
      await new Promise(res=>setTimeout(res,2200));
    }
  }catch(e){}
}
