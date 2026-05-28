import { state, sb, show, escHtml, showToast, setBtn, EDGE_ENIGME, today } from '../shared.js';
import { awardXP, checkAndAwardBadges } from './xp.js';
import { _sendNotif } from './notifs.js';

let _enigmaAttempts=0;
const ENIGMA_MAX_ATTEMPTS=3;
let _chatChannel=null,_chatMsgCount=0;

export async function goEnigme(){
  setRoute('enigme');
  document.getElementById('top-tab-enigme')?.classList.add('active');
  document.getElementById('top-tab-anec')?.classList.remove('active');
  document.getElementById('top-tab-sondage')?.classList.remove('active');
  // Afficher l'Ã©cran de chargement
  show('screen-load');
  const lt=document.getElementById('load-title');if(lt)lt.textContent='Chargement de l\'Ã©nigmeâ¦';
  try{
    const res=await fetch(EDGE_ENIGME,{headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON}});
    const{enigma,choice}=await res.json();
    if(enigma&&choice){
      state.todayEnigme=enigma;state.todayEnigmeChoice=choice;
      showEnigme(false);
    }else{
      buildEnigmePick();show('screen-enigme-pick');
    }
  }catch(e){console.error(e);buildEnigmePick();show('screen-enigme-pick');}
}

export function showEnigmeWIP(){goEnigme();}

export function buildEnigmePick(){
  state.selEnigmeCat=null;
  const grid=document.getElementById('enigme-cat-grid');
  const btn=document.getElementById('btn-gen-enigme');
  if(!grid)return;
  grid.innerHTML='';
  ENIGME_CATS.forEach(t=>{
    const d=document.createElement('div');d.className='t-card';
    d.innerHTML='<div class="t-dot"></div><div class="t-icon">'+t.icon+'</div><div class="t-info"><div class="t-name">'+t.label+'</div><div class="t-tag">'+t.tag+'</div></div>';
    d.onclick=()=>{document.querySelectorAll('#enigme-cat-grid .t-card').forEach(c=>c.classList.remove('sel'));d.classList.add('sel');state.selEnigmeCat=t.id;if(btn)btn.classList.add('ok');};
    grid.appendChild(d);
  });
  if(btn)btn.classList.remove('ok');
}

export async function pickEnigmeCat(){
  if(!state.selEnigmeCat)return;
  const lt=document.getElementById('load-title');if(lt)lt.textContent='GÃ©nÃ©ration de l\'Ã©nigmeâ¦';
  show('screen-load');
  try{
    const chooser=state.currentUser?state.currentUser.username:'Anonyme';
    const chooserId=state.currentUser?state.currentUser.id:null;
    const res=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({categoryId:state.selEnigmeCat,chooser,chooserId})});
    if(!res.ok){showToast('â  Erreur serveur. RÃ©essaie !');buildEnigmePick();show('screen-enigme-pick');return;}
    const{enigma,choice}=await res.json();
    if(!enigma){showToast('â  GÃ©nÃ©ration Ã©chouÃ©e. RÃ©essaie !');buildEnigmePick();show('screen-enigme-pick');return;}
    state.todayEnigme=enigma;state.todayEnigmeChoice=choice;
    showEnigme(true);
  }catch(e){console.error(e);showToast('â  Erreur : '+(e?.message||'rÃ©seau'));buildEnigmePick();show('screen-enigme-pick');}
}

export function showEnigme(typewrite){
  if(!state.todayEnigme)return;
  initEnigmeChat();
  const cat=ENIGME_CATS.find(c=>c.id===state.todayEnigme.category)||ENIGME_CATS[0];
  // Tags
  const tag=document.getElementById('enigme-cat-tag');if(tag)tag.textContent=cat.icon+' '+cat.label;
  const chooserEl=document.getElementById('enigme-chooser');if(chooserEl)chooserEl.textContent=state.todayEnigmeChoice?.chooser||'CommunautÃ©';
  // Difficulty badge
  const diffMap={easy:'Facile',medium:'IntermÃ©diaire',hard:'Difficile'};
  const diffEl=document.getElementById('enigme-difficulty');if(diffEl)diffEl.textContent=diffMap[state.todayEnigme.difficulty||'medium']||'';
  // Question
  const qEl=document.getElementById('enigme-question');
  if(qEl){
    if(typewrite){
      qEl.innerHTML='';let i=0;const txt=state.todayEnigme.question||'';
      const cur=document.createElement('span');cur.className='cursor';qEl.appendChild(cur);
      const iv=setInterval(()=>{if(i>=txt.length){clearInterval(iv);cur.remove();return;}cur.insertAdjacentText('beforebegin',txt[i++]);},16);
    }else{qEl.textContent=state.todayEnigme.question||'';}
  }
  // Reset answer area
  const ansInput=document.getElementById('enigme-answer-input');if(ansInput)ansInput.value='';
  const revealBtn=document.getElementById('enigme-btn-reveal');if(revealBtn)revealBtn.style.display='inline-block';
  const submitBtn=document.getElementById('enigme-btn-submit');if(submitBtn){submitBtn.style.display='inline-block';submitBtn.disabled=false;}
  const ansResult=document.getElementById('enigme-answer-result');if(ansResult)ansResult.style.display='none';
  const carteSavoir=document.getElementById('enigme-carte-savoir');if(carteSavoir)carteSavoir.style.display='none';
  const hintEl=document.getElementById('enigme-hint');
  if(hintEl){
    if(state.todayEnigme.hint){hintEl.style.display='block';const hintTxtEl=document.getElementById('enigme-hint-body');if(hintTxtEl)hintTxtEl.textContent=state.todayEnigme.hint;}
    else{hintEl.style.display='none';}
  }
  // Join bar
  const jbar=document.getElementById('enigme-join-bar');if(jbar)jbar.classList.toggle('on',!state.currentUser);
  // Load existing user response
  if(state.currentUser&&state.todayEnigme)setTimeout(loadExistingEnigmaResponse,400);
  show('screen-enigme');
  state.enigmeCurRating=0;
  setTimeout(initEnigmeRating,300);
  setTimeout(loadEnigmaCommentsFeed,500);
}

export async function loadExistingEnigmaResponse(){
  if(!state.currentUser||!state.todayEnigme)return;
  const{data}=await sb.from('enigma_responses').select('*').eq('user_id',state.currentUser.id).eq('enigma_id',state.todayEnigme.id).maybeSingle();
  if(data){
    let serverAnswer=null;
    try{const r=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({action:'check_answer',enigmaId:state.todayEnigme.id,userAnswer:''})});if(r.ok){const d=await r.json();serverAnswer=d.answer||null;}}catch(e){}
    revealEnigmaAnswer(data.is_correct,data.response_text,serverAnswer);
  }else{
    const saved=parseInt(localStorage.getItem('enigma_att_'+state.todayEnigme.id)||'0');
    if(saved>0&&saved<ENIGMA_MAX_ATTEMPTS){
      _enigmaAttempts=saved;const remaining=ENIGMA_MAX_ATTEMPTS-saved;
      const btn=document.getElementById('enigme-btn-submit');if(btn)btn.textContent='Valider ('+remaining+' restante'+(remaining>1?'s':'')+')';;
      const ar=document.getElementById('enigme-answer-result');
      if(ar){ar.style.display='block';ar.innerHTML='<div class="enigme-result wrong">Deja '+saved+' tentative'+(saved>1?'s':'')+' utilisee'+(saved>1?'s':'')+' - encore '+remaining+'</div>';}
    }
  }
}

export async function submitEnigmaAnswer(){
  const inp=document.getElementById('enigme-answer-input');
  const userAnswer=(inp?.value||'').trim();
  if(!userAnswer){showToast('Entre ta reponse avant de valider.');return;}
  if(!state.currentUser){showToast('Connecte-toi !');show('screen-login');return;}
  if(!state.todayEnigme||_enigmaAttempts>=ENIGMA_MAX_ATTEMPTS)return;
  const btn=document.getElementById('enigme-btn-submit');if(btn)btn.disabled=true;
  _enigmaAttempts++;
  let correct=false,revealedAnswer=null;
  try{
    const res=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({action:'check_answer',enigmaId:state.todayEnigme.id,userAnswer})});
    if(res.ok){const d=await res.json();correct=d.correct===true;revealedAnswer=d.answer||null;}
  }catch(e){console.warn(e);}
  if(correct){
    await sb.from('enigma_responses').upsert({user_id:state.currentUser.id,enigma_id:state.todayEnigme.id,date:state.todayEnigme.date,category:state.todayEnigme.category,response_text:userAnswer,is_correct:true},{onConflict:'user_id,enigma_id'});
    revealEnigmaAnswer(true,userAnswer,revealedAnswer);return;
  }
  const remaining=ENIGMA_MAX_ATTEMPTS-_enigmaAttempts;
  localStorage.setItem('enigma_att_'+state.todayEnigme.id,String(_enigmaAttempts));
  const ar=document.getElementById('enigme-answer-result');
  if(remaining>0){
    if(ar){ar.style.display='block';ar.innerHTML='<div class="enigme-result wrong">Mauvaise reponse - encore <strong>'+remaining+'</strong> tentative'+(remaining>1?'s':'')+'</div>';}
    if(inp)inp.value='';
    if(btn){btn.disabled=false;btn.textContent='Valider ('+remaining+' restante'+(remaining>1?'s':'')+')';}
  }else{
    await sb.from('enigma_responses').upsert({user_id:state.currentUser.id,enigma_id:state.todayEnigme.id,date:state.todayEnigme.date,category:state.todayEnigme.category,response_text:userAnswer,is_correct:false},{onConflict:'user_id,enigma_id'});
    revealEnigmaAnswer(false,userAnswer,revealedAnswer);
  }
}

export function revealEnigmaAnswer(correct,userAnswer,serverAnswer){
  if(state.todayEnigme)localStorage.removeItem('enigma_att_'+state.todayEnigme.id);
  const submitBtn=document.getElementById('enigme-btn-submit');if(submitBtn)submitBtn.style.display='none';
  const revealBtn=document.getElementById('enigme-btn-reveal');if(revealBtn)revealBtn.style.display='none';
  const ansInput=document.getElementById('enigme-answer-input');if(ansInput)ansInput.disabled=true;
  const ans=serverAnswer||'';
  const ar=document.getElementById('enigme-answer-result');
  if(ar){
    ar.style.display='block';
    if(correct===true){ar.innerHTML='<div class="enigme-result correct">Bravo ! <span>'+escHtml(userAnswer)+'</span> est la bonne reponse !</div>';}
    else if(ans){ar.innerHTML='<div class="enigme-result neutral">La reponse etait : <span>'+escHtml(ans)+'</span></div>';}
    else{ar.innerHTML='<div class="enigme-result neutral">La reponse a ete revelee.</div>';}
  }
  if(state.todayEnigme){
    const expEl=document.getElementById('enigme-explanation');if(expEl)expEl.textContent=state.todayEnigme.explanation||'';
    const ffEl=document.getElementById('enigme-fun-fact');if(ffEl)ffEl.textContent=state.todayEnigme.fun_fact||'';
    const ffWrap=document.getElementById('enigme-fun-fact-wrap');if(ffWrap)ffWrap.style.display=state.todayEnigme.fun_fact?'block':'none';
    const cs=document.getElementById('enigme-carte-savoir');if(cs)cs.style.display='block';
  }
  const rs=document.getElementById('enigme-rating-section');if(rs&&state.currentUser)rs.style.display='block';
}

export async function revealEnigmaWithoutAnswer(){
  if(!state.todayEnigme)return;
  const btn=document.getElementById('enigme-btn-reveal');if(btn)btn.disabled=true;
  let serverAnswer=null;
  try{const r=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({action:'check_answer',enigmaId:state.todayEnigme.id,userAnswer:''})});if(r.ok){const d=await r.json();serverAnswer=d.answer||null;}}catch(e){}
  if(state.currentUser){await sb.from('enigma_responses').upsert({user_id:state.currentUser.id,enigma_id:state.todayEnigme.id,date:state.todayEnigme.date,category:state.todayEnigme.category,response_text:'',is_correct:false},{onConflict:'user_id,enigma_id'});}
  revealEnigmaAnswer(false,null,serverAnswer);
}

export async function initEnigmeChat(){
  if(!state.todayEnigme)return;
  const date=state.todayEnigme.date||today();
  const footer=document.getElementById('chat-footer'),loginHint=document.getElementById('chat-login-hint');
  if(!state.currentUser){if(footer)footer.style.display='none';if(loginHint)loginHint.style.display='block';}
  else{if(footer)footer.style.display='flex';if(loginHint)loginHint.style.display='none';}
  const{data:msgs}=await sb.from('enigma_chat').select('id,user_id,username,message,created_at').eq('date',date).order('created_at',{ascending:true}).limit(60);
  const box=document.getElementById('chat-msgs');if(!box)return;
  box.innerHTML='';_chatMsgCount=0;
  if(msgs&&msgs.length>0)msgs.forEach(m=>appendChatMsg(m));
  else box.innerHTML='<div class="enigme-chat-empty" id="chat-empty">Soyez le premier a ecrire !</div>';
  scrollChatToBottom();
  if(_chatChannel){sb.removeChannel(_chatChannel);_chatChannel=null;}
  _chatChannel=sb.channel('enigma-chat-'+date)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'enigma_chat',filter:'date=eq.'+date},
      p=>{appendChatMsg(p.new);scrollChatToBottom();}).subscribe();
}

export function appendChatMsg(msg){
  const box=document.getElementById('chat-msgs');if(!box)return;
  // DÃ©duplique par id pour Ã©viter double-affichage
  if(msg.id&&box.querySelector('[data-msg-id="'+msg.id+'"]'))return;
  const empty=document.getElementById('chat-empty');if(empty)empty.remove();
  _chatMsgCount++;
  const c=document.getElementById('chat-count');if(c)c.textContent=_chatMsgCount+' msg'+(_chatMsgCount>1?'s':'');
  const isMine=state.currentUser&&msg.user_id===state.currentUser.id;
  const time=new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const d=document.createElement('div');d.className='chat-msg '+(isMine?'mine':'other');if(msg.id)d.dataset.msgId=msg.id;
  d.innerHTML='<div class="chat-msg-meta">'+(!isMine?'<span style="font-weight:600;color:#a78bfa">'+escHtml(msg.username||'Anon')+'</span> - ':'')+time+'</div>'+'<div class="chat-msg-bubble">'+escHtml(msg.message)+'</div>';
  box.appendChild(d);
}

export function scrollChatToBottom(){const b=document.getElementById('chat-msgs');if(b)b.scrollTop=b.scrollHeight;}

export function chatKeyDown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMsg();}}

export async function sendChatMsg(){
  if(!state.currentUser){showToast('Connecte-toi pour ecrire !');return;}
  const inp=document.getElementById('chat-input');
  const msg=(inp?.value||'').trim();
  if(!msg||msg.length>280)return;
  if(!state.todayEnigme)return;
  const btn=document.getElementById('chat-send-btn');if(btn)btn.disabled=true;
  const username=state.currentUser.username||'Anonyme';
  const{error}=await sb.from('enigma_chat').insert({date:state.todayEnigme.date||today(),user_id:state.currentUser.id,username,message:msg});
  if(btn)btn.disabled=false;
  if(!error){if(inp)inp.value='';}
  else showToast('Erreur : '+error.message);
}

export function toggleEnigmeHint(){
  const hintBody=document.getElementById('enigme-hint-body');
  if(!hintBody)return;
  const open=hintBody.style.display!=='none';
  hintBody.style.display=open?'none':'block';
  const btn=document.getElementById('enigme-hint-btn');
  if(btn)btn.textContent=open?'Voir l\'indice':'Masquer l\'indice';
}

export async function initEnigmeRating(){
  const section=document.getElementById('enigme-rating-section');
  if(!section||!state.currentUser||!state.todayEnigme)return;
  const{data:ex}=await sb.from('enigma_ratings').select('*').eq('user_id',state.currentUser.id).eq('enigma_id',state.todayEnigme.id).maybeSingle();
  if(ex){
    state.enigmeCurRating=ex.stars;
    highlightEnigmeStars(ex.stars);
    const ci=document.getElementById('enigme-comment-input');if(ci)ci.value=ex.comment||'';
    const saved=document.getElementById('enigme-rating-saved');if(saved)saved.style.opacity='1';
  }
  // Avg rating
  const{data:allR}=await sb.from('enigma_ratings').select('stars').eq('enigma_id',state.todayEnigme.id);
  if(allR&&allR.length){const avg=(allR.reduce((s,r)=>s+r.stars,0)/allR.length).toFixed(1);const el=document.getElementById('enigme-rating-avg');if(el)el.textContent='Moyenne : '+avg+' â­ ('+allR.length+')';}
}

export function highlightEnigmeStars(n){document.querySelectorAll('#enigme-stars-row .star').forEach((s,i)=>{s.classList.toggle('on',i<n);});}

export function hoverEnigmeStars(n){document.querySelectorAll('#enigme-stars-row .star').forEach((s,i)=>{s.classList.toggle('on',i<n);});}

export function resetEnigmeStars(){highlightEnigmeStars(state.enigmeCurRating);}

export function clickEnigmeStar(n){state.enigmeCurRating=n;highlightEnigmeStars(n);}

export async function submitEnigmaRating(){
  if(!state.enigmeCurRating||!state.currentUser||!state.todayEnigme)return;
  const comment=document.getElementById('enigme-comment-input')?.value||'';
  await sb.from('enigma_ratings').upsert({user_id:state.currentUser.id,enigma_id:state.todayEnigme.id,stars:state.enigmeCurRating,comment},{onConflict:'user_id,enigma_id'});
  const saved=document.getElementById('enigme-rating-saved');if(saved){saved.style.opacity='1';setTimeout(()=>saved.style.opacity='0',2500);}
}

export async function loadEnigmaCommentsFeed(){
  const feed=document.getElementById('enigme-comments-feed');if(!feed||!state.todayEnigme)return;
  feed.style.display='block';
  const[{data:comments},{data:profiles}]=await Promise.all([
    sb.from('enigma_comments').select('*').eq('enigma_id',state.todayEnigme.id).order('created_at',{ascending:false}).limit(30),
    sb.from('profiles').select('id,username').limit(100)
  ]);
  if(!comments||!comments.length){feed.innerHTML='<div class="comment-empty">Sois le premier Ã  commenter !</div>';return;}
  const pMap={};(profiles||[]).forEach(p=>pMap[p.id]=p.username);
  const fmt=d=>new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  feed.innerHTML=comments.map(c=>{
    const isOwn=state.currentUser&&c.user_id===state.currentUser.id;
    return '<div class="comment-item">'+
      '<div class="comment-header">'+
        '<span class="comment-author" onclick="viewUserProfile(\''+c.user_id+'\',\''+escHtml(pMap[c.user_id]||'Anonyme')+'\')">'+escHtml(pMap[c.user_id]||'Anonyme')+'</span>'+
        '<span class="comment-date">'+fmt(c.created_at)+'</span>'+
        (isOwn?'<button class="comment-del" onclick="deleteEnigmaComment(\''+c.id+'\')">â</button>':'')+
      '</div>'+
      '<div class="comment-text">'+escHtml(c.comment)+'</div>'+
    '</div>';
  }).join('');
}

export async function submitEnigmaComment(){
  if(!state.currentUser){showToast('â  Connecte-toi pour commenter !');return;}
  if(!state.todayEnigme)return;
  const inp=document.getElementById('enigme-comment-new');
  const text=(inp?.value||'').trim();
  if(!text){showToast('â  Le commentaire est vide.');return;}
  if(text.length>500){showToast('â  Commentaire trop long (500 car. max).');return;}
  const{error}=await sb.from('enigma_comments').insert({user_id:state.currentUser.id,enigma_id:state.todayEnigme.id,comment:text});
  if(error){showToast('â  Erreur lors de l\'envoi.');return;}
  if(inp)inp.value='';
  await loadEnigmaCommentsFeed();
}

export async function deleteEnigmaComment(id){
  if(!state.currentUser)return;
  await sb.from('enigma_comments').delete().eq('id',id).eq('user_id',state.currentUser.id);
  await loadEnigmaCommentsFeed();
}

export function showSondageWIP(){
  document.getElementById('top-tab-sondage')?.classList.add('active');
  document.getElementById('top-tab-anec')?.classList.remove('active');
  showToast('ð Sondage du jour â BientÃ´t disponible !');
  setTimeout(()=>{
    document.getElementById('top-tab-sondage')?.classList.remove('active');
    document.getElementById('top-tab-anec')?.classList.add('active');
  },2500);
}
