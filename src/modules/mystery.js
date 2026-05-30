import { state, sb, show, escHtml, showToast, setBtn, today } from '../shared.js';
import { awardXP } from './xp.js';

export async function buildWeeklyMystery(el){
  if(!el)return;
  const now=new Date();
  const dow=(now.getDay()+6)%7;
  const mon=new Date(now);mon.setDate(now.getDate()-dow);mon.setHours(0,0,0,0);
  const ws=`${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
  const{data:mystery}=await sb.from('weekly_mysteries').select('id,title,story_days,week_start').eq('week_start',ws).maybeSingle();
  if(!mystery){el.innerHTML='<div class="wm-empty">Ã°ÂÂÂ Nouvelle \u00E9nigme disponible lundi !</div>';return;}
  const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
  const actIdx=Math.min(dow,4);
  const todayAct=(mystery.story_days||[])[actIdx]||'';
  const actLabel=`Acte ${['I','II','III','IV','V'][actIdx]} \u2014 ${days[actIdx]}`;
  const preview=todayAct.length>0?todayAct.slice(0,130)+'\u2026':'';
  window._weeklyMystery={...mystery,ws,dow,monIso:mon.toISOString()};
  el.innerHTML=`<div class="wm-card wm-hub-card" onclick="showMysteryDetail()">
  <div class="wm-header">
    <span class="wm-badge">\uD83D\uDD75\uFE0F D\u00C9FI DE LA SEMAINE</span>
    <div class="wm-title">${mystery.title}</div>
    <div class="wm-week">${actLabel}</div>
  </div>
  <div class="wm-hub-preview">${preview}</div>
  <div class="wm-hub-cta">Lire l'enqu\u00EAte compl\u00E8te \u2192</div>
</div>`;
}

export async function showMysteryDetail(){
  setRoute('mystere');
  const m=window._weeklyMystery;
  if(!m){showHub();return;}
  const mon=new Date(m.monIso);
  const dow=m.dow;
  const{data:mystery}=await sb.from('weekly_mysteries').select('*').eq('id',m.id).maybeSingle();
  if(!mystery){showHub();return;}
  const todayDate=new Date().toISOString().slice(0,10);
  let todayGuess=null;
  if(state.currentUser){
    const{data:g}=await sb.from('mystery_guesses').select('*').eq('user_id',state.currentUser.id).eq('mystery_id',mystery.id).eq('guess_date',todayDate).maybeSingle();
    todayGuess=g;
  }
  const{data:guesses}=await sb.from('mystery_guesses_lb').select('*').eq('mystery_id',mystery.id).eq('is_correct',true).order('created_at',{ascending:true});
  const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
  const actNames=['I','II','III','IV','V'];
  const unlockedCount=Math.min(dow+1,5);
  const allActs=(mystery.story_days||[]);
  const introCard=`<div class="wm-act wm-act-open"><div class="wm-act-hd"><span class="wm-act-label">INTRO</span></div><div class="wm-act-body"><p style="color:rgba(255,255,255,.8);line-height:1.6;margin:0 0 .75rem">${mystery.title}</p><p style="color:rgba(255,255,255,.6);font-size:.85rem;line-height:1.5;margin:0">Chaque jour, un nouvel acte rÃ©vÃ¨le un indice. Analysez les indices et soumettez votre dÃ©duction â une seule tentative par jour. Qui est le responsableÂ ?</p></div></div>`;
  const actsHtml=introCard+actNames.map((name,i)=>{
    const actDate=new Date(mon);actDate.setDate(mon.getDate()+i);
    const dateStr=actDate.toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
    if(i<unlockedCount&&allActs[i]){
      return`<div class="wm-act wm-act-open"><div class="wm-act-hd"><span class="wm-act-num">ACTE ${name}</span><span class="wm-act-date">${days[i]} ${dateStr}</span></div><div class="wm-act-body">${allActs[i]}</div></div>`;
    }else{
      return`<div class="wm-act wm-act-locked"><div class="wm-act-hd"><span class="wm-act-num">ACTE ${name}</span><span class="wm-act-date">${days[i]} ${dateStr}</span></div><div class="wm-act-body wm-act-soon">ð Disponible ${days[i]}</div></div>`;
    }
  }).join('');
  let guessHtml='';
  if(!state.currentUser){
    guessHtml=`<div class="wm-guess-pending">Ã°ÂÂÂ <span style="cursor:pointer;color:#00c8ff" onclick="show('screen-login')">Connecte-toi</span> pour soumettre ta d\u00E9duction.</div>`;
  }else if(todayGuess){
    const isOk=todayGuess.is_correct;
    guessHtml=`<div class="wm-verdict ${isOk?'wm-correct':'wm-wrong'}"><div class="wm-verdict-title">${isOk?'\u2705 Bonne d\u00E9duction !':'\u274C Mauvaise piste\u2026'}</div><div class="wm-verdict-culprit">Ta r\u00E9ponse : <em>${todayGuess.culprit}</em></div>${isOk&&mystery.explanation?`<div class="wm-verdict-expl">${mystery.explanation}</div>`:''}<div class="wm-verdict-sub">Reviens demain pour une nouvelle tentative.</div></div>`;
  }else{
    guessHtml=`<div class="wm-guess-form"><div class="wm-guess-title">Ã°ÂÂÂ Ton accusation du jour</div><input class="wm-guess-input" id="wm-culprit-input" placeholder="Qui est le coupable ?" maxlength="80"/><button class="wm-guess-btn" onclick="submitMysteryGuess('${mystery.id}','${mystery.culprit}')">Soumettre Ã¢ÂÂ</button></div>`;
  }
  const lbRows=(guesses||[]).map((g,i)=>{
    const name=g.username||'Anonyme';
    const av=g.avatar_url?`<img src="${g.avatar_url}" class="wm-lb-av">`:`<div class="wm-lb-av-ph">${name[0].toUpperCase()}</div>`;
    const d=new Date(g.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return`<div class="wm-lb-row${g.is_correct?' wm-lb-ok':''}"><span class="wm-lb-rank">#${i+1}</span>${av}<span class="wm-lb-name">${name}</span><span class="wm-lb-date">${d}</span></div>`;
  }).join('')||'<div class="wm-lb-empty">Aucune d\u00E9duction pour le moment.</div>';
  let sc=document.getElementById('screen-mystery');
  if(!sc){sc=document.createElement('div');sc.id='screen-mystery';sc.className='screen';const ref=[...document.querySelectorAll('.screen')].find(el=>el.parentNode===document.body);ref?document.body.insertBefore(sc,ref):(document.querySelector('main')||document.body).appendChild(sc);}
  window._mysteryShareText=`\uD83D\uDD75\uFE0F D\u00E9fi de la semaine sur lecurioscope.fr\n"${mystery.title}"\nSauras-tu trouver le coupable ?\n\u2192 https://lecurioscope.fr`;
  sc.innerHTML=`<div class="mystery-detail"><div class="mystery-hd"><button class="btn-back" onclick="showHub()">\u2190 Hub</button><div class="mystery-hd-title">\uD83D\uDD75\uFE0F ${mystery.title}</div><button class="wm-share-btn" onclick="shareMystery()">\u2197 Partager</button></div><div class="mystery-acts">${actsHtml}</div>${guessHtml}<div class="wm-lb"><div class="wm-lb-title">\uD83D\uDCCA Classement des enqu\u00EAteurs</div>${lbRows}</div></div>`;
  show('screen-mystery');updateNav('');
}

export async function submitMysteryGuess(mysteryId,culpritAnswer){
  if(!state.currentUser){showToast('Ã¢ÂÂ Ã¯Â¸Â Connecte-toi pour soumettre !');return;}
  const input=document.getElementById('wm-culprit-input');
  if(!input||!input.value.trim()){showToast('Ã¢ÂÂ Ã¯Â¸Â Entre ta d\u00E9duction !');return;}
  const culprit=input.value.trim();
  const todayDate=new Date().toISOString().slice(0,10);
  const is_correct=!!(culpritAnswer&&culprit&&culpritAnswer.toLowerCase().split(' ').some(w=>w.length>2&&culprit.toLowerCase().includes(w)));
  const{error}=await sb.from('mystery_guesses').upsert({user_id:state.currentUser.id,mystery_id:mysteryId,culprit,is_correct,guess_date:todayDate},{onConflict:'user_id,mystery_id,guess_date'});
  if(error){showToast('Erreur : '+error.message);return;}
  showToast(is_correct?'\u2705 Bonne d\u00E9duction !':'\u274C Mauvaise piste\u2026');
  showMysteryDetail();
}

export function shareMystery(){
  const text=window._mysteryShareText||'Ã°ÂÂÂµÃ¯Â¸Â D\u00E9fi de la semaine Ã¢ÂÂ https://lecurioscope.fr';
  if(navigator.share){navigator.share({text,url:'https://lecurioscope.fr'}).catch(()=>{});}
  else{navigator.clipboard.writeText(text).then(()=>showToast('Ã¢ÂÂ Lien copi\u00E9 !')).catch(()=>showToast('Copie non support\u00E9e'));}
}

export async function submitMystery(ws){
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
