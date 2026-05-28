import { state, sb, show, escHtml, fmt, fmtShort, showToast, setBtn, EDGE, THEMES, today } from '../shared.js';
import { awardXP, popXP, checkAndAwardBadges, getRank } from './xp.js';
import { completeBingoCell } from './hub.js';
import { _sendNotif } from './notifs.js';

export function goAnec(){
  setRoute('anecdote');
  document.getElementById('top-tab-anec')?.classList.add('active');
  document.getElementById('top-tab-enigme')?.classList.remove('active');
  document.getElementById('top-tab-sondage')?.classList.remove('active');
  updateNav('bn-anec');
  if(state.todayAnec) showAnec(false); else loadToday();
}

export async function loadTodayBackground(){
  // Pr\u00e9charge l'anecdote sans naviguer
  if(state.todayAnec)return;
  try{
    const res=await fetch(EDGE+'?date='+today()+'&_t='+Date.now(),{cache:'no-store',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON}});
    const{anecdote,questions}=await res.json();
    if(anecdote){state.todayAnec=anecdote;state.todayQs=questions||[];}
  }catch(e){console.error(e);}
}

export async function loadToday(){
  const lt=document.getElementById('load-title');if(lt)lt.textContent='Chargement\u2026';
  show('screen-load');
  try{
    const res=await fetch(EDGE+'?date='+today()+'&_t='+Date.now(),{cache:'no-store',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON}});
    const{anecdote,questions}=await res.json();
    if(anecdote){state.todayAnec=anecdote;state.todayQs=questions||[];if(state.currentUser)await markRead();showAnec(false);}
    else{buildList();show('screen-pick');}
  }catch(e){console.error(e);buildList();show('screen-pick');}
}

export function buildList(){
  state.selThemeId=null;
  const dayBadge=document.getElementById('pick-day-badge');
  if(dayBadge)dayBadge.textContent='Jour '+dayOfYear()+' / '+daysInYear();
  const grid=document.getElementById('theme-grid'),btn=document.getElementById('btn-gen');
  if(!grid)return;grid.innerHTML='';
  const _TR={histoire:{r:'D',c:'#60a5fa'},science:{r:'C',c:'#34d399'},nature:{r:'E',c:'#9ca3af'},insolite:{r:'B',c:'#fbbf24'},art:{r:'D',c:'#60a5fa'},espace:{r:'B',c:'#fbbf24'},sport:{r:'C',c:'#34d399'},food:{r:'E',c:'#9ca3af'},legendes:{r:'A',c:'#f97316'}};
    THEMES.forEach(t=>{
    const d=document.createElement('div');d.className='t-card';
    const tr=_TR[t.id]||{r:'E',c:'#9ca3af'};
    d.innerHTML='<div class="sl-trank" style="color:'+tr.c+';border-color:'+tr.c+';">'+tr.r+'</div><div class="t-icon">'+t.icon+'</div><div class="t-info"><div class="t-name">'+t.label+'</div><div class="t-tag">'+t.tag+'</div></div>';
    d.onclick=()=>{document.querySelectorAll('.t-card').forEach(c=>c.classList.remove('sel'));d.classList.add('sel');state.selThemeId=t.id;if(btn)btn.classList.add('ok');};
    grid.appendChild(d);
  });
  if(btn)btn.classList.remove('ok');
}

export async function pickTheme(){
  if(!state.selThemeId)return;
  const lt=document.getElementById('load-title');if(lt)lt.textContent='G\u00e9n\u00e9ration en cours\u2026';
  show('screen-load');
  try{
    const chooser=state.currentUser?currentUser.username:'Anonyme';
    const res=await fetch(EDGE,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({themeId:state.selThemeId,chooser,date:today()})});
    if(!res.ok){
      const txt=await res.text();
      console.error('Edge function error',res.status,txt);
      showToast('\u26a0 Erreur serveur ('+res.status+'). R\u00e9essaie dans un instant.');
      buildList();show('screen-pick');return;
    }
    const json=await res.json();
    if(!json.anecdote){
      console.error('R\u00e9ponse inattendue:',json);
      showToast('\u26a0 G\u00e9n\u00e9ration \u00e9chou\u00e9e. R\u00e9essaie !');
      buildList();show('screen-pick');return;
    }
    state.todayAnec=json.anecdote;state.todayQs=json.questions||[];
    if(state.currentUser)await markRead();
    showAnec(true);
  }catch(e){console.error('pickTheme:',e);showToast('\u26a0 Erreur r\u00e9seau. V\u00e9rifie ta connexion.');buildList();show('screen-pick');}
}

export function showAnec(typewrite){
  if(!state.todayAnec)return;
  const t=THEMES.find(x=>todayAnec.theme&&(todayAnec.theme===x.label||todayAnec.theme.toLowerCase().includes(x.id)))||THEMES[0];
  const idx=THEMES.indexOf(t);
  const card=document.getElementById('anec-num-card');if(card)card.setAttribute('data-num',String(idx+1).padStart(2,'0'));
  const tag=document.getElementById('anec-tag');if(tag)tag.textContent=(todayAnec.icon||t.icon)+' '+(todayAnec.theme||t.label);
  const jb=document.getElementById('jour-badge');if(jb)jb.textContent='Jour '+dayOfYear()+' / '+daysInYear();
  const ch=document.getElementById('anec-chooser');if(ch)ch.textContent=todayAnec.chooser||'Communaut\u00e9';
  const note=document.getElementById('anec-note');if(note)note.textContent=todayAnec.note||'';
  const jbar=document.getElementById('join-bar');if(jbar)jbar.classList.toggle('on',!state.currentUser);
  show('screen-anec');
  const bodyEl=document.getElementById('anec-body');if(!bodyEl)return;
  const txt=todayAnec.anecdote||'';
  if(typewrite){
    bodyEl.innerHTML='';let i=0;
    const cur=document.createElement('span');cur.className='cursor';bodyEl.appendChild(cur);
    const iv=setInterval(()=>{if(i>=txt.length){clearInterval(iv);cur.remove();initQuizArea();return;}cur.insertAdjacentText('beforebegin',txt[i++]);},18);
  }else{bodyEl.textContent=txt;initQuizArea();}
  startCountdown();initRating();setTimeout(loadCommentsFeed,300);setTimeout(()=>{if(typeof loadContexte==='function')loadContexte();},400);setTimeout(loadReactions,500);
}

export async function markRead(){
  if(!state.currentUser||!state.todayAnec)return;
  const{data:existing}=await sb.from('reads').select('id').eq('user_id',currentUser.id).eq('anecdote_id',todayAnec.id).maybeSingle();
  await sb.from('reads').upsert({user_id:currentUser.id,anecdote_id:todayAnec.id,date:today(),preview:todayAnec.anecdote.slice(0,100)},{onConflict:'user_id,anecdote_id'});
  if(!existing){await awardXP(50,'Le Saviez-Vous ?');}
}

export async function showAnecHistorique(){
  let modal=document.getElementById('hist-modal');
  if(!modal){modal=document.createElement('div');modal.id='hist-modal';modal.className='hist-modal-overlay';modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};modal.innerHTML='<div class="hist-modal-box"><div class="hist-modal-hd"><span>ð Vos anecdotes passÃ©es</span><button class="hist-close-btn" onclick="document.getElementById(\'hist-modal\').style.display=\'none\'">â</button></div><div class="hist-modal-body" id="hist-modal-body"><p class="hist-loading">Chargement...</p></div></div>';document.body.appendChild(modal);}
  modal.style.display='flex';
  const body=document.getElementById('hist-modal-body');
  try{
    const reads=(allReads||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
    if(!reads.length){body.innerHTML='<p class="hist-empty">Aucune lecture enregistrÃ©e.</p>';return;}
    const{data}=await sb.from('anecdotes').select('date,title,content,theme').in('date',reads.map(r=>r.date)).order('date',{ascending:false});
    if(!data||!data.length){body.innerHTML='<p class="hist-empty">Impossible de charger.</p>';return;}
    body.innerHTML=data.map(a=>'<div class="hist-item"><div class="hist-item-date">'+a.date+'</div><div class="hist-item-title">'+(a.title||'Anecdote')+'</div><div class="hist-item-excerpt">'+((a.content||'').slice(0,100))+'â¦</div></div>').join('');
  }catch(e){body.innerHTML='<p class="hist-empty" style="color:#f97316">Erreur: '+e.message+'</p>';}
}

export function startCountdown(){
  if(state.cdTimer)clearInterval(state.cdTimer);
  function tick(){const now=new Date(),mid=new Date(now);mid.setHours(24,0,0,0);const diff=mid-now;if(diff<=0){clearInterval(state.cdTimer);location.reload();return;}const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);const el=document.getElementById('countdown');if(el)el.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
  tick();state.cdTimer=setInterval(tick,1000);
}

export function initQuizArea(){
  const area=document.getElementById('quiz-solo-area');if(!area)return;
  area.style.display='none';area.innerHTML='';
  state.quizState=null;
  const btn=document.getElementById('btn-quiz-today');
  if(btn)btn.style.display=state.todayQs&&todayQs.length?'':'none';
}

export function triggerTodayQuiz(){
  if(!state.todayQs||!todayQs.length)return;
  const area=document.getElementById('quiz-solo-area');
  if(area){area.style.display='block';area.scrollIntoView({behavior:'smooth',block:'start'});}
  startQuizSolo();
}

export function selectQCount(btn,n){
  document.querySelectorAll('.btn-q-count').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  btn.dataset.count=n;
  document.querySelector('.btn-q-count.sel').dataset.count=n;
  window._quizCount=n;
}

export function startQuizSolo(){
  if(!state.todayQs||!todayQs.length)return;
  const count=Math.min(10,todayQs.length);
  const qs=[...todayQs].sort(()=>Math.random()-.5).slice(0,Math.min(count,todayQs.length));
  state.quizState={questions:qs,idx:0,score:0,active:true};renderQuizQ();
}

export function renderQuizQ(){
  const area=document.getElementById('quiz-solo-area');if(!area)return;
  const{questions,idx}=state.quizState,q=questions[idx],prog=Math.round(idx/questions.length*100),isVF=q.type==='vf';
  const opts=isVF?'<div class="q-opts q-vf">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerQ('+i+')">'+o+'</button>').join('')+'</div>':'<div class="q-opts">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerQ('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('')+'</div>';
  area.innerHTML='<div class="q-block"><div class="q-header"><span class="q-prog-txt">Question '+(idx+1)+' / '+questions.length+'</span></div><div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div><div class="q-body"><span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span><div class="q-text">'+q.question+'</div>'+opts+'<div class="q-fb" id="q-fb"></div><button class="btn-next" id="btn-next" onclick="nextQ()">Question suivante \u2192</button></div></div>';
}

export function answerQ(i){
  const q=quizState.questions[quizState.idx];
  const opts=document.querySelectorAll('#quiz-solo-area .q-opt');opts.forEach(b=>b.disabled=true);
  const ok=i===q.answer;if(ok)quizState.score++;
  opts[i].classList.add(ok?'ok':'err');if(!ok&&q.answer<opts.length)opts[q.answer].classList.add('ok');
  const fb=document.getElementById('q-fb');if(fb){fb.textContent=q.explanation||'';fb.className='q-fb on '+(ok?'ok':'err');}
  const btn=document.getElementById('btn-next');if(btn)btn.classList.add('on');
}

export function nextQ(){quizState.idx++;if(quizState.idx>=quizState.questions.length)finishQuizSolo();else renderQuizQ();}

export async function finishQuizSolo(){
  quizState.active=false;
  const pct=Math.round(quizState.score/quizState.questions.length*100);
  if(state.currentUser&&state.todayAnec)await sb.from('quiz_history').insert({user_id:currentUser.id,anecdote_id:todayAnec.id,score:quizState.score,total:quizState.questions.length,pct,date:today()});
  const e=pct>=80?'ð':pct>=60?'\u2B50':'ðª',t=pct>=80?'Excellent !':pct>=60?'Bien jou\u00e9 !':'Continuez !',m=pct>=80?'Parfaite ma\u00eetrise !':pct>=60?'Solide ! Revenez demain.':'Chaque jour on apprend.';
  const area=document.getElementById('quiz-solo-area');if(area)area.innerHTML='<div class="q-result"><span class="qr-emoji">'+e+'</span><span class="qr-score">'+pct+'%</span><div class="qr-title">'+t+'</div><div class="qr-msg">'+m+'</div></div>';
}

export async function loadFavs(){
  if(!state.currentUser){document.getElementById('btn-fav')&&(document.getElementById('btn-fav').style.display='none');return;}
  document.getElementById('btn-fav')&&(document.getElementById('btn-fav').style.display='');
  const{data}=await sb.from('favorites').select('anecdote_id').eq('user_id',currentUser.id);
  _histFavs=new Set((data||[]).map(f=>String(f.anecdote_id)));
  updateFavBtn();
}

export function getAnecId(a){return String(a?.id||a?.slug||a?.date||'');}

export function updateFavBtn(){
  const btn=document.getElementById('btn-fav');if(!btn||!state.todayAnec)return;
  const isFav=_histFavs.has(getAnecId(state.todayAnec));
  btn.textContent=isFav?'â¤ï¸':'ð¤';
  btn.classList.toggle('active',isFav);
}

export async function toggleFav(){
  if(!state.currentUser){showToast('Connectez-vous pour ajouter des favoris.');return;}
  const id=getAnecId(state.todayAnec);if(!id)return;
  if(_histFavs.has(id)){
    await sb.from('favorites').delete().eq('user_id',currentUser.id).eq('anecdote_id',id);
    _histFavs.delete(id);showToast('RetirÃ© des favoris');
  }else{
    await sb.from('favorites').insert({user_id:currentUser.id,anecdote_id:id});
    _histFavs.add(id);showToast('â¤ AjoutÃ© aux favoris !');
  }
  updateFavBtn();
}

export async function loadContexte(){
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

export function _renderContexte(texte, sources){
  const card=document.getElementById('contexte-card');
  if(!card)return;
  card.style.display='block';
  document.getElementById('contexte-txt').textContent=texte;
  const srcEl=document.getElementById('contexte-sources');
  if(sources.length){
    srcEl.innerHTML=sources.map(s=>'<a class="contexte-src-lnk" href="'+s.url+'" target="_blank" rel="noopener"><span class="src-ico">ð</span>'+s.title+'</a>').join('');
  }else{srcEl.innerHTML='';}
}

export function toggleContexte(){
  const card=document.getElementById('contexte-card');
  if(card)card.classList.toggle('open');
}

export function shareAnec(){
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

export function closeShare(){document.getElementById('share-bd').classList.remove('on');}

export function _shareText(){
  const theme=state.todayAnec?.theme||'Anecdote';
  const txt=state.todayAnec?.anecdote||'';
  return 'ð¡ *'+theme+'* â Anecdote du Jour\n\n'+txt+'\n\nð https://anecdote-du-jour.pages.dev/';
}

export function shareViaWhatsApp(){
  const url='https://wa.me/?text='+encodeURIComponent(_shareText());
  window.open(url,'_blank','noopener');
  document.getElementById('share-hint').textContent='â WhatsApp ouvert !';
}

export function shareViaDiscord(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='â Texte copiÃ© â colle dans Discord !';
  }).catch(()=>{document.getElementById('share-hint').textContent='Copie manuelle : Ctrl+C';});
}

export function copyShareText(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='â CopiÃ© dans le presse-papiers !';
    setTimeout(()=>{const h=document.getElementById('share-hint');if(h)h.textContent='';},2500);
  });
}

export async function loadReactions(){
  if(!state.todayAnec)return;
  const anecId=getAnecId(state.todayAnec);
  const wrap=document.getElementById('react-wrap');
  if(wrap)wrap.style.display='flex';
  try{
    const promises=[sb.from('reactions').select('reaction').eq('anecdote_id',anecId)];
    if(state.currentUser)promises.push(sb.from('reactions').select('reaction').eq('user_id',currentUser.id).eq('anecdote_id',anecId).maybeSingle());
    const results=await Promise.all(promises);
    const counts=results[0].data||[];
    const mine=state.currentUser?(results[1].data||null):null;
    const ups=counts.filter(r=>r.reaction==='up').length;
    const downs=counts.filter(r=>r.reaction==='down').length;
    const upEl=document.getElementById('react-up-count');
    const dnEl=document.getElementById('react-down-count');
    if(upEl)upEl.textContent=ups;
    if(dnEl)dnEl.textContent=downs;
    const upBtn=document.getElementById('react-up');
    const dnBtn=document.getElementById('react-down');
    if(upBtn){upBtn.classList.remove('active-up');if(mine?.reaction==='up')upBtn.classList.add('active-up');}
    if(dnBtn){dnBtn.classList.remove('active-down');if(mine?.reaction==='down')dnBtn.classList.add('active-down');}
  }catch(e){}
}

export async function setReaction(type){
  if(!state.currentUser){showToast('Connecte-toi pour rÃ©agir !');return;}
  const anecId=getAnecId(state.todayAnec);
  const btn=document.getElementById('react-'+type);
  const isActive=btn?.classList.contains('active-'+type);
  try{
    if(isActive){
      await sb.from('reactions').delete().eq('user_id',currentUser.id).eq('anecdote_id',anecId);
    }else{
      await sb.from('reactions').upsert({user_id:currentUser.id,anecdote_id:anecId,reaction:type},{onConflict:'user_id,anecdote_id'});
    }
    loadReactions();
  }catch(e){showToast('Erreur : '+e.message);}
}

export function generateShareImage(){
  const W=1080,H=1080;
  const canvas=document.createElement('canvas');
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  const dark=document.documentElement.classList.contains('dark');
  const bg1=dark?'#0d1117':'#f0f9ff';
  const bg2=dark?'#1a2332':'#e0f2fe';
  const accent='#22d3ee';
  const ink=dark?'#f1f5f9':'#0f172a';
  const ink3=dark?'#94a3b8':'#64748b';
  // Background
  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,bg1);grad.addColorStop(1,bg2);
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  // Accent bar
  ctx.fillStyle=accent;ctx.fillRect(0,0,8,H);
  // Site name
  ctx.fillStyle=accent;ctx.font='bold 38px system-ui,sans-serif';ctx.textAlign='left';
  ctx.fillText('Anecdote du Jour',60,90);
  // Date
  ctx.fillStyle=ink3;ctx.font='26px system-ui,sans-serif';
  ctx.fillText(new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}),60,135);
  // Theme pill
  const theme=state.todayAnec?.theme||'Anecdote';const ico=state.todayAnec?.icon||'ð¡';
  const pillTxt=ico+'  '+theme;
  ctx.font='bold 26px system-ui,sans-serif';
  const pillW=ctx.measureText(pillTxt).width+40;
  ctx.fillStyle=accent+'33';
  roundRectCtx(ctx,60,158,pillW,46,10);ctx.fill();
  ctx.fillStyle=accent;ctx.fillText(pillTxt,80,190);
  // Anecdote text
  ctx.fillStyle=ink;ctx.font='30px system-ui,sans-serif';
  const txt=state.todayAnec?.anecdote||'';
  const words=txt.split(' ');let line='',lines=[];const maxW=W-120;
  for(const w of words){const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line){lines.push(line.trim());line=w+' ';if(lines.length>=13){lines.push('â¦');break;}}else line=t;}
  if(line&&lines.length<13)lines.push(line.trim());
  lines.forEach((l,i)=>ctx.fillText(l,60,260+i*48));
  // Bottom bar
  ctx.fillStyle=dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';
  ctx.fillRect(0,H-80,W,80);
  ctx.fillStyle=ink3;ctx.font='24px system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText('anecdote-du-jour.pages.dev',W/2,H-26);
  return canvas;
}

export function roundRectCtx(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

export function downloadShareImage(){
  if(!state.todayAnec){showToast("Charge d'abord une anecdote");return;}
  const canvas=generateShareImage();
  const link=document.createElement('a');
  link.download='anecdote-du-jour-'+today()+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  document.getElementById('share-hint').textContent='â Image tÃ©lÃ©chargÃ©e !';
  // Badge share
  const n=parseInt(localStorage.getItem('share_count')||'0')+1;
  localStorage.setItem('share_count',String(n));
}
