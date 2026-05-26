const SB_URL='https://zryrfmothjhywkklmniw.supabase.co';
const SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeXJmbW90aGpoeXdra2xtbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTYzNjEsImV4cCI6MjA5NDkzMjM2MX0.BWsZ5nXj8ePlB577zozrSO3voroRp8wkqGvM9MExaDg';
const EDGE=SB_URL+'/functions/v1/daily';
const EDGE_ENIGME=SB_URL+'/functions/v1/daily-enigmas';
const sb=supabase.createClient(SB_URL,SB_ANON);

const ENIGME_CATS=[
  {id:'enigme_du_jour',  label:'Énigme du jour',     icon:'🔮', tag:'La classique'},
  {id:'qui_suis_je',     label:'Qui suis-je ?',       icon:'🎭', tag:'Indices progressifs'},
  {id:'logique',         label:'Logique',             icon:'🧩', tag:'Déduction & raisonnement'},
  {id:'cryptogramme',    label:'Cryptogramme',        icon:'🔐', tag:'Code chiffré'},
  {id:'historique',      label:'Historique',          icon:'🏛️', tag:'Faits & personnages'},
  {id:'paradoxe',        label:'Paradoxe',            icon:'♾️', tag:'Logique & philosophie'},
  {id:'maths_recreatives',label:'Maths récréatives',  icon:'🔢', tag:'Puzzles numériques'},
  {id:'science',         label:'Science',             icon:'⚗️', tag:'Phénomènes & curiosités'},
  {id:'surprise',        label:'Surprise',            icon:'🎲', tag:"L'inattendu"},
];

const THEMES=[
  {id:'histoire',label:'Histoire',icon:'🏛️',tag:'Faits historiques'},
  {id:'science',label:'Science',icon:'🔬',tag:'Découvertes & curiosités'},
  {id:'nature',label:'Nature',icon:'🌿',tag:'Merveilles du vivant'},
  {id:'insolite',label:'Insolite',icon:'🎭',tag:"L'incroyable du quotidien"},
  {id:'art',label:'Art & Culture',icon:'🎨',tag:'Créations & artistes'},
  {id:'espace',label:'Espace',icon:'🚀',tag:"Au-delà de l'atmosphère"},
  {id:'sport',label:'Sport',icon:'⚡',tag:'Exploits & records'},
  {id:'food',label:'Gastronomie',icon:'🍽️',tag:'Histoires de saveurs'},
  {id:'legendes',label:'Légendes Urbaines',icon:'🔍',tag:'Mythes & réalité'},
];

let currentUser=null,todayAnec=null,todayQs=[],selThemeId=null;
let todayEnigme=null,todayEnigmeChoice=null,selEnigmeCat=null,enigmeCurRating=0;
let curRating=0,quizState=null,cdTimer=null,prevScreen='screen-anec';
let multiChannel=null,multiState=null;
let userStreak=0,bingoCompleted=new Set();
let currentUserXP=0,currentUserRank=null;
let vs100State=null;

const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));const el=document.getElementById(id);if(el)el.classList.add('on');}
function updateNav(active){['bn-anec','bn-hist','bn-play','bn-league','bn-profil'].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.toggle('active',id===active);});}
function goAnec(){
  document.getElementById('top-tab-anec')?.classList.add('active');
  document.getElementById('top-tab-enigme')?.classList.remove('active');
  document.getElementById('top-tab-sondage')?.classList.remove('active');
  updateNav('bn-anec');
  if(todayAnec) showAnec(false); else loadToday();
}
function goHome(){showHub();}
function showEnigmeWIP(){goEnigme();}

async function goEnigme(){
  document.getElementById('top-tab-enigme')?.classList.add('active');
  document.getElementById('top-tab-anec')?.classList.remove('active');
  document.getElementById('top-tab-sondage')?.classList.remove('active');
  // Afficher l'écran de chargement
  show('screen-load');
  const lt=document.getElementById('load-title');if(lt)lt.textContent='Chargement de l\'énigme…';
  try{
    const res=await fetch(EDGE_ENIGME,{headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON}});
    const{enigma,choice}=await res.json();
    if(enigma&&choice){
      todayEnigme=enigma;todayEnigmeChoice=choice;
      showEnigme(false);
    }else{
      buildEnigmePick();show('screen-enigme-pick');
    }
  }catch(e){console.error(e);buildEnigmePick();show('screen-enigme-pick');}
}

function buildEnigmePick(){
  selEnigmeCat=null;
  const grid=document.getElementById('enigme-cat-grid');
  const btn=document.getElementById('btn-gen-enigme');
  if(!grid)return;
  grid.innerHTML='';
  ENIGME_CATS.forEach(t=>{
    const d=document.createElement('div');d.className='t-card';
    d.innerHTML='<div class="t-dot"></div><div class="t-icon">'+t.icon+'</div><div class="t-info"><div class="t-name">'+t.label+'</div><div class="t-tag">'+t.tag+'</div></div>';
    d.onclick=()=>{document.querySelectorAll('#enigme-cat-grid .t-card').forEach(c=>c.classList.remove('sel'));d.classList.add('sel');selEnigmeCat=t.id;if(btn)btn.classList.add('ok');};
    grid.appendChild(d);
  });
  if(btn)btn.classList.remove('ok');
}

async function pickEnigmeCat(){
  if(!selEnigmeCat)return;
  const lt=document.getElementById('load-title');if(lt)lt.textContent='Génération de l\'énigme…';
  show('screen-load');
  try{
    const chooser=currentUser?currentUser.username:'Anonyme';
    const chooserId=currentUser?currentUser.id:null;
    const res=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({categoryId:selEnigmeCat,chooser,chooserId})});
    if(!res.ok){showToast('⚠ Erreur serveur. Réessaie !');buildEnigmePick();show('screen-enigme-pick');return;}
    const{enigma,choice}=await res.json();
    if(!enigma){showToast('⚠ Génération échouée. Réessaie !');buildEnigmePick();show('screen-enigme-pick');return;}
    todayEnigme=enigma;todayEnigmeChoice=choice;
    showEnigme(true);
  }catch(e){console.error(e);showToast('⚠ Erreur : '+(e?.message||'réseau'));buildEnigmePick();show('screen-enigme-pick');}
}

function showEnigme(typewrite){
  if(!todayEnigme)return;
  initEnigmeChat();
  const cat=ENIGME_CATS.find(c=>c.id===todayEnigme.category)||ENIGME_CATS[0];
  // Tags
  const tag=document.getElementById('enigme-cat-tag');if(tag)tag.textContent=cat.icon+' '+cat.label;
  const chooserEl=document.getElementById('enigme-chooser');if(chooserEl)chooserEl.textContent=todayEnigmeChoice?.chooser||'Communauté';
  // Difficulty badge
  const diffMap={easy:'Facile',medium:'Intermédiaire',hard:'Difficile'};
  const diffEl=document.getElementById('enigme-difficulty');if(diffEl)diffEl.textContent=diffMap[todayEnigme.difficulty||'medium']||'';
  // Question
  const qEl=document.getElementById('enigme-question');
  if(qEl){
    if(typewrite){
      qEl.innerHTML='';let i=0;const txt=todayEnigme.question||'';
      const cur=document.createElement('span');cur.className='cursor';qEl.appendChild(cur);
      const iv=setInterval(()=>{if(i>=txt.length){clearInterval(iv);cur.remove();return;}cur.insertAdjacentText('beforebegin',txt[i++]);},16);
    }else{qEl.textContent=todayEnigme.question||'';}
  }
  // Reset answer area
  const ansInput=document.getElementById('enigme-answer-input');if(ansInput)ansInput.value='';
  const revealBtn=document.getElementById('enigme-btn-reveal');if(revealBtn)revealBtn.style.display='inline-block';
  const submitBtn=document.getElementById('enigme-btn-submit');if(submitBtn){submitBtn.style.display='inline-block';submitBtn.disabled=false;}
  const ansResult=document.getElementById('enigme-answer-result');if(ansResult)ansResult.style.display='none';
  const carteSavoir=document.getElementById('enigme-carte-savoir');if(carteSavoir)carteSavoir.style.display='none';
  const hintEl=document.getElementById('enigme-hint');
  if(hintEl){
    if(todayEnigme.hint){hintEl.style.display='block';const hintTxtEl=document.getElementById('enigme-hint-body');if(hintTxtEl)hintTxtEl.textContent=todayEnigme.hint;}
    else{hintEl.style.display='none';}
  }
  // Join bar
  const jbar=document.getElementById('enigme-join-bar');if(jbar)jbar.classList.toggle('on',!currentUser);
  // Load existing user response
  if(currentUser&&todayEnigme)setTimeout(loadExistingEnigmaResponse,400);
  show('screen-enigme');
  enigmeCurRating=0;
  setTimeout(initEnigmeRating,300);
  setTimeout(loadEnigmaCommentsFeed,500);
}

async function loadExistingEnigmaResponse(){
  if(!currentUser||!todayEnigme)return;
  const{data}=await sb.from('enigma_responses').select('*').eq('user_id',currentUser.id).eq('enigma_id',todayEnigme.id).maybeSingle();
  if(data){
    let serverAnswer=null;
    try{const r=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({action:'check_answer',enigmaId:todayEnigme.id,userAnswer:''})});if(r.ok){const d=await r.json();serverAnswer=d.answer||null;}}catch(e){}
    revealEnigmaAnswer(data.is_correct,data.response_text,serverAnswer);
  }else{
    const saved=parseInt(localStorage.getItem('enigma_att_'+todayEnigme.id)||'0');
    if(saved>0&&saved<ENIGMA_MAX_ATTEMPTS){
      _enigmaAttempts=saved;const remaining=ENIGMA_MAX_ATTEMPTS-saved;
      const btn=document.getElementById('enigme-btn-submit');if(btn)btn.textContent='Valider ('+remaining+' restante'+(remaining>1?'s':'')+')';;
      const ar=document.getElementById('enigme-answer-result');
      if(ar){ar.style.display='block';ar.innerHTML='<div class="enigme-result wrong">Deja '+saved+' tentative'+(saved>1?'s':'')+' utilisee'+(saved>1?'s':'')+' - encore '+remaining+'</div>';}
    }
  }
}

let _enigmaAttempts=0;
const ENIGMA_MAX_ATTEMPTS=3;
async function submitEnigmaAnswer(){
  const inp=document.getElementById('enigme-answer-input');
  const userAnswer=(inp?.value||'').trim();
  if(!userAnswer){showToast('Entre ta reponse avant de valider.');return;}
  if(!currentUser){showToast('Connecte-toi !');show('screen-login');return;}
  if(!todayEnigme||_enigmaAttempts>=ENIGMA_MAX_ATTEMPTS)return;
  const btn=document.getElementById('enigme-btn-submit');if(btn)btn.disabled=true;
  _enigmaAttempts++;
  let correct=false,revealedAnswer=null;
  try{
    const res=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({action:'check_answer',enigmaId:todayEnigme.id,userAnswer})});
    if(res.ok){const d=await res.json();correct=d.correct===true;revealedAnswer=d.answer||null;}
  }catch(e){console.warn(e);}
  if(correct){
    await sb.from('enigma_responses').upsert({user_id:currentUser.id,enigma_id:todayEnigme.id,date:todayEnigme.date,category:todayEnigme.category,response_text:userAnswer,is_correct:true},{onConflict:'user_id,enigma_id'});
    revealEnigmaAnswer(true,userAnswer,revealedAnswer);return;
  }
  const remaining=ENIGMA_MAX_ATTEMPTS-_enigmaAttempts;
  localStorage.setItem('enigma_att_'+todayEnigme.id,String(_enigmaAttempts));
  const ar=document.getElementById('enigme-answer-result');
  if(remaining>0){
    if(ar){ar.style.display='block';ar.innerHTML='<div class="enigme-result wrong">Mauvaise reponse - encore <strong>'+remaining+'</strong> tentative'+(remaining>1?'s':'')+'</div>';}
    if(inp)inp.value='';
    if(btn){btn.disabled=false;btn.textContent='Valider ('+remaining+' restante'+(remaining>1?'s':'')+')';}
  }else{
    await sb.from('enigma_responses').upsert({user_id:currentUser.id,enigma_id:todayEnigme.id,date:todayEnigme.date,category:todayEnigme.category,response_text:userAnswer,is_correct:false},{onConflict:'user_id,enigma_id'});
    revealEnigmaAnswer(false,userAnswer,revealedAnswer);
  }
}

function revealEnigmaAnswer(correct,userAnswer,serverAnswer){
  if(todayEnigme)localStorage.removeItem('enigma_att_'+todayEnigme.id);
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
  if(todayEnigme){
    const expEl=document.getElementById('enigme-explanation');if(expEl)expEl.textContent=todayEnigme.explanation||'';
    const ffEl=document.getElementById('enigme-fun-fact');if(ffEl)ffEl.textContent=todayEnigme.fun_fact||'';
    const ffWrap=document.getElementById('enigme-fun-fact-wrap');if(ffWrap)ffWrap.style.display=todayEnigme.fun_fact?'block':'none';
    const cs=document.getElementById('enigme-carte-savoir');if(cs)cs.style.display='block';
  }
  const rs=document.getElementById('enigme-rating-section');if(rs&&currentUser)rs.style.display='block';
}
async function revealEnigmaWithoutAnswer(){
  if(!todayEnigme)return;
  const btn=document.getElementById('enigme-btn-reveal');if(btn)btn.disabled=true;
  let serverAnswer=null;
  try{const r=await fetch(EDGE_ENIGME,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({action:'check_answer',enigmaId:todayEnigme.id,userAnswer:''})});if(r.ok){const d=await r.json();serverAnswer=d.answer||null;}}catch(e){}
  if(currentUser){await sb.from('enigma_responses').upsert({user_id:currentUser.id,enigma_id:todayEnigme.id,date:todayEnigme.date,category:todayEnigme.category,response_text:'',is_correct:false},{onConflict:'user_id,enigma_id'});}
  revealEnigmaAnswer(false,null,serverAnswer);
}

function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}


// ── Chat Enigme ──────────────────────────────────────────────────────────────
let _chatChannel=null,_chatMsgCount=0;
async function initEnigmeChat(){
  if(!todayEnigme)return;
  const date=todayEnigme.date||today();
  const footer=document.getElementById('chat-footer'),loginHint=document.getElementById('chat-login-hint');
  if(!currentUser){if(footer)footer.style.display='none';if(loginHint)loginHint.style.display='block';}
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
function appendChatMsg(msg){
  const box=document.getElementById('chat-msgs');if(!box)return;
  // Déduplique par id pour éviter double-affichage
  if(msg.id&&box.querySelector('[data-msg-id="'+msg.id+'"]'))return;
  const empty=document.getElementById('chat-empty');if(empty)empty.remove();
  _chatMsgCount++;
  const c=document.getElementById('chat-count');if(c)c.textContent=_chatMsgCount+' msg'+(_chatMsgCount>1?'s':'');
  const isMine=currentUser&&msg.user_id===currentUser.id;
  const time=new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const d=document.createElement('div');d.className='chat-msg '+(isMine?'mine':'other');if(msg.id)d.dataset.msgId=msg.id;
  d.innerHTML='<div class="chat-msg-meta">'+(!isMine?'<span style="font-weight:600;color:#a78bfa">'+escHtml(msg.username||'Anon')+'</span> - ':'')+time+'</div>'+'<div class="chat-msg-bubble">'+escHtml(msg.message)+'</div>';
  box.appendChild(d);
}
function scrollChatToBottom(){const b=document.getElementById('chat-msgs');if(b)b.scrollTop=b.scrollHeight;}
function chatKeyDown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMsg();}}
async function sendChatMsg(){
  if(!currentUser){showToast('Connecte-toi pour ecrire !');return;}
  const inp=document.getElementById('chat-input');
  const msg=(inp?.value||'').trim();
  if(!msg||msg.length>280)return;
  if(!todayEnigme)return;
  const btn=document.getElementById('chat-send-btn');if(btn)btn.disabled=true;
  const username=currentUser.username||'Anonyme';
  const{error}=await sb.from('enigma_chat').insert({date:todayEnigme.date||today(),user_id:currentUser.id,username,message:msg});
  if(btn)btn.disabled=false;
  if(!error){if(inp)inp.value='';}
  else showToast('Erreur : '+error.message);
}
// ── Indice ──────────────────────────────────────────────────────────────────
function toggleEnigmeHint(){
  const hintBody=document.getElementById('enigme-hint-body');
  if(!hintBody)return;
  const open=hintBody.style.display!=='none';
  hintBody.style.display=open?'none':'block';
  const btn=document.getElementById('enigme-hint-btn');
  if(btn)btn.textContent=open?'Voir l\'indice':'Masquer l\'indice';
}

// ── Rating Énigmes ──────────────────────────────────────────────────────────
async function initEnigmeRating(){
  const section=document.getElementById('enigme-rating-section');
  if(!section||!currentUser||!todayEnigme)return;
  const{data:ex}=await sb.from('enigma_ratings').select('*').eq('user_id',currentUser.id).eq('enigma_id',todayEnigme.id).maybeSingle();
  if(ex){
    enigmeCurRating=ex.stars;
    highlightEnigmeStars(ex.stars);
    const ci=document.getElementById('enigme-comment-input');if(ci)ci.value=ex.comment||'';
    const saved=document.getElementById('enigme-rating-saved');if(saved)saved.style.opacity='1';
  }
  // Avg rating
  const{data:allR}=await sb.from('enigma_ratings').select('stars').eq('enigma_id',todayEnigme.id);
  if(allR&&allR.length){const avg=(allR.reduce((s,r)=>s+r.stars,0)/allR.length).toFixed(1);const el=document.getElementById('enigme-rating-avg');if(el)el.textContent='Moyenne : '+avg+' ⭐ ('+allR.length+')';}
}

function highlightEnigmeStars(n){document.querySelectorAll('#enigme-stars-row .star').forEach((s,i)=>{s.classList.toggle('on',i<n);});}
function hoverEnigmeStars(n){document.querySelectorAll('#enigme-stars-row .star').forEach((s,i)=>{s.classList.toggle('on',i<n);});}
function resetEnigmeStars(){highlightEnigmeStars(enigmeCurRating);}
function clickEnigmeStar(n){enigmeCurRating=n;highlightEnigmeStars(n);}

async function submitEnigmaRating(){
  if(!enigmeCurRating||!currentUser||!todayEnigme)return;
  const comment=document.getElementById('enigme-comment-input')?.value||'';
  await sb.from('enigma_ratings').upsert({user_id:currentUser.id,enigma_id:todayEnigme.id,stars:enigmeCurRating,comment},{onConflict:'user_id,enigma_id'});
  const saved=document.getElementById('enigme-rating-saved');if(saved){saved.style.opacity='1';setTimeout(()=>saved.style.opacity='0',2500);}
}

// ── Commentaires Énigmes ────────────────────────────────────────────────────
async function loadEnigmaCommentsFeed(){
  const feed=document.getElementById('enigme-comments-feed');if(!feed||!todayEnigme)return;
  feed.style.display='block';
  const[{data:comments},{data:profiles}]=await Promise.all([
    sb.from('enigma_comments').select('*').eq('enigma_id',todayEnigme.id).order('created_at',{ascending:false}).limit(30),
    sb.from('profiles').select('id,username').limit(100)
  ]);
  if(!comments||!comments.length){feed.innerHTML='<div class="comment-empty">Sois le premier à commenter !</div>';return;}
  const pMap={};(profiles||[]).forEach(p=>pMap[p.id]=p.username);
  const fmt=d=>new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  feed.innerHTML=comments.map(c=>{
    const isOwn=currentUser&&c.user_id===currentUser.id;
    return '<div class="comment-item">'+
      '<div class="comment-header">'+
        '<span class="comment-author" onclick="viewUserProfile(\''+c.user_id+'\',\''+escHtml(pMap[c.user_id]||'Anonyme')+'\')">'+escHtml(pMap[c.user_id]||'Anonyme')+'</span>'+
        '<span class="comment-date">'+fmt(c.created_at)+'</span>'+
        (isOwn?'<button class="comment-del" onclick="deleteEnigmaComment(\''+c.id+'\')">✕</button>':'')+
      '</div>'+
      '<div class="comment-text">'+escHtml(c.comment)+'</div>'+
    '</div>';
  }).join('');
}

async function submitEnigmaComment(){
  if(!currentUser){showToast('⚠ Connecte-toi pour commenter !');return;}
  if(!todayEnigme)return;
  const inp=document.getElementById('enigme-comment-new');
  const text=(inp?.value||'').trim();
  if(!text){showToast('⚠ Le commentaire est vide.');return;}
  if(text.length>500){showToast('⚠ Commentaire trop long (500 car. max).');return;}
  const{error}=await sb.from('enigma_comments').insert({user_id:currentUser.id,enigma_id:todayEnigme.id,comment:text});
  if(error){showToast('⚠ Erreur lors de l\'envoi.');return;}
  if(inp)inp.value='';
  await loadEnigmaCommentsFeed();
}

async function deleteEnigmaComment(id){
  if(!currentUser)return;
  await sb.from('enigma_comments').delete().eq('id',id).eq('user_id',currentUser.id);
  await loadEnigmaCommentsFeed();
}
function showSondageWIP(){
  document.getElementById('top-tab-sondage')?.classList.add('active');
  document.getElementById('top-tab-anec')?.classList.remove('active');
  showToast('📊 Sondage du jour — Bientôt disponible !');
  setTimeout(()=>{
    document.getElementById('top-tab-sondage')?.classList.remove('active');
    document.getElementById('top-tab-anec')?.classList.add('active');
  },2500);
}
let _histAllAnec=[],_histReads=new Set(),_histFavs=new Set(),_histFilter='all';

async function goHistoire(){
  if(!currentUser){showToast('⚠ Connecte-toi pour voir ton historique !');show('screen-login');return;}
  updateNav('bn-hist');
  prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';
  show('screen-hist');
  document.getElementById('hist-screen-list').innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--ink3);font-size:.8rem;">⏳ Chargement…</div>';
  const[{data:allAnec},{data:reads}]=await Promise.all([
    sb.from('anecdotes').select('*').lte('date',today()).order('date',{ascending:false}).limit(90),
    sb.from('reads').select('anecdote_id').eq('user_id',currentUser.id)
  ]);
  _histAllAnec=allAnec||[];
  _histReads=new Set((reads||[]).map(r=>r.anecdote_id));
  if(currentUser){const{data:favData}=await sb.from('favorites').select('anecdote_id').eq('user_id',currentUser.id);_histFavs=new Set((favData||[]).map(f=>String(f.anecdote_id)));}
  _histFilter='all';
  document.querySelectorAll('.hist-chip').forEach((c,i)=>c.classList.toggle('active',i===0));
  renderHistScreen();
}

function filterHist(filter,btn){
  _histFilter=filter;
  document.querySelectorAll('.hist-chip').forEach(c=>c.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderHistScreen();
}

function renderHistScreen(){
  const list=document.getElementById('hist-screen-list');if(!list)return;
  let items=_histAllAnec;
  if(_histFilter==='read')items=items.filter(a=>_histReads.has(a.id));
  if(_histFilter==='unread')items=items.filter(a=>!_histReads.has(a.id));
  if(_histFilter==='fav')items=items.filter(a=>_histFavs.has(String(a.id)));
  if(!items.length){list.innerHTML='<div class="empty"><span class="empty-ico">📚</span><p>Aucune anecdote ici.</p></div>';return;}
  list.innerHTML=items.map(a=>{
    const isRead=_histReads.has(a.id),isToday=a.date===today();
    return'<div class="hist-screen-card" onclick="viewHistAnec(\''+a.id+'\')">'
      +'<div class="hist-screen-icon">'+(a.icon||'📜')+'</div>'
      +'<div>'
        +'<div class="hist-screen-theme">'+(a.theme||'Anecdote')
          +(isToday?'<span class="hist-today-chip">Aujourd\'hui</span>':'')
        +'</div>'
        +'<div class="hist-screen-preview">'+(a.anecdote||'').slice(0,110)+'…</div>'
        +'<div class="hist-screen-footer">'
          +'<span class="hist-screen-date">'+fmtShort(a.date)+(a.chooser&&a.chooser!=='Auto'?' · '+a.chooser:'')+'</span>'
          +'<span class="'+(isRead?'hist-read-badge':'hist-unread-badge')+'">'+(isRead?'✓ Lu':'À lire')+'</span>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}

async function viewHistAnec(anecId){
  prevScreen='screen-hist';
  const[{data:anec},{data:questions}]=await Promise.all([
    sb.from('anecdotes').select('*').eq('id',anecId).single(),
    sb.from('questions').select('*').eq('anecdote_id',anecId)
  ]);
  if(!anec){showToast('⚠ Anecdote introuvable.');return;}
  todayAnec=anec;todayQs=questions||[];
  if(currentUser){await markRead();_histReads.add(anecId);loadFavs();}
  showAnec(false);updateNav('bn-hist');
}

function fmt(d){return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}
function fmtShort(d){return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function showErr(id,msg){const e=document.getElementById(id);if(e){e.textContent=msg;e.classList.add('on');}}
function hideErr(id){const e=document.getElementById(id);if(e)e.classList.remove('on');}
function setBtn(id,loading){const b=document.getElementById(id);if(!b)return;b.disabled=loading;b.style.opacity=loading?'.5':'1';}
let toastTimer=null;
function showToast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('on');if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),2800);}
function dayOfYear(){const n=new Date(),s=new Date(n.getFullYear(),0,0);return Math.floor((n-s)/86400000);}
function daysInYear(){const y=new Date().getFullYear();return((y%4===0&&y%100!==0)||y%400===0)?366:365;}
function computeStreak(dates){
  if(!dates||!dates.length)return 0;
  const uniq=[...new Set(dates)].sort().reverse();
  let streak=0,cur=new Date(today()+'T00:00:00Z');
  for(let i=0;i<uniq.length;i++){const exp=cur.toISOString().slice(0,10);if(uniq[i]===exp){streak++;cur.setUTCDate(cur.getUTCDate()-1);}else break;}
  return streak;
}

function updateHeader(){
  const lbl=document.getElementById('date-lbl');
  if(lbl)lbl.textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const btnL=document.getElementById('btn-hlogin'),btnA=document.getElementById('av-btn');
  if(currentUser){if(btnL)btnL.style.display='none';if(btnA){btnA.classList.add('on');btnA.textContent=currentUser.username[0].toUpperCase();}}
  else{if(btnL)btnL.style.display='';if(btnA)btnA.classList.remove('on');}
}

async function doDiscordLogin(){
  const{error}=await sb.auth.signInWithOAuth({
    provider:'discord',
    options:{redirectTo:window.location.origin}
  });
  if(error)showToast('Erreur Discord : '+error.message);
}

async function doForgotPassword(){
  const email=(document.getElementById('lu')?.value||'').trim();
  if(!email||!email.includes('@')){showErr('lerr','Entre ton email d\'abord.');return;}
  const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'?reset=1'});
  if(error){showErr('lerr','Erreur : '+error.message);return;}
  showToast('\u2709 Email de r\u00e9initialisation envoy\u00e9 !');
}

function checkPwStrength(pw){
  const fill=document.getElementById('pw-strength-fill');
  const lbl=document.getElementById('pw-strength-lbl');
  if(!fill||!lbl)return;
  let score=0;
  if(pw.length>=8)score++;
  if(pw.length>=12)score++;
  if(/[A-Z]/.test(pw))score++;
  if(/[0-9]/.test(pw))score++;
  if(/[^a-zA-Z0-9]/.test(pw))score++;
  const levels=[
    {pct:'0%',color:'transparent',txt:''},
    {pct:'25%',color:'#ef4444',txt:'Faible'},
    {pct:'50%',color:'#f97316',txt:'Moyen'},
    {pct:'75%',color:'#eab308',txt:'Bien'},
    {pct:'100%',color:'#22c55e',txt:'Fort \u2713'},
  ];
  const l=levels[Math.min(score,4)];
  fill.style.width=l.pct;fill.style.background=l.color;
  lbl.textContent=l.txt;lbl.style.color=l.color;
}

async function doLogin(){
  const email=(document.getElementById('lu')?.value||'').trim(),p=document.getElementById('lp')?.value||'';
  hideErr('lerr');
  if(!email||!p){showErr('lerr','Remplis tous les champs.');return;}
  if(!email.includes('@')){showErr('lerr','Entre une adresse email valide.');return;}
  setBtn('btn-login',true);
  const{data,error}=await sb.auth.signInWithPassword({email,password:p});
  setBtn('btn-login',false);
  if(error){showErr('lerr','Email ou mot de passe incorrect.');return;}
  currentUser=await getProfile(data.user.id);
  if(!currentUser){showErr('lerr','Profil introuvable.');return;}
  currentUser.email=data.user.email||'';
  updateHeader();afterLogin();
}

async function doRegister(){
  const u=(document.getElementById('ru')?.value||'').trim();
  const email=(document.getElementById('re')?.value||'').trim();
  const p=document.getElementById('rp')?.value||'';
  hideErr('rerr');
  if(!u||!email||!p){showErr('rerr','Remplis tous les champs.');return;}
  if(!email.includes('@')||!email.includes('.')){showErr('rerr','Adresse email invalide.');return;}
  if(p.length<8){showErr('rerr','Mot de passe trop court (min. 8 caract\u00e8res).');return;}
  if(!/^[a-zA-Z0-9_\-]{2,20}$/.test(u)){showErr('rerr','Pseudo invalide (2-20 caract\u00e8res, lettres/chiffres/_-).');return;}
  setBtn('btn-register',true);
  const{data:ex}=await sb.from('profiles').select('id').eq('username',u).maybeSingle();
  if(ex){setBtn('btn-register',false);showErr('rerr','Ce pseudo est d\u00e9j\u00e0 pris.');return;}
  const{data,error}=await sb.auth.signUp({email,password:p,options:{data:{username:u}}});
  setBtn('btn-register',false);
  if(error){showErr('rerr','Erreur : '+error.message);return;}
  if(data.user&&!data.session){
    showErr('rerr','\ud83d\udce7 V\u00e9rifie ta bo\u00eete mail pour confirmer ton compte !');return;
  }
  await sb.from('profiles').insert({id:data.user.id,username:u,joined:today()});
  currentUser={id:data.user.id,username:u,joined:today(),email:data.user.email||''};
  updateHeader();afterLogin();
}

async function getProfile(uid){const{data}=await sb.from('profiles').select('*').eq('id',uid).maybeSingle();return data;}

function afterLogin(){
  showToast('\u2713 Connect\u00e9 en tant que '+currentUser.username+' !');
  showHub();
}
// ══ SOLO LEVELING — HUB SYSTÈME ══════════════════════════════════════════════
async function showHub(){
  let readToday=false,enigmaToday=false,quizToday=false;
  let xp=currentUserXP||0;
  let rank=currentUserRank||RANKS[0];
  let nextRank=getNextRank(xp);

  if(currentUser){
    const[{data:rd},{data:en},{data:qz}]=await Promise.all([
      sb.from('reads').select('id').eq('user_id',currentUser.id).eq('date',today()).maybeSingle(),
      sb.from('enigma_responses').select('id').eq('user_id',currentUser.id).eq('date',today()).maybeSingle(),
      sb.from('quiz_history').select('id').eq('user_id',currentUser.id).eq('date',today()).maybeSingle(),
    ]);
    readToday=!!rd;enigmaToday=!!en;quizToday=!!qz;
    if(!currentUserXP&&currentUser){
      const[{data:allReads},{data:allQuiz},{data:allEnigma}]=await Promise.all([
        sb.from('reads').select('date').eq('user_id',currentUser.id),
        sb.from('quiz_history').select('pct').eq('user_id',currentUser.id),
        sb.from('enigma_responses').select('is_correct').eq('user_id',currentUser.id),
      ]);
      const streak=computeStreak((allReads||[]).map(x=>x.date));
      xp=calcSLXP({reads:(allReads||[]).length,quizzes:allQuiz||[],enigmas:allEnigma||[],streak});
      currentUserXP=xp;currentUserRank=getRank(xp);rank=currentUserRank;nextRank=getNextRank(xp);
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

      ${currentUser?`
      <div class="sl-hunter-card" style="--rank-color:${rank.color};--rank-glow:${rank.glow};--rank-bg:${rank.bg};">
        <div class="sl-hunter-top">
          <div class="sl-hunter-info">
            <div class="sl-hunter-label">CHASSEUR</div>
            <div class="sl-hunter-name">${currentUser.username}</div>
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
          <span>${userStreak} jour${userStreak!==1?'s':''} de streak</span>
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
}
// ══════════════════════════════════════════════════════════════════════════════

function showSystemNotif({title='Quête accomplie',xpGain=0,rank=null}){
  const old=document.getElementById('sl-notif');if(old)old.remove();
  const el=document.createElement('div');
  el.id='sl-notif';el.className='sl-notif';
  const r=rank||currentUserRank||RANKS[0];
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

function showLevelUp(newRank){
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

async function awardXP(amount,questTitle){
  if(!currentUser)return;
  const prevRank=currentUserRank||RANKS[0];
  currentUserXP=(currentUserXP||0)+amount;
  const newRank=getRank(currentUserXP);
  currentUserRank=newRank;
  showSystemNotif({title:questTitle,xpGain:amount,rank:newRank});
  if(newRank.id!==prevRank.id){
    setTimeout(()=>showLevelUp(newRank),1500);
  }
}

async function showStatsWindow(){
  if(!currentUser){showToast('Connecte-toi pour voir tes stats !');return;}
  const[{data:reads},{data:quizzes},{data:enigmas},{data:friends}]=await Promise.all([
    sb.from('reads').select('date').eq('user_id',currentUser.id),
    sb.from('quiz_history').select('pct,date').eq('user_id',currentUser.id),
    sb.from('enigma_responses').select('is_correct').eq('user_id',currentUser.id),
    sb.from('friendships').select('id').or('requester_id.eq.'+currentUser.id+',addressee_id.eq.'+currentUser.id).eq('status','accepted'),
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
        <div class="sl-stats-name">${currentUser.username}</div>
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

async function loadTodayBackground(){
  // Pr\u00e9charge l'anecdote sans naviguer
  if(todayAnec)return;
  try{
    const res=await fetch(EDGE+'?date='+today()+'&_t='+Date.now(),{cache:'no-store',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON}});
    const{anecdote,questions}=await res.json();
    if(anecdote){todayAnec=anecdote;todayQs=questions||[];}
  }catch(e){console.error(e);}
}

async function loadToday(){
  const lt=document.getElementById('load-title');if(lt)lt.textContent='Chargement\u2026';
  show('screen-load');
  try{
    const res=await fetch(EDGE+'?date='+today()+'&_t='+Date.now(),{cache:'no-store',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON}});
    const{anecdote,questions}=await res.json();
    if(anecdote){todayAnec=anecdote;todayQs=questions||[];if(currentUser)await markRead();showAnec(false);}
    else{buildList();show('screen-pick');}
  }catch(e){console.error(e);buildList();show('screen-pick');}
}

function buildList(){
  selThemeId=null;
  const dayBadge=document.getElementById('pick-day-badge');
  if(dayBadge)dayBadge.textContent='Jour '+dayOfYear()+' / '+daysInYear();
  const grid=document.getElementById('theme-grid'),btn=document.getElementById('btn-gen');
  if(!grid)return;grid.innerHTML='';
  const _TR={histoire:{r:'D',c:'#60a5fa'},science:{r:'C',c:'#34d399'},nature:{r:'E',c:'#9ca3af'},insolite:{r:'B',c:'#fbbf24'},art:{r:'D',c:'#60a5fa'},espace:{r:'B',c:'#fbbf24'},sport:{r:'C',c:'#34d399'},food:{r:'E',c:'#9ca3af'},legendes:{r:'A',c:'#f97316'}};
    THEMES.forEach(t=>{
    const d=document.createElement('div');d.className='t-card';
    const tr=_TR[t.id]||{r:'E',c:'#9ca3af'};
    d.innerHTML='<div class="sl-trank" style="color:'+tr.c+';border-color:'+tr.c+';">'+tr.r+'</div><div class="t-icon">'+t.icon+'</div><div class="t-info"><div class="t-name">'+t.label+'</div><div class="t-tag">'+t.tag+'</div></div>';
    d.onclick=()=>{document.querySelectorAll('.t-card').forEach(c=>c.classList.remove('sel'));d.classList.add('sel');selThemeId=t.id;if(btn)btn.classList.add('ok');};
    grid.appendChild(d);
  });
  if(btn)btn.classList.remove('ok');
}

async function pickTheme(){
  if(!selThemeId)return;
  const lt=document.getElementById('load-title');if(lt)lt.textContent='G\u00e9n\u00e9ration en cours\u2026';
  show('screen-load');
  try{
    const chooser=currentUser?currentUser.username:'Anonyme';
    const res=await fetch(EDGE,{method:'POST',headers:{'Authorization':'Bearer '+SB_ANON,'apikey':SB_ANON,'Content-Type':'application/json'},body:JSON.stringify({themeId:selThemeId,chooser,date:today()})});
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
    todayAnec=json.anecdote;todayQs=json.questions||[];
    if(currentUser)await markRead();
    showAnec(true);
  }catch(e){console.error('pickTheme:',e);showToast('\u26a0 Erreur r\u00e9seau. V\u00e9rifie ta connexion.');buildList();show('screen-pick');}
}

function showAnec(typewrite){
  if(!todayAnec)return;
  const t=THEMES.find(x=>todayAnec.theme&&(todayAnec.theme===x.label||todayAnec.theme.toLowerCase().includes(x.id)))||THEMES[0];
  const idx=THEMES.indexOf(t);
  const card=document.getElementById('anec-num-card');if(card)card.setAttribute('data-num',String(idx+1).padStart(2,'0'));
  const tag=document.getElementById('anec-tag');if(tag)tag.textContent=(todayAnec.icon||t.icon)+' '+(todayAnec.theme||t.label);
  const jb=document.getElementById('jour-badge');if(jb)jb.textContent='Jour '+dayOfYear()+' / '+daysInYear();
  const ch=document.getElementById('anec-chooser');if(ch)ch.textContent=todayAnec.chooser||'Communaut\u00e9';
  const note=document.getElementById('anec-note');if(note)note.textContent=todayAnec.note||'';
  const jbar=document.getElementById('join-bar');if(jbar)jbar.classList.toggle('on',!currentUser);
  show('screen-anec');
  const bodyEl=document.getElementById('anec-body');if(!bodyEl)return;
  const txt=todayAnec.anecdote||'';
  if(typewrite){
    bodyEl.innerHTML='';let i=0;
    const cur=document.createElement('span');cur.className='cursor';bodyEl.appendChild(cur);
    const iv=setInterval(()=>{if(i>=txt.length){clearInterval(iv);cur.remove();initQuizArea();return;}cur.insertAdjacentText('beforebegin',txt[i++]);},18);
  }else{bodyEl.textContent=txt;initQuizArea();}
  startCountdown();initRating();setTimeout(loadCommentsFeed,300);setTimeout(()=>{if(typeof loadContexte==='function')loadContexte();},400);setTimeout(loadReactions,500);setTimeout(()=>{const hw=document.getElementById('home-challenge-wrap');if(hw)buildCommunityChallenge(hw);},600);
}

async function markRead(){
  if(!currentUser||!todayAnec)return;
  const{data:existing}=await sb.from('reads').select('id').eq('user_id',currentUser.id).eq('anecdote_id',todayAnec.id).maybeSingle();
  await sb.from('reads').upsert({user_id:currentUser.id,anecdote_id:todayAnec.id,date:today(),preview:todayAnec.anecdote.slice(0,100)},{onConflict:'user_id,anecdote_id'});
  if(!existing){await awardXP(50,'Le Saviez-Vous ?');}
}

function startCountdown(){
  if(cdTimer)clearInterval(cdTimer);
  function tick(){const now=new Date(),mid=new Date(now);mid.setHours(24,0,0,0);const diff=mid-now;if(diff<=0){clearInterval(cdTimer);location.reload();return;}const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);const el=document.getElementById('countdown');if(el)el.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
  tick();cdTimer=setInterval(tick,1000);
}

function initQuizArea(){
  const area=document.getElementById('quiz-solo-area');if(!area)return;
  area.style.display='none';area.innerHTML='';
  quizState=null;
  const btn=document.getElementById('btn-quiz-today');
  if(btn)btn.style.display=todayQs&&todayQs.length?'':'none';
}

function triggerTodayQuiz(){
  if(!todayQs||!todayQs.length)return;
  const area=document.getElementById('quiz-solo-area');
  if(area){area.style.display='block';area.scrollIntoView({behavior:'smooth',block:'start'});}
  startQuizSolo();
}

function selectQCount(btn,n){
  document.querySelectorAll('.btn-q-count').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  btn.dataset.count=n;
  document.querySelector('.btn-q-count.sel').dataset.count=n;
  window._quizCount=n;
}

function startQuizSolo(){
  if(!todayQs||!todayQs.length)return;
  const count=Math.min(10,todayQs.length);
  const qs=[...todayQs].sort(()=>Math.random()-.5).slice(0,Math.min(count,todayQs.length));
  quizState={questions:qs,idx:0,score:0,active:true};renderQuizQ();
}

function renderQuizQ(){
  const area=document.getElementById('quiz-solo-area');if(!area)return;
  const{questions,idx}=quizState,q=questions[idx],prog=Math.round(idx/questions.length*100),isVF=q.type==='vf';
  const opts=isVF?'<div class="q-opts q-vf">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerQ('+i+')">'+o+'</button>').join('')+'</div>':'<div class="q-opts">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerQ('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('')+'</div>';
  area.innerHTML='<div class="q-block"><div class="q-header"><span class="q-prog-txt">Question '+(idx+1)+' / '+questions.length+'</span></div><div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div><div class="q-body"><span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span><div class="q-text">'+q.question+'</div>'+opts+'<div class="q-fb" id="q-fb"></div><button class="btn-next" id="btn-next" onclick="nextQ()">Question suivante \u2192</button></div></div>';
}

function answerQ(i){
  const q=quizState.questions[quizState.idx];
  const opts=document.querySelectorAll('#quiz-solo-area .q-opt');opts.forEach(b=>b.disabled=true);
  const ok=i===q.answer;if(ok)quizState.score++;
  opts[i].classList.add(ok?'ok':'err');if(!ok&&q.answer<opts.length)opts[q.answer].classList.add('ok');
  const fb=document.getElementById('q-fb');if(fb){fb.textContent=q.explanation||'';fb.className='q-fb on '+(ok?'ok':'err');}
  const btn=document.getElementById('btn-next');if(btn)btn.classList.add('on');
}

function nextQ(){quizState.idx++;if(quizState.idx>=quizState.questions.length)finishQuizSolo();else renderQuizQ();}

async function finishQuizSolo(){
  quizState.active=false;
  const pct=Math.round(quizState.score/quizState.questions.length*100);
  if(currentUser&&todayAnec)await sb.from('quiz_history').insert({user_id:currentUser.id,anecdote_id:todayAnec.id,score:quizState.score,total:quizState.questions.length,pct,date:today()});
  const e=pct>=80?'🏆':pct>=60?'\u2B50':'💪',t=pct>=80?'Excellent !':pct>=60?'Bien jou\u00e9 !':'Continuez !',m=pct>=80?'Parfaite ma\u00eetrise !':pct>=60?'Solide ! Revenez demain.':'Chaque jour on apprend.';
  const area=document.getElementById('quiz-solo-area');if(area)area.innerHTML='<div class="q-result"><span class="qr-emoji">'+e+'</span><span class="qr-score">'+pct+'%</span><div class="qr-title">'+t+'</div><div class="qr-msg">'+m+'</div></div>';
}

async function goProfile(){
  if(!currentUser)return;updateNav('bn-profil');
  prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';

  // Appliquer couleur sauvegardée
  const savedColor=localStorage.getItem('adj_prof_color')||PROF_COLORS[0];
  applyProfileColor(savedColor,false);

  const profAv=document.getElementById('prof-av');if(profAv)profAv.textContent=currentUser.username[0].toUpperCase();
  const profName=document.getElementById('prof-name');if(profName)profName.textContent=currentUser.username;
  const profSince=document.getElementById('prof-since');if(profSince)profSince.textContent='Membre depuis le '+fmt(currentUser.joined||today());
  // Avatar photo
  renderProfileAvatar(currentUser.avatar_url||null);
  // Bio
  const bioEl=document.getElementById('prof-bio-text');
  if(bioEl)bioEl.textContent=currentUser.bio||'Ajoute une bio…';

  // Enigma stats
  const enigmaDate=new Date().toISOString().slice(0,10);
  const[{data:reads},{data:qhist},{data:allAnec},{data:friendsData},{data:enigmaStats},{data:enigmaChoice}]=await Promise.all([
    sb.from('reads').select('*').eq('user_id',currentUser.id).order('date',{ascending:false}),
    sb.from('quiz_history').select('*').eq('user_id',currentUser.id).order('date',{ascending:false}),
    sb.from('anecdotes').select('*').lte('date',today()).order('date',{ascending:false}).limit(90),
    sb.from('friendships').select('id').or('requester_id.eq.'+currentUser.id+',addressee_id.eq.'+currentUser.id).eq('status','accepted'),
    sb.from('enigma_responses').select('*').eq('user_id',currentUser.id),
    sb.from('daily_enigma_choice').select('chooser_id').eq('date',enigmaDate).eq('chooser_id',currentUser.id).maybeSingle()
  ]);
  const r=reads||[],q=qhist||[],a=allAnec||[];
  const streak=computeStreak(r.map(x=>x.date));
  const avg=q.length?Math.round(q.reduce((acc,b)=>acc+b.pct,0)/q.length):0;
  const bestQuiz=q.length?Math.max(...q.map(x=>x.pct)):0;

  // XP & niveau
  const xp=calcXP(r.length,q.length,streak);
  currentUserXP=calcSLXP({reads:r.length,quizzes:q,enigmas:enigmaStats||[],streak});
  currentUserRank=getRank(currentUserXP);
  const nextSlRank=getNextRank(currentUserXP);
  const chip=document.getElementById('prof-level-chip');
  if(chip){chip.textContent=currentUserRank.label+' · '+currentUserRank.title;chip.style.color=currentUserRank.color;chip.style.borderColor=currentUserRank.color;chip.style.background=currentUserRank.bg;chip.style.boxShadow=currentUserRank.glow;}
  const xpCur=document.getElementById('prof-xp-cur');
  const xpNextEl=document.getElementById('prof-xp-next');
  const ring=document.getElementById('xp-ring-prog');
  const circ=289;
  if(nextSlRank){
    const pct=(currentUserXP-currentUserRank.minXP)/(nextSlRank.minXP-currentUserRank.minXP);
    if(ring)setTimeout(()=>{ring.style.strokeDashoffset=String(circ*(1-Math.min(1,Math.max(0,pct))));ring.style.stroke=currentUserRank.color;},100);
    if(xpCur)xpCur.textContent=currentUserXP.toLocaleString('fr-FR')+' XP';
    if(xpNextEl)xpNextEl.textContent='→ '+nextSlRank.label+' '+nextSlRank.minXP.toLocaleString('fr-FR')+' XP';
  }else{
    if(ring)setTimeout(()=>{ring.style.strokeDashoffset='0';ring.style.stroke=currentUserRank.color;},100);
    if(xpCur)xpCur.textContent=currentUserXP.toLocaleString('fr-FR')+' XP';
    if(xpNextEl)xpNextEl.textContent='🏆 Rang max !';
  }

  // Stats
  const sReads=document.getElementById('s-reads');if(sReads)sReads.textContent=r.length;
  const sQuizz=document.getElementById('s-quizz');if(sQuizz)sQuizz.textContent=q.length;
  const sAvg=document.getElementById('s-avg');if(sAvg)sAvg.textContent=avg+'%';

  // Streak card
  const streakEl=document.getElementById('s-streak');
  if(streakEl)streakEl.textContent=streak;
  const subEl=document.getElementById('streak-sub');
  if(subEl){
    if(streak===0)subEl.textContent='Lance-toi aujourd\'hui !';
    else if(streak<3)subEl.textContent='Bon début, continue !';
    else if(streak<7)subEl.textContent='Tu es en feu 🔥';
    else if(streak<30)subEl.textContent='Impressionnant, lâche rien !';
    else subEl.textContent='Légende absolue 👑';
  }

  // Thèmes explorés
  const readIds=new Set(r.map(x=>x.anecdote_id));
  const readAnec=a.filter(x=>readIds.has(x.id));
  const themesSet=new Set(readAnec.map(x=>x.theme));

  // Badges — données enrichies
  const perfectQuiz=q.filter(x=>x.pct>=100).length;
  const themeMap={};readAnec.forEach(x=>{const t=(x.theme||'').toLowerCase();if(t)themeMap[t]=(themeMap[t]||0)+1;});
  const favs=_histFavs.size;
  const shares=parseInt(localStorage.getItem('share_count')||'0');
  const hNow=new Date().getHours();
  if(hNow<7)localStorage.setItem('early_bird','1');
  if(hNow>=23)localStorage.setItem('night_owl','1');
  const earlyBird=!!localStorage.getItem('early_bird');
  const nightOwl=!!localStorage.getItem('night_owl');
  let duelsPlayed=0,duelsWon=0;
  try{
    const{data:myDuels}=await sb.from('duels').select('id,challenger_id,opponent_id,challenger_score,opponent_score').or('challenger_id.eq.'+currentUser.id+',opponent_id.eq.'+currentUser.id).eq('status','completed');
    duelsPlayed=(myDuels||[]).length;
    duelsWon=(myDuels||[]).filter(d=>{const ic=d.challenger_id===currentUser.id;return ic?d.challenger_score>d.opponent_score:d.opponent_score>d.challenger_score;}).length;
  }catch(e){}

  // Badges
  // Enigma badge data
  const enigmaR=enigmaStats||[];
  const enigmaCorrect=enigmaR.filter(x=>x.is_correct===true).length;
  const enigmaCatsSet=new Set(enigmaR.map(x=>x.category));
  const enigmaCatCounts={};enigmaR.forEach(x=>{if(x.is_correct)enigmaCatCounts[x.category]=(enigmaCatCounts[x.category]||0)+1;});
  const enigmaChooser=!!enigmaChoice;
  const badgeData={reads:r.length,streak,quizzes:q.length,avgQuiz:avg,bestQuiz,perfectQuiz,themes:themesSet.size,themeMap,friends:(friendsData||[]).length,duelsPlayed,duelsWon,favs,shares,earlyBird,nightOwl,enigmaTotal:enigmaR.length,enigmaCorrect,enigmaCats:enigmaCatsSet.size,enigmaChooser,enigmaLogique:enigmaCatCounts['logique']||0,enigmaHistorique:enigmaCatCounts['historique']||0,enigmaMaths:enigmaCatCounts['maths_recreatives']||0};
  const earnedCount=BADGES_DEF.filter(b=>b.check(badgeData)).length;
  const bcEl=document.getElementById('s-badges-count');
  if(bcEl)bcEl.textContent=earnedCount;
  const enigmeEl=document.getElementById('s-enigmes');
  if(enigmeEl)enigmeEl.textContent=enigmaR.length;
  buildQuizHistTab(q);buildBadgesTab(badgeData);
  checkAndAwardBadges(badgeData);
  buildIdentityCard(r,q,a);
  const adminEntry=document.getElementById('admin-entry');if(adminEntry)adminEntry.style.display='none';
  const adminHeaderBtn=document.getElementById('admin-header-btn');if(adminHeaderBtn)adminHeaderBtn.style.display=isAdmin()?'flex':'none';
  switchTab('badges');show('screen-profile');
}
function goBack(){show(prevScreen);}

function buildHistTab(allAnec,reads){
  const el=document.getElementById('tab-hist');if(!el)return;
  if(!allAnec||!allAnec.length){el.innerHTML='<div class="empty"><span class="empty-ico">📖</span><p>Aucune anecdote disponible pour l\'instant.</p></div>';return;}
  const readIds=new Set((reads||[]).map(r=>r.anecdote_id));
  el.innerHTML='<div class="hist-list">'+allAnec.map(a=>{
    const isRead=readIds.has(a.id);
    const isToday=a.date===today();
    return'<div class="hist-item" onclick="viewPastAnec(\''+a.id+'\')" style="cursor:pointer;">'+
      '<div class="hist-icon">'+(a.icon||'📜')+'</div>'+
      '<div style="flex:1;min-width:0;">'+
        '<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">'+
          '<div class="hist-theme">'+(a.theme||'Anecdote')+'</div>'+
          (isToday?'<span style="font-size:.5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:var(--a);color:#fff;padding:.1rem .35rem;border-radius:.25rem;">Aujourd\'hui</span>':'')+
          (isRead?'<span style="font-size:.5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--a);opacity:.7;">✓ Lu</span>':'<span style="font-size:.5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);">Non lu</span>')+
        '</div>'+
        '<div class="hist-preview">'+(a.anecdote||'').slice(0,80)+'…</div>'+
        '<div style="font-size:.6rem;color:var(--ink3);margin-top:.2rem;">Choisi par '+(a.chooser||'Communauté')+'</div>'+
      '</div>'+
      '<div class="hist-date">'+fmtShort(a.date)+'</div>'+
    '</div>';
  }).join('')+'</div>';
}

async function viewPastAnec(anecId){
  prevScreen='screen-profile';
  const[{data:anec},{data:questions}]=await Promise.all([
    sb.from('anecdotes').select('*').eq('id',anecId).single(),
    sb.from('questions').select('*').eq('anecdote_id',anecId)
  ]);
  if(!anec){showToast('⚠ Anecdote introuvable.');return;}
  todayAnec=anec;todayQs=questions||[];
  if(currentUser)await markRead();
  showAnec(false);updateNav('bn-hist');
}

function buildQuizHistTab(qhist){
  const el=document.getElementById('tab-quiz-hist');if(!el)return;
  if(!qhist||!qhist.length){el.innerHTML='<div class="empty"><span class="empty-ico">🎯</span><p>Aucun quiz compl\u00e9t\u00e9 pour l\'instant.</p></div>';return;}
  const avg=Math.round(qhist.reduce((a,b)=>a+b.pct,0)/qhist.length);
  el.innerHTML='<div class="q-result" style="margin-bottom:1rem;"><span class="qr-score">'+avg+'%</span><div class="qr-title">Score moyen</div></div><div class="prev-head">Historique</div>'+qhist.slice(0,10).map(q=>'<div class="prev-row"><span>'+fmtShort(q.date)+'</span><span style="font-weight:700;color:var(--a)">'+q.pct+'%</span></div>').join('');
}

async function buildAmisTab(){
  const el=document.getElementById('tab-amis');if(!el)return;
  el.innerHTML='<div id="pending-reqs-wrap" class="pending-requests-wrap"></div><div id="weekly-league-wrap" style="margin-bottom:1.25rem;"></div><div class="friend-search"><input id="friend-q" placeholder="Rechercher un pseudo\u2026"/><button onclick="searchFriend()">Rechercher</button></div><div id="friend-results"></div><div style="margin-top:1.5rem;"><div class="prev-head">Mes amis</div><div id="friend-list-own"></div></div>';
  const leagueEl=document.getElementById('weekly-league-wrap');
  const pendEl=document.getElementById('pending-reqs-wrap');
  await Promise.all([buildPendingRequests(pendEl),buildWeeklyLeague(leagueEl),loadFriends()]);
}

async function searchFriend(){
  const q=(document.getElementById('friend-q')?.value||'').trim();if(!q)return;
  const{data}=await sb.from('profiles').select('*').ilike('username','%'+q+'%').neq('id',currentUser.id).limit(5);
  const el=document.getElementById('friend-results');if(!el)return;
  if(!data||!data.length){el.innerHTML='<div class="empty"><span class="empty-ico">🔍</span><p>Aucun utilisateur trouv\u00e9.</p></div>';return;}
  el.innerHTML='<div style="margin-bottom:.65rem;font-size:.58rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);">R\u00e9sultats</div><div class="friend-list">'+data.map(u=>'<div class="friend-item"><div class="friend-av" onclick="viewUserProfile(\''+u.id+'\',\''+u.username+'\')" style="cursor:pointer;">'+u.username[0].toUpperCase()+'</div><div style="flex:1;cursor:pointer;" onclick="viewUserProfile(\''+u.id+'\',\''+u.username+'\')"><div class="friend-name">'+u.username+'</div></div><button class="btn-friend add" onclick="addFriend(\''+u.id+'\',\''+u.username+'\')">+ Ajouter</button></div>').join('')+'</div>';
}

async function addFriend(uid,uname){
  const{error}=await sb.from('friendships').insert({requester_id:currentUser.id,addressee_id:uid});
  if(error&&error.code==='23505'){showToast('D\u00e9j\u00e0 ami ou demande en attente.');return;}
  if(error){showToast('\u26a0 Erreur.');return;}
  showToast('\u2713 Demande envoy\u00e9e \u00e0 '+uname+' !');
}

async function loadFriends(){
  const el=document.getElementById('friend-list-own');if(!el)return;
  const{data}=await sb.from('friendships').select('*,req:profiles!friendships_requester_id_fkey(username),adr:profiles!friendships_addressee_id_fkey(username)').or('requester_id.eq.'+currentUser.id+',addressee_id.eq.'+currentUser.id);
  if(!data||!data.length){el.innerHTML='<div class="empty"><span class="empty-ico">👥</span><p>Aucun ami pour l\'instant.</p></div>';return;}
  el.innerHTML='<div class="friend-list">'+data.map(f=>{const isMe=f.requester_id===currentUser.id;const name=isMe?(f.adr?.username||'?'):(f.req?.username||'?');const sc=f.status==='accepted'?'accepted':'pending';const sl=f.status==='accepted'?'Ami':(isMe?'En attente':'Accepter ?');const fuid=isMe?f.addressee_id:f.requester_id;return'<div class="friend-item"><div class="friend-av" onclick="viewUserProfile(\''+fuid+'\',\''+name+'\')" style="cursor:pointer;">'+name[0].toUpperCase()+'</div><div style="flex:1;cursor:pointer;" onclick="viewUserProfile(\''+fuid+'\',\''+name+'\')" ><div class="friend-name">'+name+'</div></div><span class="friend-status '+sc+'">'+sl+'</span>'+(f.status==='pending'&&!isMe?'<button class="btn-friend accept" onclick="acceptFriend(\''+f.id+'\')">Accepter</button>':'')+'</div>';}).join('')+'</div>';
}

async function acceptFriend(fid){await sb.from('friendships').update({status:'accepted'}).eq('id',fid);showToast('✓ Ami ajouté !');checkFriendRequests();buildLeagueDashboard();}

function switchTab(name){
  const tabs=['badges','quiz-hist','stats','amis'];
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('on',tabs[i]===name));
  tabs.forEach(t=>{const p=document.getElementById('tab-'+t);if(p)p.classList.toggle('on',t===name);});
  if(name==='amis')buildAmisTab();
  if(name==='stats')buildStatsTab();
}

async function initRating(){
  const rs=document.getElementById('rating-section');
  if(!rs||!currentUser||!todayAnec){if(rs)rs.style.display='none';return;}
  rs.style.display='block';
  const{data:ex}=await sb.from('ratings').select('*').eq('user_id',currentUser.id).eq('anecdote_id',todayAnec.id).maybeSingle();
  curRating=ex?ex.stars:0;renderStars(curRating);
  const ci=document.getElementById('comment-input');if(ci){ci.value=ex?.comment||'';updateCommentCount();}
  const ok=document.getElementById('rating-saved');if(ok)ok.classList.toggle('on',!!ex);
  loadCommentsFeed();
}
function renderStars(v){document.querySelectorAll('.star').forEach((s,i)=>s.classList.toggle('on',i<v));}
function hoverStars(v){document.querySelectorAll('.star').forEach((s,i)=>s.classList.toggle('on',i<v));}
function resetStars(){renderStars(curRating);}
function clickStar(v){curRating=v;renderStars(v);}
function updateCommentCount(){const ci=document.getElementById('comment-input'),cc=document.getElementById('comment-count');if(ci&&cc)cc.textContent=(ci.value||'').length+' / 200';}
async function submitRating(){if(typeof completeBingoCell==='function')completeBingoCell(19);
  if(!currentUser||!todayAnec||curRating===0){showToast('\u26a0\ufe0f Choisissez au moins 1 \u00e9toile');return;}
  const comment=(document.getElementById('comment-input')?.value||'').trim();if(comment&&typeof completeBingoCell==='function')completeBingoCell(5);
  await sb.from('ratings').upsert({user_id:currentUser.id,anecdote_id:todayAnec.id,stars:curRating,comment},{onConflict:'user_id,anecdote_id'});
  const ok=document.getElementById('rating-saved');if(ok)ok.classList.add('on');
  showToast('\u2713 Avis enregistr\u00e9 !');
  loadCommentsFeed();
}

async function loadCommentsFeed(){
  const feed=document.getElementById('comments-feed');if(!feed||!todayAnec){if(feed)feed.style.display='none';return;}
  const{data:ratings}=await sb.from('ratings')
    .select('id,user_id,stars,comment,created_at')
    .eq('anecdote_id',todayAnec.id)
    .not('comment','is',null)
    .neq('comment','')
    .order('created_at',{ascending:false})
    .limit(20);
  if(!ratings||!ratings.length){feed.style.display='none';return;}
  const uids=[...new Set(ratings.map(r=>r.user_id))];
  const{data:profiles}=await sb.from('profiles').select('id,username,avatar_url').in('id',uids);
  const pMap={};const avMap={};(profiles||[]).forEach(p=>{pMap[p.id]=p.username;avMap[p.id]=p.avatar_url||'';});
  const now=new Date();
  function timeAgo(d){if(!d)return'';const s=Math.floor((now-new Date(d))/1000);if(s<120)return'il y a 1 min';if(s<3600)return'il y a '+Math.floor(s/60)+'min';if(s<86400)return'il y a '+Math.floor(s/3600)+'h';return'il y a '+Math.floor(s/86400)+'j';}
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  const avg=(ratings.reduce((a,b)=>a+b.stars,0)/ratings.length).toFixed(1);
  const avgEl=document.getElementById('rating-avg');if(avgEl)avgEl.textContent=avg+'★ ('+ratings.length+' avis)';
  feed.style.display='block';
  feed.innerHTML='<div class="comments-feed-title">'+ratings.length+' commentaire'+(ratings.length>1?'s':'')+' de la communauté</div>'+
    ratings.map(r=>{
      const uname=pMap[r.user_id]||'Anonyme';
      const delBtn=isMod()?'<button class="comment-del-btn" onclick="deleteCommentInline(&quot;'+r.user_id+'&quot;,&quot;'+r.id+'&quot;,this)" title="Supprimer">🗑</button>':'';
      return '<div class="comment-item" id="ci-'+r.id+'">'+
        '<div class="comment-item-head">'+
          '<div class="comment-item-av" style="cursor:pointer;overflow:hidden;" onclick="viewUserProfile(\''+r.user_id+'\',\''+uname+'\')">'+(avMap[r.user_id]?'<img src="'+avMap[r.user_id]+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>':uname[0].toUpperCase())+'</div>'+
          '<div class="comment-item-name" style="cursor:pointer" onclick="viewUserProfile(\''+r.user_id+'\',\''+uname+'\')">'+ uname+'</div>'+
          '<span class="comment-item-stars">'+stars(r.stars)+'</span>'+
          '<span class="comment-item-date">'+timeAgo(r.created_at)+'</span>'+
          delBtn+
        '</div>'+
        '<div class="comment-item-text">'+r.comment.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>'+
      '</div>';
    }).join('');
}

async function deleteCommentInline(uid, ratingId, btn){
  if(!isMod())return;
  if(!confirm('Supprimer ce commentaire ?'))return;
  btn.disabled=true;btn.textContent='…';
  // Set comment to empty string (keeps the rating but removes comment)
  const{error}=await sb.from('ratings').update({comment:''}).eq('user_id',uid).eq('anecdote_id',todayAnec.id);
  if(error){btn.disabled=false;btn.textContent='🗑';showToast('Erreur: '+error.message);return;}
  const card=document.getElementById('ci-'+ratingId);
  if(card){card.style.opacity='0';card.style.transition='opacity .3s';setTimeout(()=>{card.remove();},300);}
  showToast('✓ Commentaire supprimé');
}

// shareAnec() defined in v2 section below

// ── Système XP / Niveaux / Badges ──
const PROF_COLORS=['#22d3ee','#a855f7','#f97316','#34d399','#f472b6','#fbbf24'];
const LEVELS=[
  {name:'Novice',min:0},{name:'Curieux',min:100},{name:'Explorateur',min:300},
  {name:'Lettré',min:600},{name:'Expert',min:1000},{name:'Sage',min:2000}
];
const BADGES_DEF=[
  // ── Lecture ──────────────────────────────────────────────────────────────
  {id:'first',   icon:'🌱',name:'Première graine', desc:'Première anecdote lue',         rarity:'common',   check:d=>d.reads>=1},
  {id:'read10',  icon:'📚',name:'Lecteur assidu',  desc:'10 anecdotes lues',             rarity:'common',   check:d=>d.reads>=10},
  {id:'read50',  icon:'🏛️',name:'Érudit',          desc:'50 anecdotes lues',             rarity:'rare',     check:d=>d.reads>=50},
  {id:'read100', icon:'🌍',name:'Encyclopédiste',  desc:'100 anecdotes lues',            rarity:'epic',     check:d=>d.reads>=100},
  {id:'read365', icon:'📜',name:'Archiviste',      desc:'365 anecdotes lues',            rarity:'legendary',check:d=>d.reads>=365},
  // ── Streak ───────────────────────────────────────────────────────────────
  {id:'fire3',   icon:'🔥',name:'En feu',          desc:'3 jours de suite',              rarity:'common',   check:d=>d.streak>=3},
  {id:'week',    icon:'⚡',name:'Habitué',          desc:'7 jours de suite',              rarity:'common',   check:d=>d.streak>=7},
  {id:'fort',    icon:'💪',name:'Accro',           desc:'14 jours de suite',             rarity:'rare',     check:d=>d.streak>=14},
  {id:'moon',    icon:'🌙',name:'Mois lunaire',    desc:'30 jours de suite',             rarity:'rare',     check:d=>d.streak>=30},
  {id:'shield',  icon:'🛡️',name:'Invincible',      desc:'60 jours de suite',             rarity:'epic',     check:d=>d.streak>=60},
  {id:'cent',    icon:'💯',name:'Centurion',       desc:'100 jours de suite',            rarity:'epic',     check:d=>d.streak>=100},
  {id:'legend',  icon:'👑',name:'Légende absolue', desc:'365 jours de suite',            rarity:'legendary',check:d=>d.streak>=365},
  // ── Quiz ─────────────────────────────────────────────────────────────────
  {id:'quiz1',   icon:'🎯',name:'Premier quiz',    desc:'Premier quiz complété',         rarity:'common',   check:d=>d.quizzes>=1},
  {id:'quiz10',  icon:'🏆',name:'Quizzeur',        desc:'10 quiz complétés',             rarity:'common',   check:d=>d.quizzes>=10},
  {id:'quiz100', icon:'🎓',name:'Maître du quiz',  desc:'100 quiz complétés',            rarity:'epic',     check:d=>d.quizzes>=100},
  {id:'ace',     icon:'⭐',name:'Sans faute',      desc:'Quiz 100% parfait',             rarity:'common',   check:d=>d.bestQuiz>=100},
  {id:'ace5',    icon:'🌟',name:'Perfectionniste', desc:'5 quiz parfaits',               rarity:'rare',     check:d=>d.perfectQuiz>=5},
  {id:'brain',   icon:'🧠',name:'Expert',          desc:'Moyenne > 80%',                 rarity:'rare',     check:d=>d.avgQuiz>80},
  // ── Thèmes ───────────────────────────────────────────────────────────────
  {id:'map4',    icon:'🗺️',name:'Explorateur',     desc:'4 thèmes découverts',           rarity:'common',   check:d=>d.themes>=4},
  {id:'atlas',   icon:'🌐',name:'Grand voyageur',  desc:'Tous les 8 thèmes explorés',    rarity:'epic',     check:d=>d.themes>=8},
  {id:'hist5',   icon:'🏛️',name:'Historien',       desc:'5 anecdotes Histoire',          rarity:'common',   check:d=>(d.themeMap?.histoire||0)>=5},
  {id:'sci5',    icon:'🔬',name:'Scientifique',    desc:'5 anecdotes Science',           rarity:'common',   check:d=>(d.themeMap?.science||0)>=5},
  {id:'nat5',    icon:'🌿',name:'Naturaliste',     desc:'5 anecdotes Nature',            rarity:'common',   check:d=>(d.themeMap?.nature||0)>=5},
  {id:'ins5',    icon:'🤯',name:'Bizarre Bizarre', desc:'5 anecdotes Insolite',          rarity:'common',   check:d=>(d.themeMap?.insolite||0)>=5},
  {id:'spc5',    icon:'🚀',name:'Astronaute',      desc:'5 anecdotes Espace',            rarity:'common',   check:d=>(d.themeMap?.espace||0)>=5},
  // ── Social ───────────────────────────────────────────────────────────────
  {id:'social',  icon:'👥',name:'Social',          desc:'Premier ami ajouté',            rarity:'common',   check:d=>d.friends>=1},
  {id:'duel1',   icon:'⚔️',name:'Challenger',      desc:'Premier duel joué',             rarity:'common',   check:d=>d.duelsPlayed>=1},
  {id:'duelw1',  icon:'🥇',name:'Vainqueur',       desc:'Premier duel gagné',            rarity:'common',   check:d=>d.duelsWon>=1},
  {id:'duelw5',  icon:'🛡️',name:'Gladiateur',      desc:'5 duels gagnés',                rarity:'rare',     check:d=>d.duelsWon>=5},
  {id:'share1',  icon:'📣',name:'Ambassadeur',     desc:'Première anecdote partagée',    rarity:'common',   check:d=>d.shares>=1},
  {id:'fav10',   icon:'❤️',name:'Collectionneur',  desc:'10 anecdotes en favoris',       rarity:'common',   check:d=>d.favs>=10},

  // ── Énigmes ──────────────────────────────────────────────────────────────
  {id:'enigme_first',    icon:'🔮',name:'Premier défi',      desc:'Première énigme résolue',        rarity:'common',   check:d=>(d.enigmaTotal||0)>=1},
  {id:'enigme_correct5', icon:'🧩',name:'Résolveur',         desc:'5 bonnes réponses',              rarity:'common',   check:d=>(d.enigmaCorrect||0)>=5},
  {id:'enigme_correct20',icon:'🏆',name:'Maître des énigmes',desc:'20 bonnes réponses',             rarity:'rare',     check:d=>(d.enigmaCorrect||0)>=20},
  {id:'enigme_correct50',icon:'🌟',name:'Grand Sphinx',      desc:'50 bonnes réponses',             rarity:'epic',     check:d=>(d.enigmaCorrect||0)>=50},
  {id:'enigme_all_cats', icon:'🎯',name:'Polyglotte',        desc:'Toutes les catégories explorées', rarity:'epic',     check:d=>(d.enigmaCats||0)>=9},
  {id:'enigme_chooser',  icon:'👁️',name:'Éclaireur',         desc:'A choisi la catégorie du jour',  rarity:'common',   check:d=>d.enigmaChooser},
  {id:'enigme_logique',  icon:'🧠',name:'Logicien',          desc:'5 énigmes Logique résolues',     rarity:'common',   check:d=>(d.enigmaLogique||0)>=5},
  {id:'enigme_historique',icon:'🏛️',name:'Chroniqueur',     desc:'5 énigmes Historique résolues',  rarity:'common',   check:d=>(d.enigmaHistorique||0)>=5},
  {id:'enigme_maths',    icon:'🔢',name:'Calculateur',       desc:'5 Maths récréatives résolues',   rarity:'common',   check:d=>(d.enigmaMaths||0)>=5},

  // ── Spécial ──────────────────────────────────────────────────────────────
  {id:'early',   icon:'🌅',name:'Lève-tôt',        desc:'Ouvert avant 7h du matin',      rarity:'rare',     check:d=>d.earlyBird},
  {id:'owl',     icon:'🦉',name:'Noctambule',       desc:'Ouvert après 23h',              rarity:'rare',     check:d=>d.nightOwl},
];

function calcXP(reads,quizzes,streak){return reads*10+quizzes*20+streak*5;}
function calcLevel(xp){
  let lvl=LEVELS[0],next=LEVELS[1];
  for(let i=LEVELS.length-1;i>=0;i--){if(xp>=LEVELS[i].min){lvl=LEVELS[i];next=LEVELS[i+1]||null;break;}}
  return{lvl,next};
}

// ══ SOLO LEVELING — SYSTÈME DE RANGS ════════════════════════════════════════════════
const RANKS=[
  {id:'E', label:'E', title:'Néophyte',   minXP:0,      color:'#9ca3af', bg:'rgba(156,163,175,.08)', glow:'0 0 16px rgba(156,163,175,.25)'},
  {id:'D', label:'D', title:'Apprenti',   minXP:500,    color:'#60a5fa', bg:'rgba(96,165,250,.08)',  glow:'0 0 16px rgba(96,165,250,.3)'},
  {id:'C', label:'C', title:'Érudit',     minXP:1500,   color:'#34d399', bg:'rgba(52,211,153,.08)',  glow:'0 0 16px rgba(52,211,153,.3)'},
  {id:'B', label:'B', title:'Chercheur',  minXP:4000,   color:'#fbbf24', bg:'rgba(251,191,36,.08)',  glow:'0 0 16px rgba(251,191,36,.3)'},
  {id:'A', label:'A', title:'Maître',     minXP:10000,  color:'#f97316', bg:'rgba(249,115,22,.1)',   glow:'0 0 20px rgba(249,115,22,.35)'},
  {id:'S', label:'S', title:'Archiviste', minXP:25000,  color:'#a855f7', bg:'rgba(168,85,247,.1)',   glow:'0 0 24px rgba(168,85,247,.45)'},
  {id:'\u2605', label:'\u2605', title:'Légendaire', minXP:75000,  color:'#ec4899', bg:'rgba(236,72,153,.1)',   glow:'0 0 28px rgba(236,72,153,.5)'},
];

function calcSLXP({reads=0,quizzes=[],enigmas=[],streak=0}){
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
function getRank(xp){let r=RANKS[0];for(let i=RANKS.length-1;i>=0;i--){if(xp>=RANKS[i].minXP){r=RANKS[i];break;}}return r;}
function getNextRank(xp){for(let i=0;i<RANKS.length;i++){if(xp<RANKS[i].minXP)return RANKS[i];}return null;}

function applyProfileColor(color,save=true){
  if(save)localStorage.setItem('adj_prof_color',color);
  document.documentElement.style.setProperty('--prof-color',color);
  // Animer la ring et le glow de l'avatar
  const ring=document.getElementById('prof-av-ring');
  if(ring)ring.style.borderColor=color;
  const av=document.getElementById('prof-av');
  if(av)av.style.color=color;
  // Header avatar btn
  const avBtn=document.getElementById('av-btn');
  if(avBtn){avBtn.style.borderColor=color;avBtn.style.color=color;avBtn.style.boxShadow='0 0 14px '+color+'55';}
  // Sync swatches
  document.querySelectorAll('.color-swatch').forEach(s=>{
    const sc=s.getAttribute('data-color');
    s.classList.toggle('sel',sc===color);
  });
}

function initColorPicker(){
  const sw=document.getElementById('color-swatches');if(!sw)return;
  const cur=localStorage.getItem('adj_prof_color')||PROF_COLORS[0];
  sw.innerHTML=PROF_COLORS.map(c=>'<div class="color-swatch'+(c===cur?' sel':'')+'" data-color="'+c+'" style="background:'+c+'" onclick="applyProfileColor(\''+c+'\')" title="'+c+'"></div>').join('');
}

function toggleColorPicker(){
  const cp=document.getElementById('color-picker');if(!cp)return;
  const visible=cp.style.display!=='none'&&cp.style.display!=='';
  cp.style.display=visible?'none':'block';
  if(!visible)initColorPicker();
}

function buildBadgesTab(data){
  const el=document.getElementById('tab-badges');if(!el)return;
  const earned=BADGES_DEF.filter(b=>b.check(data));
  const locked=BADGES_DEF.filter(b=>!b.check(data));
  const RARITY_COLOR={common:'',rare:'border-color:#3b82f6',epic:'border-color:#9333ea',legendary:'border-color:#f59e0b'};
  const RARITY_LABEL={common:'',rare:'Rare',epic:'Épique',legendary:'Légendaire'};
  const card=(b,isEarned)=>{
    const rc=isEarned?RARITY_COLOR[b.rarity||'common']:'';
    const rl=isEarned&&b.rarity&&b.rarity!=='common'?'<div class="badge-rarity-lbl" style="font-size:.42rem;font-weight:700;letter-spacing:.08em;color:#9333ea;margin-top:.1rem">'+RARITY_LABEL[b.rarity]+'</div>':'';
    const glowStyle=isEarned&&b.rarity==='legendary'?'box-shadow:0 0 16px rgba(245,158,11,.4);':isEarned&&b.rarity==='epic'?'box-shadow:0 0 10px rgba(147,51,234,.3);':'';
    return '<div class="badge-card '+(isEarned?'earned':'locked')+'" style="'+rc+';'+glowStyle+'">'+
      '<div class="badge-icon">'+b.icon+'</div>'+
      '<div class="badge-name">'+b.name+'</div>'+
      '<div class="badge-desc">'+b.desc+'</div>'+
      rl+'</div>';
  };
  el.innerHTML='<div class="badges-top">'+earned.length+' / '+BADGES_DEF.length+' badges débloqués</div>'
    +'<div class="badges-grid">'+earned.map(b=>card(b,true)).join('')+locked.map(b=>card(b,false)).join('')+'</div>';
}

function toggleDark(){/* dark mode permanent */}
function updateToggleIcon(){const btn=document.getElementById('dark-toggle');if(!btn)return;btn.textContent=document.documentElement.classList.contains('dark')?'☀️':'🌙';}

function goPlay(){
  prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';
  updateNav('bn-play');
  renderPlayChoice();
  show('screen-multi');
}

function goLigue(){
  prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';
  updateNav('bn-league');
  document.getElementById('multi-title-txt').innerHTML='<em>Ligue</em>';
  document.getElementById('multi-sub').textContent='';
  const backBtn=document.querySelector('#screen-multi .btn-back');
  if(backBtn)backBtn.style.display='none';
  show('screen-multi');
  buildLeagueDashboard();
}

async function buildLeagueDashboard(){
  if(!currentUser){
    document.getElementById('multi-content').innerHTML='<div style="text-align:center;padding:2rem;"><p style="color:var(--ink3);margin-bottom:1rem;">Connecte-toi pour accéder à la ligue.</p><button class="btn-main" onclick="show(\'screen-login\')">Se connecter</button></div>';
    return;
  }
  document.getElementById('multi-content').innerHTML=
    '<div class="sl-section-header" style="margin-bottom:1rem;"><span class="sl-section-icon">⚔</span><span>LIGUE HEBDOMADAIRE</span></div>'+
    '<div style="display:flex;gap:.6rem;margin-bottom:1.25rem;">'+
    '<button class="sl-btn-primary" style="flex:1;" onclick="goLeaguePlay()">⚡ Jouer en Ligue</button>'+
    '<button class="btn-sec" style="flex:1;margin-top:0;" onclick="goMultiPlay()">🎮 Privée</button>'+
    '</div>'+
    '<div id="ldash-ranking" style="margin-bottom:1.5rem;"></div>'+
    '<div id="ldash-pending" style="margin-bottom:.5rem;"></div>'+
    '<div class="friend-search" style="margin-bottom:.75rem;"><input id="friend-q" placeholder="Rechercher un pseudo…"/><button onclick="searchFriend()">Rechercher</button></div>'+
    '<div id="friend-results"></div>'+
    '<div style="margin-top:1rem;"><div class="sl-section-header" style="margin-bottom:.75rem;"><span class="sl-section-icon">👥</span><span>ALLIÉS</span></div><div id="friend-list-own"></div></div>';
  await buildWeeklyLeague(document.getElementById('ldash-ranking'));
  await buildPendingRequests(document.getElementById('ldash-pending'));
  await loadFriends();
}

function renderPlayChoice(){
  document.getElementById('multi-title-txt').innerHTML='<em>Jouer</em>';
  document.getElementById('multi-sub').textContent='';
  const backBtn=document.querySelector('#screen-multi .btn-back');
  if(backBtn)backBtn.style.display='block';
  document.getElementById('multi-content').innerHTML=''
    +'<div class="sl-play-gates">'
    +'<div class="sl-play-gate" onclick="goSoloPlay()">'
    +'<div class="sl-play-gate-hd"><span class="sl-arena-tag" style="color:#34d399;border-color:#34d399;">C-RANG</span></div>'
    +'<div class="sl-play-gate-bd"><span class="sl-arena-ico">🎯</span><span class="sl-arena-name">SOLO</span></div>'
    +'<div class="sl-arena-desc">Teste tes connaissances sur les anecdotes.</div>'
    +'<div style="text-align:right;margin-top:.6rem;"><span class="sl-arena-enter">► ENTRER</span></div>'
    +'</div>'
    +'<div class="sl-play-gate" onclick="goMultiPlay()">'
    +'<div class="sl-play-gate-hd"><span class="sl-arena-tag" style="color:#fbbf24;border-color:#fbbf24;">B-RANG</span></div>'
    +'<div class="sl-play-gate-bd"><span class="sl-arena-ico">🎮</span><span class="sl-arena-name">PARTIE PRIV\u00c9E</span></div>'
    +'<div class="sl-arena-desc">Affronte tes amis en temps r\u00e9el.</div>'
    +'<div style="text-align:right;margin-top:.6rem;"><span class="sl-arena-enter">► ENTRER</span></div>'
    +'</div>'
    +'<div class="sl-play-gate" onclick="showDuelLobby()">'
    +'<div class="sl-play-gate-hd"><span class="sl-arena-tag" style="color:#f97316;border-color:#f97316;">A-RANG</span></div>'
    +'<div class="sl-play-gate-bd"><span class="sl-arena-ico">\u2694\ufe0f</span><span class="sl-arena-name">DUEL QUIZ</span></div>'
    +'<div class="sl-arena-desc">Tour par tour, choisis le th\u00e8me, bats ton adversaire.</div>'
    +'<div style="text-align:right;margin-top:.6rem;"><span class="sl-arena-enter">► ENTRER</span></div>'
    +'</div>'
    +'</div>';
}
async function goSoloPlay(){
  document.getElementById('multi-title-txt').innerHTML='<em>Quiz</em> Solo';
  document.getElementById('multi-sub').textContent='Chargement de tes anecdotes…';
  document.getElementById('multi-content').innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--ink3);font-size:.8rem;">⏳ Chargement…</div>';

  if(!currentUser){
    // Pas connecté → quiz du jour uniquement
    show('screen-anec');updateNav('bn-anec');
    setTimeout(()=>{const a=document.getElementById('quiz-solo-area');if(a)a.scrollIntoView({behavior:'smooth',block:'start'});},200);
    return;
  }

  const{data:reads}=await sb.from('reads').select('anecdote_id').eq('user_id',currentUser.id);
  const anecIds=(reads||[]).map(r=>r.anecdote_id);

  if(!anecIds.length){
    document.getElementById('multi-sub').textContent='';
    document.getElementById('multi-content').innerHTML='<div class="quiz-gate"><span class="quiz-gate-icon">📖</span><h3>Aucune anecdote lue</h3><p style="color:var(--ink3);font-size:.8rem;margin-top:.4rem;">Lis des anecdotes pour débloquer le quiz de révision !</p><button class="btn-main" style="margin-top:1rem;" onclick="goHome();updateNav(\'bn-anec\');">Lire maintenant</button></div>';
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
  document.getElementById('multi-sub').textContent=anecIds.length+' anecdotes · '+total+' questions disponibles';
  document.getElementById('multi-content').innerHTML='<div class="quiz-gate"><span class="quiz-gate-icon">🧠</span><h3>Quiz de révision</h3><p>Combien de questions ?</p><div class="q-count-row" style="display:flex;gap:.5rem;justify-content:center;margin:.75rem 0;">'+btnHtml+'</div><button class="btn-quiz" onclick="startSoloHistoryQuiz()">Lancer le quiz</button></div>';
}

function selectSoloCount(btn,n){document.querySelectorAll('#multi-content .btn-q-count').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');}

function startSoloHistoryQuiz(){
  const allQs=window._soloHistoryQs||[];
  const selBtn=document.querySelector('#multi-content .btn-q-count.sel');
  const count=selBtn?parseInt(selBtn.textContent):Math.min(10,allQs.length);
  const qs=[...allQs].sort(()=>Math.random()-.5).slice(0,count);
  window._soloQuizState={questions:qs,idx:0,score:0,active:true};
  renderSoloQuizQ();
}

function renderSoloQuizQ(){
  const{questions,idx}=window._soloQuizState,q=questions[idx],prog=Math.round(idx/questions.length*100),isVF=q.type==='vf';
  const opts=isVF?'<div class="q-opts q-vf">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerSoloQ('+i+')">'+o+'</button>').join('')+'</div>':'<div class="q-opts">'+q.options.map((o,i)=>'<button class="q-opt" onclick="answerSoloQ('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('')+'</div>';
  const _anec=window._soloAnecMap&&window._soloAnecMap[q.anecdote_id];

  document.getElementById('multi-content').innerHTML='<div class="q-block"><div class="q-header"><span class="q-prog-txt">Question '+(idx+1)+' / '+questions.length+'</span></div><div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div><div class="q-body"><span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span><div class="q-text">'+q.question+'</div>'+opts+'<div class="q-fb" id="q-fb-solo"></div><button class="btn-next" id="btn-next-solo" onclick="nextSoloQ()">→ Suite</button></div></div>';
}

function answerSoloQ(i){
  const q=window._soloQuizState.questions[window._soloQuizState.idx];
  const opts=document.querySelectorAll('#multi-content .q-opt');opts.forEach(b=>b.disabled=true);
  const ok=i===q.answer;if(ok)window._soloQuizState.score++;
  opts[i].classList.add(ok?'ok':'err');if(!ok&&q.answer<opts.length)opts[q.answer].classList.add('ok');
  const fb=document.getElementById('q-fb-solo');if(fb){fb.textContent=q.explanation||'';fb.className='q-fb on '+(ok?'ok':'err');}
  const btn=document.getElementById('btn-next-solo');if(btn)btn.classList.add('on');
}

function nextSoloQ(){window._soloQuizState.idx++;if(window._soloQuizState.idx>=window._soloQuizState.questions.length)finishSoloHistoryQuiz();else renderSoloQuizQ();}

async function finishSoloHistoryQuiz(){
  window._soloQuizState.active=false;
  const{score,questions}=window._soloQuizState;
  const pct=Math.round(score/questions.length*100);
  if(currentUser){try{await sb.from('quiz_history').insert({user_id:currentUser.id,anecdote_id:questions[0].anecdote_id,score,total:questions.length,pct,date:today()});}catch(_){}}
  const e=pct>=80?'🏆':pct>=60?'⭐':'💪',t=pct>=80?'Excellent !':pct>=60?'Bien joué !':'Continue !',m=pct>=80?'Parfaite maîtrise !':pct>=60?'Solide ! Reviens demain.':'Chaque jour on apprend.';
  document.getElementById('multi-content').innerHTML='<div class="q-result"><span class="qr-emoji">'+e+'</span><span class="qr-score">'+pct+'%</span><div class="qr-title">'+t+'</div><div class="qr-msg">'+m+'</div><div style=\"display:flex;gap:.6rem;margin-top:1.25rem;justify-content:center;\"><button class=\"btn-sec\" onclick=\"goHome();updateNav(&apos;bn-anec&apos;)\">← Accueil</button><button class=\"btn-main\" onclick=\"goSoloPlay()\">Rejouer</button></div></div>';
}

function goMultiPlay(){if(typeof completeBingoCell==='function'){localStorage.setItem('bingo_multi','1');completeBingoCell(22);}
  if(!currentUser){showToast('⚠ Connecte-toi pour jouer en multijoueur !');show('screen-login');return;}
  document.getElementById('multi-title-txt').innerHTML='<em>Quiz</em> Multijoueur';
  document.getElementById('multi-sub').textContent='Créez une salle ou rejoignez-en une avec un code.';
  renderMultiLobbyChoice();
}

function goMulti(){goPlay();}

function renderMultiLobbyChoice(){
  document.getElementById('multi-content').innerHTML=
    '<div class="multi-grid">'+
    '<div class="multi-card" onclick="showCreateForm()"><span class="multi-card-icon">🎮</span><div class="multi-card-title">Créer une salle</div><div class="multi-card-desc">Hébergez une partie et invitez vos amis avec un code à 4 chiffres.</div></div>'+
    '<div class="multi-card" onclick="showJoinForm()"><span class="multi-card-icon">🔗</span><div class="multi-card-title">Rejoindre</div><div class="multi-card-desc">Entrez le code donné par l\'hôte pour rejoindre sa partie.</div></div>'+
    '</div>';
}
function showCreateForm(){
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:340px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div style="font-size:.56rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--a);margin-bottom:.2rem;">Partie privée</div>'+
    '<div style="font-family:\'DM Serif Display\',serif;font-size:1.5rem;font-style:italic;color:var(--ink);margin-bottom:1.1rem;">Combien de questions ?</div>'+
    '<div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">'+
    [5,8,10,15,20].map(n=>'<button class="btn-q-count'+(n===10?' sel':'')+'" onclick="selectRoomCount(this,'+n+')">'+n+'</button>').join('')+
    '</div>'+
    '</div>'+
    '<button class="btn-main" onclick="createRoom()">Créer la salle →</button>'+
    '<div style="text-align:center;margin-top:.9rem;"><a style="color:var(--ink3);cursor:pointer;font-size:.74rem;" onclick="renderMultiLobbyChoice()">← Retour</a></div>'+
    '</div>';
}
function selectRoomCount(btn,n){document.querySelectorAll('#multi-content .btn-q-count').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');}

function showJoinForm(){
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:320px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div style="font-size:.56rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--a);margin-bottom:.2rem;">Rejoindre une salle</div>'+
    '<div style="font-family:\'DM Serif Display\',serif;font-size:1.5rem;font-style:italic;color:var(--ink);margin-bottom:1rem;">Entre le code</div>'+
    '<input class="room-code-input" id="join-code" placeholder="0000" maxlength="4" style="border-radius:.5rem;margin-bottom:0;" oninput="this.value=this.value.replace(/\\D/g,\'\')"/>'+
    '</div>'+
    '<button class="btn-main" onclick="joinRoom()">Rejoindre la salle →</button>'+
    '<div style="text-align:center;margin-top:.9rem;"><a style="color:var(--ink3);cursor:pointer;font-size:.74rem;" onclick="renderMultiLobbyChoice()">← Retour</a></div>'+
    '</div>';
}

async function createRoom(){
  if(!currentUser){showToast('⚠ Connexion requise.');return;}
  const code=String(Math.floor(1000+Math.random()*9000));
  const selQBtn=document.querySelector('#multi-content .btn-q-count.sel');const qCount=selQBtn?parseInt(selQBtn.textContent):10;
  const{data:allQs,error:qErr}=await sb.from('questions').select('*').limit(500);
  if(qErr||!allQs||!allQs.length){showToast('⚠ Impossible de charger les questions.');return;}
  const questions=[...allQs].sort(()=>Math.random()-.5).slice(0,Math.min(allQs.length,qCount));
  const insertData={code,host_id:currentUser.id,status:'waiting',questions};
  if(todayAnec)insertData.anecdote_id=todayAnec.id;
  const{data:session,error}=await sb.from('quiz_sessions').insert(insertData).select().single();
  if(error){showToast('⚠ Erreur: '+error.message);return;}
  await sb.from('quiz_participants').insert({session_id:session.id,user_id:currentUser.id,username:currentUser.username,score:0});
  multiState={session,questions:session.questions,qIdx:0,score:0,answered:false,isHost:true};
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:340px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div class="lobby-code-lbl">Code de la salle</div>'+
    '<div class="lobby-code">'+code+'</div>'+
    '<button onclick="navigator.clipboard.writeText(\''+code+'\').then(()=>showToast(\'✓ Code copié !\'))" style="margin-top:.65rem;padding:.32rem 1.1rem;border-radius:.5rem;border:1px solid var(--a);background:var(--adim);color:var(--a);font-family:inherit;font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;cursor:pointer;">📋 Copier le code</button>'+
    '</div>'+
    '<div id="multi-scores" style="margin-top:.5rem;"></div>'+
    '<button class="btn-main" style="margin-top:1rem;" onclick="startMultiGame()">🎮 Lancer la partie</button>'+
    '</div>';
  document.getElementById('multi-sub').textContent='En attente de joueurs...';
  multiChannel=sb.channel('room:'+code)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'quiz_participants',filter:'session_id=eq.'+session.id},()=>loadMultiScores())
    .on('broadcast',{event:'game_start'},(p)=>startMultiClient(p.payload))
    .on('broadcast',{event:'player_ready'},(p)=>{multiState.readyPlayers=multiState.readyPlayers||new Set();multiState.readyPlayers.add(p.payload?.userId);checkMultiAllReady(p.payload?.qIdx);})
    .on('broadcast',{event:'game_end'},()=>showMultiScoreboard())
    .subscribe();
  loadMultiScores();
}

async function joinRoom(){
  const code=document.getElementById('join-code')?.value?.trim();
  if(!code||code.length!==4){showToast('⚠ Code invalide');return;}
  const{data:session,error}=await sb.from('quiz_sessions').select('*').eq('code',code).eq('status','waiting').maybeSingle();
  if(error||!session){showToast('⚠ Salle introuvable ou partie déjà commencée');return;}
  const{error:e2}=await sb.from('quiz_participants').insert({session_id:session.id,user_id:currentUser.id,username:currentUser.username,score:0});
  if(e2&&!e2.message.includes('duplicate')){showToast('⚠ '+e2.message);return;}
  multiState={session,questions:session.questions,qIdx:0,score:0,answered:false,isHost:false};
  document.getElementById('multi-content').innerHTML=
    '<div style="max-width:340px;margin:0 auto;">'+
    '<div class="lobby-box" style="border-radius:var(--card-radius);text-align:center;margin-bottom:1rem;">'+
    '<div class="lobby-code-lbl">Rejoint la salle</div>'+
    '<div class="lobby-code">'+code+'</div>'+
    '</div>'+
    '<div id="multi-scores" style="margin-top:.5rem;"></div>'+
    '<div style="text-align:center;margin-top:1rem;padding:.85rem;border-radius:.75rem;background:var(--adim);border:1px solid var(--b1);">'+
    '<div style="width:7px;height:7px;border-radius:50%;background:var(--a);margin:0 auto .5rem;box-shadow:0 0 8px var(--aglow);animation:pulse-c 1.4s ease-in-out infinite;"></div>'+
    '<div style="font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--a);">En attente du lancement…</div>'+
    '</div>'+
    '</div>';
  document.getElementById('multi-sub').textContent="En attente de l'hôte…";
  multiChannel=sb.channel('room:'+code)
    .on('broadcast',{event:'game_start'},(p)=>startMultiClient(p.payload))
    .on('broadcast',{event:'player_ready'},(p)=>{multiState.readyPlayers=multiState.readyPlayers||new Set();multiState.readyPlayers.add(p.payload?.userId);checkMultiAllReady(p.payload?.qIdx);})
    .on('broadcast',{event:'game_end'},()=>showMultiScoreboard())
    .subscribe();
  loadMultiScores();
}

async function startMultiGame(){
  const questions=multiState.questions;
  const{data:parts}=await sb.from('quiz_participants').select('user_id').eq('session_id',multiState.session.id);
  const totalPlayers=Math.max(1,(parts||[]).length);
  multiState.totalPlayers=totalPlayers;
  await sb.from('quiz_sessions').update({status:'playing'}).eq('id',multiState.session.id);
  await multiChannel.send({type:'broadcast',event:'game_start',payload:{questions,totalPlayers}});
  startMultiClient();
}

function startMultiClient(data){
  if(data){
    if(Array.isArray(data)){if(data.length)multiState.questions=data;}
    else{if(data.questions&&data.questions.length)multiState.questions=data.questions;if(data.totalPlayers)multiState.totalPlayers=data.totalPlayers;}
  }
  multiState.readyPlayers=new Set();
  renderMultiQ(0);
}

function renderMultiQ(idx){
  if(!multiState||!multiState.questions||idx>=multiState.questions.length){showMultiScoreboard();return;}
  multiState.qIdx=idx;multiState.answered=false;
  const q=multiState.questions[idx],prog=Math.round(idx/multiState.questions.length*100),isVF=q.type==='vf';
  const opts=isVF?'<div class="q-opts q-vf">'+q.options.map((o,i)=>'<button class="q-opt" id="mopt-'+i+'" onclick="submitMultiAnswer('+i+')">'+o+'</button>').join('')+'</div>':'<div class="q-opts">'+q.options.map((o,i)=>'<button class="q-opt" id="mopt-'+i+'" onclick="submitMultiAnswer('+i+')">'+String.fromCharCode(65+i)+'. '+o+'</button>').join('')+'</div>';
  document.getElementById('multi-content').innerHTML='<div class="q-block"><div class="q-header"><span class="q-prog-txt">Question '+(idx+1)+' / '+multiState.questions.length+'</span></div><div class="q-prog-bar"><div class="q-prog-fill" style="width:'+prog+'%"></div></div><div class="q-body"><span class="q-type '+(isVF?'vf':'qcm')+'">'+(isVF?'Vrai / Faux':'QCM')+'</span><div class="q-text">'+q.question+'</div>'+opts+'<div class="q-fb" id="q-fb-multi"></div><div id="multi-scores"></div><div id="multi-next-btn"></div></div></div>';
  loadMultiScores();
}

async function submitMultiAnswer(i){
  if(multiState.answered)return;multiState.answered=true;
  const q=multiState.questions[multiState.qIdx];
  document.querySelectorAll('.q-opt').forEach(b=>b.disabled=true);
  const ok=i===q.answer;if(ok)multiState.score++;
  document.getElementById('mopt-'+i)?.classList.add(ok?'ok':'err');
  if(!ok)document.getElementById('mopt-'+q.answer)?.classList.add('ok');
  const fb=document.getElementById('q-fb-multi');if(fb){fb.textContent=q.explanation||'';fb.className='q-fb on '+(ok?'ok':'err');}
  await sb.from('quiz_participants').update({score:multiState.score}).eq('session_id',multiState.session.id).eq('user_id',currentUser.id);
  const nextDiv=document.getElementById('multi-next-btn');
  if(nextDiv)nextDiv.innerHTML='<button class="btn-main" style="margin-top:1rem;" onclick="readyForNextMulti()">Question suivante →</button>';
  setTimeout(loadMultiScores,500);
}

async function readyForNextMulti(){
  const qIdx=multiState.qIdx;
  const nextDiv=document.getElementById('multi-next-btn');
  if(nextDiv)nextDiv.innerHTML='<div style="text-align:center;padding:.65rem;font-size:.72rem;color:var(--ink3);margin-top:.75rem;background:var(--adim);border-radius:.5rem;">⏳ En attente des autres joueurs…</div>';
  multiState.readyPlayers=multiState.readyPlayers||new Set();
  multiState.readyPlayers.add(currentUser.id);
  await multiChannel.send({type:'broadcast',event:'player_ready',payload:{userId:currentUser.id,qIdx}});
  checkMultiAllReady(qIdx);
}

async function checkMultiAllReady(qIdx){
  if(qIdx!==multiState.qIdx)return;
  const total=multiState.totalPlayers||1;
  const ready=(multiState.readyPlayers||new Set()).size;
  if(ready<total)return;
  multiState.readyPlayers=new Set();
  const next=qIdx+1;
  if(next>=multiState.questions.length){
    if(multiState.isHost){
      await sb.from('quiz_sessions').update({status:'done'}).eq('id',multiState.session.id);
      await multiChannel.send({type:'broadcast',event:'game_end',payload:{}});
    }
    showMultiScoreboard();
  }else{
    renderMultiQ(next);
  }
}

async function showMultiScoreboard(){
  const{data:players}=await sb.from('quiz_participants').select('*').eq('session_id',multiState.session.id).order('score',{ascending:false});
  const medals=['🥇','🥈','🥉'];
  const rows=(players||[]).map((p,i)=>'<div class="score-row"><div class="score-pos '+(i===0?'gold':'')+'">'+( medals[i]||('#'+(i+1)))+'</div><div class="score-name">'+p.username+'</div><div class="score-val">'+p.score+'pts</div></div>').join('');
  document.getElementById('multi-content').innerHTML='<div class="q-result"><span class="qr-emoji">🏆</span><div class="qr-title">Partie terminée !</div><div class="qr-msg">Classement final</div></div><div class="scores-board">'+rows+'</div><button class="btn-main" style="margin-top:1.25rem;" onclick="renderMultiLobbyChoice()">Nouvelle partie</button>';
}

async function loadMultiScores(){
  const el=document.getElementById('multi-scores');if(!el)return;
  const{data:players}=await sb.from('quiz_participants').select('*').eq('session_id',multiState.session.id).order('score',{ascending:false});
  if(!players||players.length<=1){el.innerHTML='';return;}
  el.innerHTML='<div style="font-size:.56rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-bottom:.4rem;">Scores en direct</div><div class="scores-board">'+players.map((p,i)=>'<div class="score-row"><div class="score-pos '+(i===0?'gold':'')+'">'+String(i+1).padStart(2,'0')+'</div><div class="score-name">'+p.username+'</div><div class="score-val">'+p.score+'</div></div>').join('')+'</div>';
}

function leaveMulti(){if(multiChannel)multiChannel.unsubscribe();multiState=null;multiChannel=null;renderPlayChoice();}
// goHome → hub (défini plus haut, écrasé ici pour compatibilité)


// ── Onboarding ───────────────────────────────────────────────────────────
const ONBOARD_SLIDES=[
  {wolf:'🐺',title:'Bienvenue !',desc:'Chaque jour, une nouvelle anecdote fascinante du monde entier vous attend.'},
  {wolf:'📖',title:'Lisez & Apprenez',desc:'Gagnez des XP en lisant et en répondant aux quiz. Montez de niveau et débloquez des badges !'},
  {wolf:'🏆',title:'Défiez vos amis',desc:'Ajoutez des amis, comparez vos scores dans la ligue hebdomadaire et grimpez au classement !'}
];
let _onboardStep=0;
function showOnboarding(){
  if(localStorage.getItem('adj_onboarded'))return;
  const ol=document.getElementById('onboard-overlay');if(ol)ol.style.display='flex';
}
function nextOnboard(){
  _onboardStep++;
  if(_onboardStep>=ONBOARD_SLIDES.length){
    document.getElementById('onboard-overlay').style.display='none';
    localStorage.setItem('adj_onboarded','1');
    return;
  }
  const s=ONBOARD_SLIDES[_onboardStep];
  document.getElementById('onboard-wolf').textContent=s.wolf;
  document.getElementById('onboard-title').textContent=s.title;
  document.getElementById('onboard-desc').textContent=s.desc;
  document.querySelectorAll('.onboard-dot').forEach((d,i)=>d.classList.toggle('active',i===_onboardStep));
  if(_onboardStep===ONBOARD_SLIDES.length-1)document.getElementById('onboard-btn').textContent="C'est parti !";
}
function initOnboarding(){
  _onboardStep=0;
  const s=ONBOARD_SLIDES[0];
  const wolf=document.getElementById('onboard-wolf');
  if(wolf)wolf.textContent=s.wolf;
  const tit=document.getElementById('onboard-title');
  if(tit)tit.textContent=s.title;
  const desc=document.getElementById('onboard-desc');
  if(desc)desc.textContent=s.desc;
  document.querySelectorAll('.onboard-dot').forEach((d,i)=>d.classList.toggle('active',i===0));
  const btn=document.getElementById('onboard-btn');
  if(btn)btn.textContent='Continuer';
  showOnboarding();
}

// ── Favorites ────────────────────────────────────────────────────────────
async function loadFavs(){
  if(!currentUser){document.getElementById('btn-fav')&&(document.getElementById('btn-fav').style.display='none');return;}
  document.getElementById('btn-fav')&&(document.getElementById('btn-fav').style.display='');
  const{data}=await sb.from('favorites').select('anecdote_id').eq('user_id',currentUser.id);
  _histFavs=new Set((data||[]).map(f=>String(f.anecdote_id)));
  updateFavBtn();
}
function getAnecId(a){return String(a?.id||a?.slug||a?.date||'');}
function updateFavBtn(){
  const btn=document.getElementById('btn-fav');if(!btn||!todayAnec)return;
  const isFav=_histFavs.has(getAnecId(todayAnec));
  btn.textContent=isFav?'❤️':'🤍';
  btn.classList.toggle('active',isFav);
}
async function toggleFav(){
  if(!currentUser){showToast('Connectez-vous pour ajouter des favoris.');return;}
  const id=getAnecId(todayAnec);if(!id)return;
  if(_histFavs.has(id)){
    await sb.from('favorites').delete().eq('user_id',currentUser.id).eq('anecdote_id',id);
    _histFavs.delete(id);showToast('Retiré des favoris');
  }else{
    await sb.from('favorites').insert({user_id:currentUser.id,anecdote_id:id});
    _histFavs.add(id);showToast('❤ Ajouté aux favoris !');
  }
  updateFavBtn();
}

// ── Stats tab ────────────────────────────────────────────────────────────
async function buildStatsTab(){
  const el=document.getElementById('tab-stats');if(!el)return;
  el.innerHTML='<div style="padding:.5rem 0;">'+
    '<div id="xp-chart-inline" class="xp-chart-wrap"><div class="xp-chart-title">📊 XP par semaine</div><div class="xp-bars" id="xp-bars-inline"></div></div>'+
    '</div>';
  await buildXpChart('xp-bars-inline');
}
async function buildXpChart(targetId){
  if(!currentUser)return;
  const barsEl=document.getElementById(targetId||'xp-bars');if(!barsEl)return;
  const now=new Date();
  const weeks=[];
  for(let i=3;i>=0;i--){
    const start=new Date(now);start.setDate(start.getDate()-((start.getDay()+6)%7)-i*7);start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+7);
    weeks.push({start,end,label:i===0?'Cette sem.':'S−'+i});
  }
  const[{data:reads},{data:quizzes}]=await Promise.all([
    sb.from('reads').select('created_at').eq('user_id',currentUser.id),
    sb.from('quiz_history').select('created_at').eq('user_id',currentUser.id)
  ]);
  const xpPerWeek=weeks.map(w=>{
    const rXP=((reads||[]).filter(r=>new Date(r.created_at)>=w.start&&new Date(r.created_at)<w.end).length)*10;
    const qXP=((quizzes||[]).filter(q=>new Date(q.created_at)>=w.start&&new Date(q.created_at)<w.end).length)*20;
    return{label:w.label,xp:rXP+qXP};
  });
  const maxXp=Math.max(...xpPerWeek.map(w=>w.xp),1);
  barsEl.innerHTML=xpPerWeek.map(w=>'<div class="xp-bar-col"><div class="xp-bar-fill" style="height:'+Math.round((w.xp/maxXp)*56+4)+'px" title="'+w.xp+' XP"></div><div class="xp-bar-lbl">'+w.label+'<br><span style="color:var(--a);font-weight:700">'+w.xp+'</span></div></div>').join('');
}

// ── Weekly League ────────────────────────────────────────────────────────

// ── Mode Ligue ─────────────────────────────────────────────────────────────
const LEAGUE_DIFF={1:{label:'Facile',cls:'easy',correct:8,wrong:-25},2:{label:'Moyen',cls:'medium',correct:20,wrong:-12},3:{label:'Difficile',cls:'hard',correct:40,wrong:-5}};
const LEAGUE_Q_COUNT=10;
let _lgState=null;

async function goLeaguePlay(){
  if(!currentUser){showToast('\u26a0 Connecte-toi pour jouer en ligue !');show('screen-login');return;}
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
  const{data:existing}=await sb.from('league_scores').select('points,answers_correct,answers_wrong').eq('user_id',currentUser.id).eq('week_start',ws).maybeSingle();

  _lgState={questions:shuffled,idx:0,sessionPts:0,sessionCorrect:0,sessionWrong:0,weekStart:ws,prevPts:existing?.points||0,prevCorrect:existing?.answers_correct||0,prevWrong:existing?.answers_wrong||0,streak:[],anecMap:_lgAnecMap};
  document.getElementById('multi-sub').textContent=shuffled.length+' questions \u00b7 semaine en cours';
  renderLeagueQ();
}

function renderLeagueQ(){
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

function answerLeagueQ(i){
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

function nextLeagueQ(){
  _lgState.idx++;
  if(_lgState.idx>=_lgState.questions.length)finishLeague();
  else renderLeagueQ();
}

async function finishLeague(){
  const s=_lgState;
  const newPts=Math.max(0,s.prevPts+s.sessionPts);
  const newCorrect=s.prevCorrect+s.sessionCorrect;
  const newWrong=s.prevWrong+s.sessionWrong;
  // Sauvegarder dans league_scores
  try{
    await sb.from('league_scores').upsert({
      user_id:currentUser.id,week_start:s.weekStart,
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
      '<button class="btn-sec" onclick="goHome();updateNav(\'bn-anec\')">🏠 Accueil</button>'+
    '</div>';
  // Mettre à jour le classement dans l'onglet social
  const leagueEl=document.getElementById('weekly-league-wrap');if(leagueEl)buildWeeklyLeague(leagueEl);
}

async function buildWeeklyLeague(el){
  if(!el)return;
  if(!currentUser){el.innerHTML='<div class="empty"><span class="empty-ico">🏆</span><p>Connectez-vous pour voir le classement.</p></div>';return;}
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
  const myInTop=top20Ids.includes(currentUser.id);

  // Récupérer aussi le score du joueur si pas dans le top 20
  let myEntry=null;
  if(!myInTop){
    const{data:myScore}=await sb.from('league_scores').select('user_id,points,answers_correct,answers_wrong').eq('week_start',ws).eq('user_id',currentUser.id).maybeSingle();
    if(myScore)myEntry=myScore;
  }

  // Profils
  const allIds=[...new Set([...top20Ids,...(myEntry?[currentUser.id]:[])])];
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
    html+=top20.map((s,i)=>rowHtml(s.user_id,i+1,s.user_id===currentUser.id)).join('');
    if(!myInTop&&myEntry){
      html+='<div style="border-top:1px dashed var(--b2);margin:8px 0;padding-top:8px;font-size:.65rem;color:var(--ink3);text-align:center">Votre position</div>';
      html+=rowHtml(currentUser.id,myRank,true);
    }else if(!myInTop&&!myEntry){
      html+='<div style="border-top:1px dashed var(--b2);margin:8px 0;padding-top:8px;font-size:.65rem;color:var(--ink3);text-align:center">Vous n\'êtes pas encore classé cette semaine</div>';
    }
  }
  el.innerHTML=html;
}


// ── Activity feed ─────────────────────────────────────────────────────────
async function buildActivityFeed(el){
  if(!el||!currentUser)return;
  const{data:friendData}=await sb.from('friendships').select('requester_id,addressee_id').or('requester_id.eq.'+currentUser.id+',addressee_id.eq.'+currentUser.id).eq('status','accepted');
  const friendIds=(friendData||[]).map(f=>f.requester_id===currentUser.id?f.addressee_id:f.requester_id);
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


// ── Notifications demandes d'ami ─────────────────────────────────────────
async function checkFriendRequests(){
  if(!currentUser)return;
  const{data}=await sb.from('friendships')
    .select('id,requester_id,req:profiles!friendships_requester_id_fkey(username)')
    .eq('addressee_id',currentUser.id)
    .eq('status','pending');
  const count=(data||[]).length;
  const badge=document.getElementById('friend-req-badge');
  if(badge){
    badge.style.display=count>0?'flex':'none';
    badge.textContent=count>0?String(count):'';
  }
  return data||[];
}

async function buildPendingRequests(el){
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

async function declineFriend(fid){
  await sb.from('friendships').delete().eq('id',fid);
  showToast('Demande refusée.');
  checkFriendRequests();
  buildAmisTab();
}

// ── Voir le profil d'un autre utilisateur ────────────────────────────────
// Ancienne version remplacée — viewUserProfile est définie plus bas (modal enrichie)


// ── Admin panel ──────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'nymeraroman@gmail.com';
function isAdmin(){return currentUser&&(currentUser.role==='admin'||currentUser.email===ADMIN_EMAIL);}
function isMod(){return currentUser&&(currentUser.role==='moderator'||isAdmin());}

function goAdmin(){
  if(!isAdmin())return;
  prevScreen=document.querySelector('.screen.on')?.id||'screen-profile';
  show('screen-admin');
  adminSwitchTab('stats', document.querySelector('.admin-tab'));
}

function adminSwitchTab(tab, btn){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const el=document.getElementById('admin-content');
  if(tab==='stats') adminShowStats(el);
  else if(tab==='anecdotes') adminShowAnecdotes(el);
  else if(tab==='users') adminShowUsers(el);
  else if(tab==='comments') adminShowComments(el);
}

// ── Service Role Key (encodée dans le source, pas besoin de saisie) ──────────
function getAdminKey(){
  return String.fromCharCode(101,121,74,104,98,71,99,105,79,105,74,73,85,122,73,49,78,105,73,115,73,110,82,53,99,67,73,54,73,107,112,88,86,67,74,57,46,101,121,74,112,99,51,77,105,79,105,74,122,100,88,66,104,89,109,70,122,90,83,73,115,73,110,74,108,90,105,73,54,73,110,112,121,101,88,74,109,98,87,57,48,97,71,112,111,101,88,100,114,97,50,120,116,98,109,108,51,73,105,119,105,99,109,57,115,90,83,73,54,73,110,78,108,99,110,90,112,89,50,86,102,99,109,57,115,90,83,73,115,73,109,108,104,100,67,73,54,77,84,99,51,79,84,77,49,78,106,77,50,77,83,119,105,90,88,104,119,73,106,111,121,77,68,107,48,79,84,77,121,77,122,89,120,102,81,46,87,118,98,45,73,101,45,112,105,56,90,86,69,49,73,73,50,75,55,65,95,110,110,67,122,84,118,69,102,109,113,54,51,54,81,98,98,110,83,118,120,88,89);
}
function srkInputHtml(){return'';}

// ── Suppression cascade via REST API + service role key ───────────────────────
async function runAdminCascadeDelete(anecId){
  const key=getAdminKey();
  if(!key)return{error:'no_key'};
  const base='https://zryrfmothjhywkklmniw.supabase.co/rest/v1/';
  const h={'Authorization':'Bearer '+key,'apikey':key,'Content-Type':'application/json'};
  // Supprimer dans l'ordre FK
  for(const table of['quiz_sessions','reads','quiz_history','ratings','questions']){
    const r=await fetch(base+table+'?anecdote_id=eq.'+anecId,{method:'DELETE',headers:h});
    if(!r.ok&&r.status!==404){const t=await r.text();return{error:table+': '+t.slice(0,100)};}
  }
  const r=await fetch(base+'anecdotes?id=eq.'+anecId,{method:'DELETE',headers:h});
  if(!r.ok){const t=await r.text();return{error:'anecdotes: '+t.slice(0,100)};}
  return{ok:true};
}

// ── Stats ────────────────────────────────────────────────────────────────────
async function adminShowStats(el){
  el=el||document.getElementById('admin-content');
  el.innerHTML='<div class="admin-section"><div class="admin-section-title">Chargement…</div></div>';
  const today=new Date().toISOString().slice(0,10);
  const[{count:totalReads},{count:todayReads},{count:totalUsers},{count:totalComments},{count:totalQuiz},{count:totalDuels}]=await Promise.all([
    sb.from('reads').select('*',{count:'exact',head:true}),
    sb.from('reads').select('*',{count:'exact',head:true}).eq('date',today),
    sb.from('profiles').select('*',{count:'exact',head:true}),
    sb.from('ratings').select('*',{count:'exact',head:true}).not('comment','is',null).neq('comment',''),
    sb.from('quiz_history').select('*',{count:'exact',head:true}),
    sb.from('duels').select('*',{count:'exact',head:true}).eq('status','completed')
  ]);
  const{data:recentAnec}=await sb.from('anecdotes').select('theme,date,id').order('date',{ascending:false}).limit(1).maybeSingle();
  const topUsers=null;
  el.innerHTML=
    '<div class="admin-section"><div class="admin-section-title">📊 Stats globales</div>'+
    '<div class="admin-stat-row"><span>Utilisateurs inscrits</span><span class="admin-stat-val">'+(totalUsers||0)+'</span></div>'+
    '<div class="admin-stat-row"><span>Lectures totales</span><span class="admin-stat-val">'+(totalReads||0)+'</span></div>'+
    '<div class="admin-stat-row"><span>Lectures aujourd\'hui</span><span class="admin-stat-val">'+(todayReads||0)+'</span></div>'+
    '<div class="admin-stat-row"><span>Quiz joués</span><span class="admin-stat-val">'+(totalQuiz||0)+'</span></div>'+
    '<div class="admin-stat-row"><span>Duels terminés</span><span class="admin-stat-val">'+(totalDuels||0)+'</span></div>'+
    '<div class="admin-stat-row"><span>Commentaires</span><span class="admin-stat-val">'+(totalComments||0)+'</span></div>'+
    '<div class="admin-stat-row"><span>Dernière anecdote</span><span class="admin-stat-val">'+(recentAnec?.theme||'—')+' ('+( recentAnec?.date||'—')+')</span></div>'+
    '</div>'+
    (topUsers&&topUsers.length?
      '<div class="admin-section"><div class="admin-section-title">🏆 Top XP</div>'+
      topUsers.map((u,i)=>'<div class="admin-stat-row"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':'  #'+(i+1))+' '+u.username+'</span><span class="admin-stat-val">'+u.xp+' XP</span></div>').join('')+
      '</div>':''
    );
}

// ── Anecdotes ────────────────────────────────────────────────────────────────
async function adminShowAnecdotes(el){
  el=el||document.getElementById('admin-content');
  el.innerHTML='<div style="color:var(--ink3);font-size:.75rem;padding:.5rem 0">Chargement…</div>';

  // Générer les 14 derniers jours
  const days=[];
  for(let i=0;i<14;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }

  const{data:anecs}=await sb.from('anecdotes').select('id,date,theme').order('date',{ascending:false}).limit(20);
  const anecMap={};(anecs||[]).forEach(a=>anecMap[a.date]=a);

  let html=srkInputHtml();

  // Zone reset par date
  html+=`<div class="admin-section">
    <div class="admin-section-title">🔄 Forcer le reset</div>
    <div style="font-size:.72rem;color:var(--ink2);margin-bottom:.65rem;">Supprime toutes les données liées à une anecdote (quiz, lectures, notes…) et revient au sélecteur de thème.</div>
    <div class="admin-reset-form">
      <input type="date" id="admin-reset-date" value="${today()}" />
      <button class="admin-btn danger" style="flex-shrink:0;padding:.4rem .9rem;" onclick="adminForceReset()">🗑 Reset cette date</button>
    </div>
    <button class="admin-btn" style="width:100%;margin-top:.25rem;" onclick="adminForceReset('today')">🔄 Reset aujourd'hui (${today()})</button>
  </div>`;

  // Liste des anecdotes
  html+='<div class="admin-section"><div class="admin-section-title">📅 14 derniers jours</div>';
  days.forEach(date=>{
    const a=anecMap[date];
    if(a){
      html+=`<div class="admin-anec-row">
        <span class="admin-anec-date">${date}</span>
        <span class="admin-anec-theme">${a.theme||a.id}</span>
        <span class="admin-anec-status ok">✓ OK</span>
        <button class="admin-del-btn" onclick="adminDeleteAnecById('${a.id}','${date}',this)">🗑</button>
      </div>`;
    }else{
      html+=`<div class="admin-anec-row">
        <span class="admin-anec-date">${date}</span>
        <span class="admin-anec-theme" style="color:var(--ink3);font-style:italic;">Aucune anecdote</span>
        <span class="admin-anec-status miss">✗ vide</span>
      </div>`;
    }
  });
  html+='</div>';

  el.innerHTML=html;
}

async function adminForceReset(mode){
  if(!isAdmin())return;
  const date=mode==='today'?today():document.getElementById('admin-reset-date')?.value||today();
  if(!confirm('Supprimer toutes les données pour le '+date+' ?'))return;
  showToast('⏳ Suppression en cours…');

  // Chercher l'anecdote pour cette date
  const{data:anec}=await sb.from('anecdotes').select('id').eq('date',date).maybeSingle();
  const id=anec?.id||null;

  if(id){
    const res=await runAdminCascadeDelete(id);
    if(res.error==='no_key'){showToast('⚠ Service Role Key requise');adminSwitchTab('anecdotes',null);return;}
    if(res.error){showToast('⚠ Erreur: '+res.error.slice(0,80));return;}
  }else{
    showToast('⚠ Aucune anecdote trouvée pour le '+date);return;
  }

  showToast('✓ Anecdote du '+date+' supprimée !');
  if(date===today()){todayAnec=null;todayQs=[];}
  adminShowAnecdotes();
  if(date===today()){setTimeout(()=>{buildList();show('screen-pick');},1200);}
}

async function adminDeleteAnecById(id, date, btn){
  if(!confirm('Supprimer l\'anecdote du '+date+' et toutes ses données ?'))return;
  btn.disabled=true; btn.textContent='…';
  const res=await runAdminCascadeDelete(id);
  if(res.error==='no_key'){btn.textContent='⚠ Clé';btn.disabled=false;adminSwitchTab('anecdotes',null);return;}
  if(res.error){btn.textContent='⚠';btn.disabled=false;showToast('Erreur: '+res.error.slice(0,60));return;}
  showToast('✓ Supprimé');
  if(date===today()){todayAnec=null;todayQs=[];}
  btn.closest('.admin-anec-row').style.opacity='.3';
  setTimeout(()=>adminShowAnecdotes(),800);
}

// ── Reset rapide depuis l'écran anecdote ─────────────────────────────────────
async function adminResetDay(){
  if(!isAdmin())return;
  if(!confirm('Supprimer l\'anecdote du jour et générer une nouvelle ?'))return;
  await adminForceReset('today');
}

// ── Commentaires ─────────────────────────────────────────────────────────────
async function adminShowComments(el){
  el=el||document.getElementById('admin-content');
  el.innerHTML='<div style="color:var(--ink3);font-size:.75rem;padding:.5rem 0">Chargement…</div>';
  const{data:ratings}=await sb.from('ratings').select('id,user_id,stars,comment,created_at,anecdote_id').not('comment','is',null).neq('comment','').order('created_at',{ascending:false}).limit(60);
  if(!ratings||!ratings.length){el.innerHTML='<div class="admin-section"><div class="admin-section-title">💬 Commentaires</div><div style="color:var(--ink3);font-size:.75rem;">Aucun commentaire.</div></div>';return;}
  const uids=[...new Set(ratings.map(r=>r.user_id))];
  const{data:profs}=await sb.from('profiles').select('id,username').in('id',uids);
  const pMap={};(profs||[]).forEach(p=>pMap[p.id]=p.username);
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  el.innerHTML='<div class="admin-section"><div class="admin-section-title">💬 Commentaires ('+ratings.length+')</div>'+
    ratings.map(r=>'<div class="admin-comment-item">'+
      '<div><div style="font-size:.65rem;font-weight:700;color:var(--ink);margin-bottom:.2rem;">'+(pMap[r.user_id]||'?')+' <span style="color:#f59e0b">'+stars(r.stars)+'</span></div>'+
      '<div style="font-size:.75rem;color:var(--ink2);">'+r.comment.replace(/</g,'&lt;')+'</div>'+
      '<div style="font-size:.58rem;color:var(--ink3);margin-top:.15rem;">'+r.anecdote_id+' · '+(r.created_at||'').slice(0,10)+'</div></div>'+
      '<button class="admin-comment-del" onclick="adminDeleteComment(\''+r.id+'\',this)">🗑</button>'+
    '</div>').join('')+
  '</div>';
}

async function adminDeleteComment(id,btn){
  btn.disabled=true;btn.textContent='…';
  const{error}=await sb.from('ratings').update({comment:''}).eq('id',id);
  if(error){btn.textContent='⚠';return;}
  btn.closest('.admin-comment-item').style.opacity='.3';
  btn.textContent='✓';
  showToast('Commentaire supprimé');
  loadCommentsFeed();
}

// ── Utilisateurs ─────────────────────────────────────────────────────────────
let _adminUsersCache=[];
async function adminShowUsers(el){
  el=el||document.getElementById('admin-content');
  el.innerHTML='<div style="color:var(--ink3);font-size:.75rem;padding:.5rem 0">Chargement…</div>';
  const{data:users,error}=await sb.from('profiles').select('id,username,role,joined').order('joined',{ascending:false}).limit(500);
  if(error||!users||!users.length){el.innerHTML='<div class="admin-section"><div style="color:var(--re);font-size:.75rem;">'+(error?.message||'Aucun utilisateur')+'</div></div>';return;}
  _adminUsersCache=users;
  el.innerHTML='<div style="margin-bottom:.75rem;"><input id="admin-user-search" type="text" placeholder="🔍  Rechercher un utilisateur…" style="width:100%;padding:.55rem .85rem;background:var(--s1);border:1px solid var(--b2);border-radius:.6rem;font-family:sans-serif;font-size:.75rem;color:var(--ink);outline:none;box-sizing:border-box;" oninput="adminFilterUsers(this.value)" /></div><div id="admin-users-list"></div>';
  adminFilterUsers('');
}
function adminFilterUsers(q){
  const list=document.getElementById('admin-users-list');if(!list)return;
  const term=q.trim().toLowerCase();
  const filtered=term?_adminUsersCache.filter(u=>(u.username||'').toLowerCase().includes(term)):_adminUsersCache;
  function userRow(u){
    const isAdm=u.role==='admin',isMod=u.role==='moderator';
    const av=`<div style="width:2rem;height:2rem;border-radius:50%;background:${isAdm?'var(--re)':isMod?'var(--bl)':'var(--a)'};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#fff;flex-shrink:0;">${(u.username||'?')[0].toUpperCase()}</div>`;
    const badge=`<span class="admin-user-role${isMod?' mod':''}">${isAdm?'⚡ Admin':isMod?'🛡 Mod':'user'}</span>`;
    const joined=u.joined?'<div style="font-size:.58rem;color:var(--ink3);">Inscrit le '+u.joined.slice(0,10)+'</div>':'';
    const btn=isAdm?'':(`<button class="admin-mod-btn${isMod?' active':''}" onclick="adminToggleMod('${u.id}','${u.role||'user'}',this)">${isMod?'Retirer mod':'Nommer mod'}</button>`);
    return `<div class="admin-user-item">${av}<div style="flex:1;min-width:0;"><div style="font-size:.78rem;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.username||'?'}</div>${joined}</div>${badge}${btn}</div>`;
  }
  if(!filtered.length){list.innerHTML='<div class="admin-section"><div style="color:var(--ink3);font-size:.75rem;text-align:center;padding:.5rem 0;">Aucun résultat pour "'+q+'"</div></div>';return;}
  const admins=filtered.filter(u=>u.role==='admin');
  const mods=filtered.filter(u=>u.role==='moderator');
  const others=filtered.filter(u=>u.role!=='moderator'&&u.role!=='admin');
  let out='';
  if(term){
    out+=`<div class="admin-section"><div class="admin-section-title">${filtered.length} résultat${filtered.length>1?'s':''}</div>${filtered.map(userRow).join('')}</div>`;
  }else{
    if(admins.length)out+=`<div class="admin-section"><div class="admin-section-title">⚡ Admins</div>${admins.map(userRow).join('')}</div>`;
    if(mods.length)out+=`<div class="admin-section"><div class="admin-section-title">🛡 Modérateurs (${mods.length})</div>${mods.map(userRow).join('')}</div>`;
    out+=`<div class="admin-section"><div class="admin-section-title">👥 Membres (${others.length})</div>${others.map(userRow).join('')}</div>`;
  }
  list.innerHTML=out;
}

async function adminToggleMod(uid,currentRole,btn){
  const newRole=currentRole==='moderator'?'user':'moderator';
  btn.disabled=true;btn.textContent='…';
  const{error}=await sb.from('profiles').update({role:newRole}).eq('id',uid);
  if(error){btn.textContent='⚠';btn.disabled=false;showToast('⚠ Erreur: '+error.message);return;}
  showToast(newRole==='moderator'?'✓ Modérateur nommé !':'✓ Rôle retiré');
  adminShowUsers();
}

// ── Avatar upload ────────────────────────────────────────────────────────
const SB_STORAGE='https://zryrfmothjhywkklmniw.supabase.co/storage/v1';
function triggerAvatarUpload(){document.getElementById('avatar-input').click();}
async function uploadAvatar(input){
  if(!input.files||!input.files[0]||!currentUser)return;
  const file=input.files[0];
  if(file.size>2*1024*1024){showToast('⚠ Image trop lourde (max 2 Mo)');return;}
  showToast('⏳ Upload en cours…');
  const ext=file.name.split('.').pop().toLowerCase();
  const path=currentUser.id+'/avatar.'+ext;
  const{data,error}=await sb.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});
  if(error){showToast('⚠ Erreur upload: '+error.message);return;}
  const{data:{publicUrl}}=sb.storage.from('avatars').getPublicUrl(path);
  const ts=publicUrl+(publicUrl.includes('?')?'&':'?')+'t='+Date.now();
  await sb.from('profiles').update({avatar_url:ts}).eq('id',currentUser.id);
  currentUser.avatar_url=ts;
  renderProfileAvatar(ts);
  showToast('✓ Photo mise à jour !');
}
function renderProfileAvatar(url){
  const img=document.getElementById('prof-av-photo');
  const av=document.getElementById('prof-av');
  if(url&&img){img.src=url;img.style.display='block';if(av)av.style.display='none';}
  else{if(img)img.style.display='none';if(av)av.style.display='flex';}
}

// ── Bio ──────────────────────────────────────────────────────────────────
function startEditBio(){
  const txt=document.getElementById('prof-bio-text');
  const inp=document.getElementById('prof-bio-input');
  const acts=document.getElementById('prof-bio-actions');
  if(!txt||!inp)return;
  inp.value=currentUser&&currentUser.bio?currentUser.bio:'';
  txt.style.display='none';inp.style.display='block';if(acts)acts.style.display='flex';
  inp.focus();inp.select();
}
function cancelEditBio(){
  const txt=document.getElementById('prof-bio-text');
  const inp=document.getElementById('prof-bio-input');
  const acts=document.getElementById('prof-bio-actions');
  if(txt)txt.style.display='block';if(inp)inp.style.display='none';if(acts)acts.style.display='none';
}
async function saveBio(){
  const inp=document.getElementById('prof-bio-input');
  if(!inp||!currentUser)return;
  const bio=inp.value.trim().slice(0,160);
  await sb.from('profiles').update({bio}).eq('id',currentUser.id);
  currentUser.bio=bio;
  const txt=document.getElementById('prof-bio-text');
  if(txt)txt.textContent=bio||'Ajoute une bio…';
  cancelEditBio();
  showToast('✓ Bio enregistrée !');
}

// ── Fun identity stats ────────────────────────────────────────────────────
function computeMaxStreak(dates){
  if(!dates||!dates.length)return 0;
  const sorted=[...new Set(dates)].sort();
  let max=1,cur=1;
  for(let i=1;i<sorted.length;i++){
    const a=new Date(sorted[i-1]),b=new Date(sorted[i]);
    const diff=(b-a)/(1000*60*60*24);
    if(diff===1){cur++;if(cur>max)max=cur;}
    else if(diff>1)cur=1;
  }
  return max;
}
function funTitle(reads,avgQuiz){
  if(reads>=100)return{title:'Oracle des Anecdotes',icon:'🔮'};
  if(reads>=60&&avgQuiz>=80)return{title:'Génie Encyclopédique',icon:'🧠'};
  if(reads>=60)return{title:'Érudit Confirmé',icon:'📚'};
  if(reads>=30&&avgQuiz>=75)return{title:'Esprit Affté',icon:'⚡'};
  if(reads>=30)return{title:'Voyageur du Savoir',icon:'🌍'};
  if(reads>=15)return{title:'Apprenti Savant',icon:'🎓'};
  if(reads>=5)return{title:'Curieux Éveillé',icon:'👀'};
  return{title:'Touriste Curieux',icon:'🐣'};
}
async function buildIdentityCard(reads,qhist,allAnec){
  const el=document.getElementById('identity-grid');if(!el)return;
  const dates=reads.map(r=>r.date);
  const maxStreak=computeMaxStreak(dates);
  if(maxStreak>(currentUser.streak_record||0)){
    await sb.from('profiles').update({streak_record:maxStreak}).eq('id',currentUser.id);
    currentUser.streak_record=maxStreak;
  }
  const avgQuiz=qhist.length?Math.round(qhist.reduce((a,b)=>a+b.pct,0)/qhist.length):0;
  const{title,icon}=funTitle(reads.length,avgQuiz);
  const readIds=new Set(reads.map(r=>r.anecdote_id));
  const readAnec=allAnec.filter(a=>readIds.has(a.id));
  const themeCount={};readAnec.forEach(a=>{if(a.theme){themeCount[a.theme]=(themeCount[a.theme]||0)+1;}});
  const topTheme=Object.entries(themeCount).sort((a,b)=>b[1]-a[1])[0];
  const themeName=topTheme?topTheme[0].split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '):'—';
  const themeCount1=topTheme?topTheme[1]:0;
  el.innerHTML=
    '<div class="id-stat">'+
      '<div class="id-stat-icon">'+icon+'</div>'+
      '<div class="id-stat-val" style="font-size:.72rem">'+title+'</div>'+
      '<div class="id-stat-lbl">Titre</div>'+
    '</div>'+
    '<div class="id-stat">'+
      '<div class="id-stat-icon">📚</div>'+
      '<div class="id-stat-val">'+themeName+'</div>'+
      '<div class="id-stat-lbl">Thème préféré</div>'+
      '<div class="id-stat-sub">'+themeCount1+' lecture'+(themeCount1>1?'s':'')+'</div>'+
    '</div>'+
    '<div class="id-stat">'+
      '<div class="id-stat-icon">🏆</div>'+
      '<div class="id-stat-val">'+(currentUser.streak_record||maxStreak)+' j</div>'+
      '<div class="id-stat-lbl">Record de série</div>'+
      '<div class="id-stat-sub">max consécutif</div>'+
    '</div>'+
    '<div class="id-stat">'+
      '<div class="id-stat-icon">🎯</div>'+
      '<div class="id-stat-val">'+avgQuiz+'%</div>'+
      '<div class="id-stat-lbl">Taux quiz</div>'+
      '<div class="id-stat-sub">'+(qhist.length?qhist.length+' quiz':'pas encore')+'</div>'+
    '</div>';
}

function subscribeNewHunters(){
  sb.channel('new-hunters')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'profiles'},(payload)=>{
      if(currentUser&&payload.new.id===currentUser.id)return;
      showHunterToast(payload.new.username||'Chasseur inconnu');
    })
    .subscribe();
}
function showHunterToast(username){
  let t=document.getElementById('hunter-toast');
  if(!t){t=document.createElement('div');t.id='hunter-toast';t.className='hunter-toast';document.body.appendChild(t);}
  t.innerHTML='<span class="hunter-toast-ico">⚡</span><div><div class="hunter-toast-title">Nouveau chasseur détecté</div><div class="hunter-toast-name">'+username+' a rejoint le Système</div></div>';
  t.classList.add('on');
  clearTimeout(t._tmr);
  t._tmr=setTimeout(()=>t.classList.remove('on'),4500);
}
(async function init(){
  document.documentElement.classList.add('dark');
  localStorage.setItem('adj_mode','dark');
  updateToggleIcon();updateHeader();
  const savedColor=localStorage.getItem('adj_prof_color');
  if(savedColor)applyProfileColor(savedColor,false);
  const{data:{session}}=await sb.auth.getSession();
  if(session){
    currentUser=await getProfile(session.user.id);
    if(!currentUser){
      const meta=session.user.user_metadata||{};
      let uname=(meta.user_name||meta.full_name||meta.name||'chasseur'+Math.floor(Math.random()*9999)).replace(/[^a-zA-Z0-9_\-]/g,'_').slice(0,20);
      const{data:ex}=await sb.from('profiles').select('id').eq('username',uname).maybeSingle();
      if(ex)uname=uname.slice(0,15)+'_'+Math.floor(Math.random()*999);
      await sb.from('profiles').insert({id:session.user.id,username:uname,joined:today()});
      currentUser={id:session.user.id,username:uname,joined:today(),email:session.user.email||''};
    } else {currentUser.email=session.user.email||'';}
  }
  updateHeader();
  // Précharger l'anecdote en arrière-plan sans l'afficher
  loadTodayBackground();
  if(currentUser){
    showHub();
    loadFavs();checkFriendRequests();loadNotifications();subscribeNotifications();subscribeNewHunters();
  } else {
    show('screen-login');
  }

// ════════════════════════════════════════════════════════════════════════════
// v2 FEATURES
// ════════════════════════════════════════════════════════════════════════════

// ── Streak ──────────────────────────────────────────────────────────────────
// userStreak declared at top

async function computeStreak(){
  if(!currentUser)return 0;
  const{data:reads}=await sb.from('reads').select('date').eq('user_id',currentUser.id).order('date',{ascending:false}).limit(400);
  if(!reads||!reads.length)return 0;
  const dates=[...new Set(reads.map(r=>r.date))].sort().reverse();
  const todayStr=today();
  let streak=0,expected=todayStr;
  for(const date of dates){
    if(date===expected){streak++;const d=new Date(expected+'T12:00:00');d.setDate(d.getDate()-1);expected=d.toISOString().slice(0,10);}
    else if(date<expected)break;
  }
  return streak;
}

async function loadStreak(){
  const n=await computeStreak();
  userStreak=n;
  const badge=document.getElementById('streak-badge');
  if(!badge)return;
  if(n===0){badge.style.display='none';return;}
  badge.style.display='flex';
  document.getElementById('streak-num').textContent=n;
  // Update FAB badge
  const fab=document.getElementById('bingo-fab');
  if(fab&&isEte()){fab.style.display='flex';}
  // Milestone pop — une seule fois par jour
  if([3,7,14,30,50,100].includes(n)){
    const popKey='streak_pop_shown_'+today();
    if(!localStorage.getItem(popKey)){
      localStorage.setItem(popKey,'1');
      const pop=document.getElementById('streak-pop');
      if(pop){
        document.getElementById('sp-num').textContent='🔥 '+n;
        document.getElementById('sp-msg').textContent=n+' jours de suite !';
        pop.classList.add('on');
        setTimeout(()=>pop.classList.remove('on'),2800);
      }
    }
  }
}

// ── "Pour aller plus loin" ───────────────────────────────────────────────────
async function loadContexte(){
  if(!todayAnec)return;
  const card=document.getElementById('contexte-card');
  if(!card)return;

  // Si le contexte est déjà en cache dans todayAnec, on l'affiche direct
  if(todayAnec.contexte){
    _renderContexte(todayAnec.contexte, todayAnec.sources||[]);
    return;
  }

  // Sinon : génération à la demande via l'Edge Function (PATCH)
  card.style.display='block';
  document.getElementById('contexte-txt').innerHTML='<span style="color:var(--ink3);font-size:.78rem">✨ Génération en cours…</span>';
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
      document.getElementById('contexte-txt').textContent='Contenu bientôt disponible.';
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
    srcEl.innerHTML=sources.map(s=>'<a class="contexte-src-lnk" href="'+s.url+'" target="_blank" rel="noopener"><span class="src-ico">🔗</span>'+s.title+'</a>').join('');
  }else{srcEl.innerHTML='';}
}

function toggleContexte(){
  const card=document.getElementById('contexte-card');
  if(card)card.classList.toggle('open');
}

// ── Share modal ──────────────────────────────────────────────────────────────
function shareAnec(){
  if(!todayAnec)return;
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
  const theme=todayAnec?.theme||'Anecdote';
  const txt=todayAnec?.anecdote||'';
  return '💡 *'+theme+'* — Anecdote du Jour\n\n'+txt+'\n\n👉 https://anecdote-du-jour.pages.dev/';
}
function shareViaWhatsApp(){
  const url='https://wa.me/?text='+encodeURIComponent(_shareText());
  window.open(url,'_blank','noopener');
  document.getElementById('share-hint').textContent='✓ WhatsApp ouvert !';
}
function shareViaDiscord(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='✓ Texte copié — colle dans Discord !';
  }).catch(()=>{document.getElementById('share-hint').textContent='Copie manuelle : Ctrl+C';});
}
function copyShareText(){
  const text=_shareText();
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById('share-hint').textContent='✓ Copié dans le presse-papiers !';
    setTimeout(()=>{const h=document.getElementById('share-hint');if(h)h.textContent='';},2500);
  });
}

// ── Community challenge ──────────────────────────────────────────────────────
async function buildCommunityChallenge(el){
  if(!el)return;
  // Semaine en cours (lundi)
  const now=new Date();
  const dow=(now.getDay()+6)%7;
  const mon=new Date(now);mon.setDate(now.getDate()-dow);mon.setHours(0,0,0,0);
  const ws=mon.toISOString().slice(0,10);

  const{data:ch}=await sb.from('community_challenges').select('*').eq('week_start',ws).maybeSingle();
  if(!ch){el.innerHTML='<div class="empty"><span class="empty-ico">🎯</span><p style="color:var(--ink3);font-size:.8rem">Défi de la semaine bientôt disponible !</p></div>';return;}

  let userResp=null;
  if(currentUser){
    const{data:r}=await sb.from('challenge_responses').select('answer,correct').eq('user_id',currentUser.id).eq('challenge_id',ch.id).maybeSingle();
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
  }else if(!currentUser){
    bottomHtml='<div style="margin-top:.75rem;text-align:center"><button class="btn-main" style="font-size:.75rem;padding:.5rem 1.25rem" onclick="show(\'screen-login\')">Se connecter pour jouer</button></div>';
  }

  el.innerHTML='<div class="challenge-card">'+
    '<div class="challenge-week">'+ch.icon+' Défi de la semaine</div>'+
    '<div class="challenge-q">'+ch.question+'</div>'+
    '<div class="challenge-opts">'+optHtml+'</div>'+
    bottomHtml+'</div>';
}

async function answerChallenge(challengeId,answer,correct_answer){
  if(!currentUser){showToast('⚠️ Connecte-toi pour jouer !');return;}
  const correct=(answer===correct_answer);
  const{error}=await sb.from('challenge_responses').upsert({user_id:currentUser.id,challenge_id:challengeId,answer,correct},{onConflict:'user_id,challenge_id'});
  if(error){showToast('Erreur : '+error.message);return;}
  if(correct)showToast('🎉 Bonne réponse !');else showToast('❌ Raté ! Retente la semaine prochaine.');
  // Bingo: marquer "défi communautaire fait"
  completeBingoCell(14);
  // Recharger le challenge pour afficher résultats
  const el=document.querySelector('.challenge-card')?.parentElement;
  if(el)buildCommunityChallenge(el);
}

// ── Bingo de l'été ───────────────────────────────────────────────────────────
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

function isEte(){const n=new Date();return n>=BINGO_START&&n<=BINGO_END;}

async function loadBingo(){
  if(!currentUser)return;
  // Case libre (18) toujours cochée
  completeBingoCell(18,false);
  const{data}=await sb.from('bingo_progress').select('cells').eq('user_id',currentUser.id).maybeSingle();
  if(data&&data.cells){data.cells.forEach(c=>bingoCompleted.add(c));}
  // Auto-check depuis les données
  await autocheckBingo();
  updateBingoFab();
}

async function autocheckBingo(){
  if(!currentUser)return;
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
    8:themes.some(t=>t.includes('art')), 9:userStreak>=3,
    10:localStorage.getItem('bingo_shared')==='1',
    12:themes.some(t=>t.includes('espace')), 13:themes.some(t=>t.includes('food')||t.includes('gastro')),
    15:qlist.length>=1, 16:rc>=10, 17:themes.some(t=>t.includes('sport')),
    19:ratc>=1, 20:userStreak>=7, 21:themes.some(t=>t.includes('insolite')),
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
  if(!currentUser)return;
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
  if(ptxt)ptxt.textContent=n+' / 25 cases cochées';
}

function renderBingoGrid(){
  const grid=document.getElementById('bingo-grid');
  if(!grid)return;
  grid.innerHTML=BINGO_CELLS.map(c=>{
    const done=bingoCompleted.has(c.id);
    return '<div class="bingo-cell'+(done?' done':'')+(c.free?' free':'')+'">'+
      (done?'<div class="bingo-check">✓</div>':'')+
      '<div class="bingo-cell-emoji">'+c.e+'</div>'+
      '<div class="bingo-cell-txt">'+c.t+'</div>'+
    '</div>';
  }).join('');
  updateBingoFab();
}

function openBingo(){
  if(!isEte()){showToast('🌞 Le bingo commence le 21 juin !');return;}
  renderBingoGrid();
  document.getElementById('bingo-bd').classList.add('on');
}
function closeBingo(){document.getElementById('bingo-bd').classList.remove('on');}

// ── XP pop animation ─────────────────────────────────────────────────────────
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
  if(currentUser){setTimeout(()=>{loadStreak();loadBingo();},50);}
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

// ── Badge notifications ──────────────────────────────────────────────────────
async function checkAndAwardBadges(badgeData){
  if(!currentUser)return;
  try{
    const{data:saved}=await sb.from('user_badges').select('badge_id').eq('user_id',currentUser.id);
    const savedSet=new Set((saved||[]).map(b=>b.badge_id));
    const newOnes=BADGES_DEF.filter(b=>b.check(badgeData)&&!savedSet.has(b.id));
    for(const badge of newOnes){
      await sb.from('user_badges').insert({user_id:currentUser.id,badge_id:badge.id});
      showToast('🏅 Badge débloqué : '+badge.icon+' '+badge.name+' !');
      await new Promise(res=>setTimeout(res,2200));
    }
  }catch(e){}
}

// ── Réactions 👍👎 ───────────────────────────────────────────────────────────
async function loadReactions(){
  if(!todayAnec)return;
  const anecId=getAnecId(todayAnec);
  const wrap=document.getElementById('react-wrap');
  if(wrap)wrap.style.display='flex';
  try{
    const promises=[sb.from('reactions').select('reaction').eq('anecdote_id',anecId)];
    if(currentUser)promises.push(sb.from('reactions').select('reaction').eq('user_id',currentUser.id).eq('anecdote_id',anecId).maybeSingle());
    const results=await Promise.all(promises);
    const counts=results[0].data||[];
    const mine=currentUser?(results[1].data||null):null;
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
async function setReaction(type){
  if(!currentUser){showToast('Connecte-toi pour réagir !');return;}
  const anecId=getAnecId(todayAnec);
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

// ── Share image (Canvas) ─────────────────────────────────────────────────────
function generateShareImage(){
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
  const theme=todayAnec?.theme||'Anecdote';const ico=todayAnec?.icon||'💡';
  const pillTxt=ico+'  '+theme;
  ctx.font='bold 26px system-ui,sans-serif';
  const pillW=ctx.measureText(pillTxt).width+40;
  ctx.fillStyle=accent+'33';
  roundRectCtx(ctx,60,158,pillW,46,10);ctx.fill();
  ctx.fillStyle=accent;ctx.fillText(pillTxt,80,190);
  // Anecdote text
  ctx.fillStyle=ink;ctx.font='30px system-ui,sans-serif';
  const txt=todayAnec?.anecdote||'';
  const words=txt.split(' ');let line='',lines=[];const maxW=W-120;
  for(const w of words){const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line){lines.push(line.trim());line=w+' ';if(lines.length>=13){lines.push('…');break;}}else line=t;}
  if(line&&lines.length<13)lines.push(line.trim());
  lines.forEach((l,i)=>ctx.fillText(l,60,260+i*48));
  // Bottom bar
  ctx.fillStyle=dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';
  ctx.fillRect(0,H-80,W,80);
  ctx.fillStyle=ink3;ctx.font='24px system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText('anecdote-du-jour.pages.dev',W/2,H-26);
  return canvas;
}
function roundRectCtx(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function downloadShareImage(){
  if(!todayAnec){showToast("Charge d'abord une anecdote");return;}
  const canvas=generateShareImage();
  const link=document.createElement('a');
  link.download='anecdote-du-jour-'+today()+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  document.getElementById('share-hint').textContent='✓ Image téléchargée !';
  // Badge share
  const n=parseInt(localStorage.getItem('share_count')||'0')+1;
  localStorage.setItem('share_count',String(n));
}

// ── Duel Quiz ────────────────────────────────────────────────────────────────
let currentDuel=null,duelChannel=null;
const DUEL_THEMES=[
  {id:'histoire',label:'🏛️ Histoire'},{id:'science',label:'🔬 Science'},
  {id:'nature',label:'🌿 Nature'},{id:'insolite',label:'🤯 Insolite'},
  {id:'art',label:'🎨 Art'},{id:'espace',label:'🚀 Espace'},
  {id:'sport',label:'⚡ Sport'},{id:'gastro',label:'🍽️ Gastro'},
  {id:'legendes',label:'🔍 Légendes'},
];
function genDuelCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}

async function showDuelLobby(){
  const el=document.getElementById('multi-content');
  if(!currentUser){
    el.innerHTML=`<div class="duel-waiting"><p style="margin-bottom:16px">Connecte-toi pour jouer en duel !</p><button class="btn-main" onclick="show('screen-login')">Se connecter</button></div>`;
    return;
  }
  let activeHtml='';
  try{
    const{data:activeDuels}=await sb.from('duels').select('*').or('challenger_id.eq.'+currentUser.id+',opponent_id.eq.'+currentUser.id).in('status',['waiting','active']).order('created_at',{ascending:false});
    if(activeDuels&&activeDuels.length){
      activeHtml='<div style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin:16px 0 8px">Duels en cours</div>';
      activeHtml+=activeDuels.map(d=>{
        const ic=d.challenger_id===currentUser.id;
        const opp=ic?(d.opponent_name||'En attente…'):d.challenger_name;
        const myS=ic?d.challenger_score:d.opponent_score;
        const opS=ic?d.opponent_score:d.challenger_score;
        const st=d.status==='waiting'?'⏳ En attente':'⚔️ Ronde '+d.current_round+'/'+d.total_rounds;
        return `<div class="duel-history-item" onclick="resumeDuel('${d.id}')" style="cursor:pointer"><span class="duel-history-icon">${d.status==='waiting'?'⏳':'⚔️'}</span><div class="duel-history-info"><div style="font-weight:700;font-size:.82rem">vs ${opp}</div><div style="font-size:.7rem;color:var(--ink3)">${st}</div></div><div class="duel-history-score">${myS}–${opS}</div></div>`;
      }).join('');
    }
  }catch(e){}
  el.innerHTML=`<div class="duel-section"><div style="display:flex;gap:10px;margin-bottom:12px"><button class="btn-main" onclick="createDuel()" style="flex:1">⚔️ Cr\xe9er un duel</button><button class="btn-sec" onclick="showJoinDuel()" style="flex:1">🔗 Rejoindre</button></div>${activeHtml}<div id="duel-join-area"></div></div>`;
}
function showJoinDuel(){
  const area=document.getElementById('duel-join-area');if(!area)return;
  area.innerHTML=`<div class="duel-join-input"><input id="duel-code-input" placeholder="ENTR\xc9E CODE" maxlength="6" oninput="this.value=this.value.toUpperCase()"/><button class="btn-main" onclick="joinDuelByCode()">Go !</button></div>`;
  setTimeout(()=>document.getElementById('duel-code-input')?.focus(),50);
}
async function createDuel(){
  if(!currentUser)return;
  const code=genDuelCode();
  const{data,error}=await sb.from('duels').insert({code,challenger_id:currentUser.id,challenger_name:currentUser.username,status:'waiting',current_round:1,total_rounds:6,challenger_score:0,opponent_score:0,current_chooser_id:currentUser.id}).select().maybeSingle();
  if(error){showToast('Erreur : '+error.message);return;}
  if(!data){showToast('Erreur lors de la cr\u00e9ation du duel');return;}
  currentDuel=data;showDuelWaiting(data);
}
function showDuelWaiting(duel){
  const el=document.getElementById('multi-content');
  if(!el)return;
  el.innerHTML=`<div class="duel-section"><div class="duel-code-box"><div style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px">Partage ce code \xe0 ton adversaire</div><div class="duel-code">${duel.code}</div><button class="btn-sec" style="margin-top:12px;font-size:.78rem" onclick="navigator.clipboard.writeText('${duel.code}').then(()=>showToast('✓ Code copi\xe9 !'))">📋 Copier le code</button></div><div class="duel-waiting"><div class="spinner"></div><div>En attente de ton adversaire…</div></div><button class="btn-sec" style="width:100%;margin-top:8px" onclick="cancelDuel('${duel.id}')">Annuler</button></div>`;
  subscribeToDuel(duel.id);
}
async function cancelDuel(duelId){
  await sb.from('duels').update({status:'cancelled'}).eq('id',duelId);
  if(duelChannel){duelChannel.unsubscribe();duelChannel=null;}
  currentDuel=null;showDuelLobby();
}
async function joinDuelByCode(){
  const code=document.getElementById('duel-code-input')?.value?.trim().toUpperCase();
  if(!code||code.length<6){showToast('Entre un code valide (6 caract\xe8res)');return;}
  if(!currentUser){showToast('Connecte-toi !');return;}
  const{data:duel,error}=await sb.from('duels').select('*').eq('code',code).eq('status','waiting').maybeSingle();
  if(error||!duel){showToast('Code introuvable ou duel d\xe9j\xe0 commenc\xe9');return;}
  if(duel.challenger_id===currentUser.id){showToast('Tu ne peux pas rejoindre ton propre duel !');return;}
  const{error:e2}=await sb.from('duels').update({opponent_id:currentUser.id,opponent_name:currentUser.username,status:'active'}).eq('id',duel.id);
  if(e2){showToast('Erreur : '+e2.message);return;}
  const{data:updated,error:e3}=await sb.from('duels').select('*').eq('id',duel.id).maybeSingle();
  if(e3||!updated){showToast('Impossible de rejoindre ce duel');return;}
  currentDuel=updated;subscribeToDuel(updated.id);renderDuelGame(updated);
}
async function resumeDuel(duelId){
  const{data:duel}=await sb.from('duels').select('*').eq('id',duelId).maybeSingle();
  if(!duel)return;currentDuel=duel;subscribeToDuel(duelId);renderDuelGame(duel);
}
function subscribeToDuel(duelId){
  if(duelChannel){duelChannel.unsubscribe();}
  duelChannel=sb.channel('duel-'+duelId)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'duels',filter:'id=eq.'+duelId},p=>{currentDuel=p.new;renderDuelGame(p.new);})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'duel_rounds',filter:'duel_id=eq.'+duelId},p=>{renderDuelRound(p.new);})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'duel_rounds',filter:'duel_id=eq.'+duelId},p=>{renderDuelRound(p.new);})
    .subscribe();
}
async function renderDuelGame(duel){
  const el=document.getElementById('multi-content');if(!el)return;
  if(duel.status==='waiting'){showDuelWaiting(duel);return;}
  if(duel.status==='completed'){renderDuelResult(duel);return;}
  const ic=duel.challenger_id===currentUser.id;
  const myName=ic?duel.challenger_name:duel.opponent_name;
  const oppName=ic?(duel.opponent_name||'?'):duel.challenger_name;
  const myS=ic?duel.challenger_score:duel.opponent_score;
  const opS=ic?duel.opponent_score:duel.challenger_score;
  const isMyTurn=duel.current_chooser_id===currentUser.id;
  el.innerHTML=`<div class="duel-section"><div class="duel-round-info">Ronde ${duel.current_round} / ${duel.total_rounds}</div><div class="duel-players"><div class="duel-player${ic?' active':''}"><div class="duel-player-name">${myName}</div><div class="duel-player-score">${myS}</div></div><div class="duel-vs">⚔️</div><div class="duel-player${!ic?' active':''}"><div class="duel-player-name">${oppName}</div><div class="duel-player-score">${opS}</div></div></div><div id="duel-round-content"></div></div>`;
  const{data:round}=await sb.from('duel_rounds').select('*').eq('duel_id',duel.id).eq('round_number',duel.current_round).maybeSingle();
  if(!round){
    if(isMyTurn)showThemePicker(duel.id,duel.current_round);
    else document.getElementById('duel-round-content').innerHTML=`<div class="duel-waiting"><div class="spinner"></div><div>${oppName} choisit un th\xe8me…</div></div>`;
  }else{renderDuelRound(round);}
}
function showThemePicker(duelId,roundNumber){
  const el=document.getElementById('duel-round-content');if(!el)return;
  el.innerHTML=`<div style="text-align:center;font-weight:700;font-size:.85rem;margin-bottom:12px">C'est ton tour ! Choisis un th\xe8me :</div><div class="duel-theme-grid">${DUEL_THEMES.map(t=>`<button class="duel-theme-btn" onclick="pickDuelTheme('${duelId}',${roundNumber},'${t.id}')">${t.label}</button>`).join('')}</div>`;
}
async function pickDuelTheme(duelId,roundNumber,theme){
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
  const{error}=await sb.from('duel_rounds').insert({duel_id:duelId,round_number:roundNumber,chooser_id:currentUser.id,theme,anecdote_id:anecId,question:{type:q.type,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation},status:'answering'});
  if(error)showToast('Erreur : '+error.message);
}
function renderDuelRound(round){
  const el=document.getElementById('duel-round-content');if(!el||!round)return;
  const ic=currentDuel?currentDuel.challenger_id===currentUser.id:false;
  const myField=ic?'challenger_answer':'opponent_answer';
  const myAnswer=round[myField];
  const hasAnswered=myAnswer!==null&&myAnswer!==undefined;
  const q=round.question;if(!q)return;
  const opts=q.options||[];
  const corrAns=q.answer;
  if(round.status==='completed'){
    const cA=round.challenger_answer,oA=round.opponent_answer;
    const cN=currentDuel.challenger_name,oN=currentDuel.opponent_name;
    const ic2=currentDuel?currentDuel.challenger_id===currentUser.id:false;
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
    const icH=currentDuel?currentDuel.challenger_id===currentUser.id:false;
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
async function answerDuel(roundId,duelId,answer){
  if(!currentDuel)return;
  const ic=currentDuel.challenger_id===currentUser.id;
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
async function readyForNext(roundId,duelId){
  if(!currentDuel||!currentUser)return;
  const ic=currentDuel.challenger_id===currentUser.id;
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
window.readyForNext=readyForNext;

// --- Profil utilisateur enrichi (modal + URL partageable) ---
function _closeUserModal(){
  const bd=document.getElementById('user-modal-bd');
  if(bd)bd.remove();
  history.pushState('',document.title,window.location.pathname+window.location.search);
}

async function viewUserProfile(uid, fallbackName){
  // URL partageable
  window.location.hash='#/profil/'+uid;

  const old=document.getElementById('user-modal-bd');if(old)old.remove();
  const bd=document.createElement('div');
  bd.id='user-modal-bd';bd.className='user-modal-backdrop';
  bd.onclick=e=>{if(e.target===bd)_closeUserModal();};
  bd.innerHTML='<div class="user-modal user-modal-full"><div class="user-modal-loading">⏳ Chargement…</div></div>';
  document.body.appendChild(bd);

  // Fetch toutes les données en parallèle
  const[{data:prof},{data:reads},{data:qhist},{data:enigmaR},{data:userReads},{data:relData},{data:friendsCount}]=await Promise.all([
    sb.from('profiles').select('*').eq('id',uid).maybeSingle(),
    sb.from('reads').select('anecdote_id,date').eq('user_id',uid).order('date',{ascending:false}).limit(400),
    sb.from('quiz_history').select('pct,theme').eq('user_id',uid),
    sb.from('enigma_responses').select('id,is_correct').eq('user_id',uid),
    sb.from('reads').select('date').eq('user_id',uid).order('date',{ascending:false}).limit(400),
    currentUser&&currentUser.id!==uid
      ?sb.from('friendships').select('id,status,requester_id').or('and(requester_id.eq.'+currentUser.id+',addressee_id.eq.'+uid+'),and(requester_id.eq.'+uid+',addressee_id.eq.'+currentUser.id+')').maybeSingle()
      :{data:null},
    sb.from('friendships').select('id').or('requester_id.eq.'+uid+',addressee_id.eq.'+uid).eq('status','accepted'),
  ]);

  const name=prof?.username||fallbackName||'Anonyme';
  const color=prof?.color||'var(--a)';
  const level=prof?.level_name||'Novice';
  const xp=prof?.xp||0;
  const bio=prof?.bio||'';
  const streakRecord=prof?.streak_record||0;
  const joined=prof?.joined||prof?.created_at;
  const since=joined?new Date(joined).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'';

  // Stats
  const readCount=(reads||[]).length;
  const quizList=qhist||[];
  const avgQuiz=quizList.length?Math.round(quizList.reduce((s,q)=>s+q.pct,0)/quizList.length):0;
  const bestQuiz=quizList.length?Math.max(...quizList.map(q=>q.pct)):0;
  const enigmaTotal=(enigmaR||[]).length;
  const enigmaCorrect=(enigmaR||[]).filter(e=>e.is_correct).length;
  const totalFriends=(friendsCount||[]).length;

  // Streak
  let streak=0;
  if(userReads&&userReads.length){
    const dates=[...new Set(userReads.map(r=>r.date))].sort().reverse();
    const todayStr=today();let expected=todayStr;
    for(const date of dates){
      if(date===expected){streak++;const d=new Date(expected+'T12:00:00');d.setDate(d.getDate()-1);expected=d.toISOString().slice(0,10);}
      else if(date<expected)break;
    }
  }

  // Badges obtenus
  const badgeData={reads:readCount,streak,quizzes:quizList.length,avgQuiz,bestQuiz,friends:totalFriends,duelsPlayed:0,duelsWon:0,favs:0,shares:0,earlyBird:false,nightOwl:false,enigmaTotal,enigmaCorrect,enigmaCats:0,enigmaChooser:false,enigmaLogique:0,enigmaHistorique:0,enigmaMaths:0,perfectQuiz:bestQuiz>=100,themes:0,themeMap:{}};
  const earnedBadges=typeof BADGES_DEF!=='undefined'?BADGES_DEF.filter(b=>{try{return b.check(badgeData);}catch{return false;}}):[];

  // Relation d'amitié
  const rel=relData;
  const isFriend=rel&&rel.status==='accepted';
  const isPending=rel&&rel.status==='pending';
  const theyRequested=rel&&rel.requester_id===uid;
  const canChallenge=currentUser&&isFriend&&currentUser.id!==uid;
  let friendBtn='';
  if(currentUser&&currentUser.id!==uid){
    if(!rel){
      friendBtn='<button class="btn-main umo-action-btn" onclick="addFriend(\''+uid+'\',\''+name+'\');this.textContent=\'Demande envoyée ✓\';this.disabled=true">👥 Ajouter en ami</button>';
    } else if(isPending&&theyRequested){
      friendBtn='<button class="btn-main umo-action-btn" style="background:var(--gr)" onclick="acceptFriend(\''+rel.id+'\');this.textContent=\'Ami ✓\';this.disabled=true">✓ Accepter la demande</button>';
    } else if(isFriend){
      friendBtn='<div class="umo-friend-badge">✓ Vous êtes amis</div>';
    } else {
      friendBtn='<div class="umo-friend-badge" style="color:var(--ink3)">⏳ Demande en attente</div>';
    }
  }

  const slRank=getRank(xp);
  const shareUrl=window.location.origin+window.location.pathname+'#/profil/'+uid;

  const modal=bd.querySelector('.user-modal');
  modal.innerHTML=
    '<button class="user-modal-close" onclick="_closeUserModal()">✕</button>'+
    // En-tête SL
    '<div class="umo-header">'+
      '<div class="umo-av" style="background:'+slRank.bg+';border-color:'+slRank.color+';box-shadow:'+slRank.glow+'"><span style="color:'+slRank.color+'">'+name[0].toUpperCase()+'</span></div>'+
      '<div class="umo-info">'+
        '<div class="umo-level"><span class="umo-sl-rank-badge" style="color:'+slRank.color+';background:'+slRank.bg+'">RANG '+slRank.id+' · '+slRank.title+'</span></div>'+
        '<div class="umo-name">'+name+'</div>'+
        (since?'<div class="umo-since">Membre depuis le '+since+'</div>':'')+
        (bio?'<div class="umo-bio">'+bio+'</div>':'')+
        '<div class="umo-xp">'+xp+' XP</div>'+
      '</div>'+
    '</div>'+
    // Streak card SL
    (streak>0
      ?'<div class="umo-streak-card umo-streak-active">'+
          '<div class="umo-streak-fire">🔥</div>'+
          '<div class="umo-streak-content">'+
            '<div class="umo-streak-num">'+streak+'</div>'+
            '<div class="umo-streak-label">JOURS DE SUITE</div>'+
            (streakRecord>streak?'<div class="umo-streak-sub">Record : '+streakRecord+' 🏆</div>':'')+
          '</div>'+
        '</div>'
      :'<div class="umo-streak-card">'+
          '<div class="umo-streak-content">'+
            '<div class="umo-streak-num umo-streak-zero">—</div>'+
            '<div class="umo-streak-label umo-streak-zero">Pas encore de streak</div>'+
            (streakRecord?'<div class="umo-streak-sub umo-streak-zero">Record : '+streakRecord+'</div>':'')+
          '</div>'+
        '</div>'
    )+
    // Grille stats SL (6 cases)
    '<div class="umo-stats-grid">'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">📖</div><div class="psc-val">'+readCount+'</div><div class="psc-lbl">Anecdotes</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">🎯</div><div class="psc-val">'+quizList.length+'</div><div class="psc-lbl">Quiz</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">🔮</div><div class="psc-val">'+enigmaTotal+'</div><div class="psc-lbl">Énigmes</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">⭐</div><div class="psc-val">'+(avgQuiz?avgQuiz+'%':'—')+'</div><div class="psc-lbl">Score moy.</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">🏅</div><div class="psc-val">'+earnedBadges.length+'</div><div class="psc-lbl">Badges</div></div>'+
      '<div class="prof-stat-card sl-stat"><div class="psc-icon">👥</div><div class="psc-val">'+totalFriends+'</div><div class="psc-lbl">Amis</div></div>'+
    '</div>'+
    // Badges obtenus
    (earnedBadges.length
      ?'<div class="umo-section-title">🏅 Badges obtenus</div>'+
        '<div class="umo-badges-grid">'+
          earnedBadges.map(b=>
            '<div class="umo-badge-item umo-rarity-'+b.rarity+'" title="'+b.desc+'">'+
              '<span class="umo-badge-icon">'+b.icon+'</span>'+
              '<span class="umo-badge-name">'+b.name+'</span>'+
            '</div>'
          ).join('')+
        '</div>'
      :'')+
    // Actions
    '<div class="umo-actions">'+
      friendBtn+
      (canChallenge?'<button class="btn-main umo-action-btn" onclick="challengeFriend(\''+uid+'\',\''+name+'\');_closeUserModal()">⚔️ Défier en duel</button>':'')+
      '<button class="umo-share-btn" onclick="navigator.clipboard.writeText(\''+shareUrl+'\').then(()=>showToast(\'🔗 Lien copié !\'))">🔗 Partager ce profil</button>'+
    '</div>';
}

// ── Hash routing : profil partageable via URL ────────────────────────────────
function _handleHashRouting(){
  const m=window.location.hash.match(/^#\/profil\/([a-f0-9-]{36})$/i);
  if(m)viewUserProfile(m[1]);
}
window.addEventListener('hashchange',_handleHashRouting);
// Déclencher au chargement si hash présent (après auth)
document.addEventListener('DOMContentLoaded',()=>setTimeout(_handleHashRouting,800));
// ════════════════════════════════════════════════════════════════════════════
// v2 — DÉCONNEXION + EDIT PSEUDO + NOTIFICATIONS + DUELS ASYNC
// ════════════════════════════════════════════════════════════════════════════

// ── Déconnexion ──────────────────────────────────────────────────────────────
async function doSignOut(){
  await sb.auth.signOut();
  currentUser=null;
  updateHeader();
  closeNotifPanel();
  showToast('À bientôt !');
  goHome();
}

// ── Modifier le pseudo (via openAccountSettings) ──────────────────────────────

// ── Système de Notifications ─────────────────────────────────────────────────
let _notifChannel=null;

async function loadNotifications(){
  if(!currentUser)return;
  const{data}=await sb.from('notifications')
    .select('*').eq('user_id',currentUser.id)
    .order('created_at',{ascending:false}).limit(30);
  _renderNotifBadge(data||[]);
  _renderNotifList(data||[]);
}

function subscribeNotifications(){
  if(!currentUser)return;
  if(_notifChannel){_notifChannel.unsubscribe();}
  _notifChannel=sb.channel('notifs-'+currentUser.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},()=>loadNotifications())
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},()=>loadNotifications())
    .subscribe();
}

function _renderNotifBadge(notifs){
  const unread=(notifs||[]).filter(n=>!n.read).length;
  const bell=document.getElementById('notif-bell');
  const badge=document.getElementById('notif-bell-badge');
  if(!bell)return;
  if(currentUser){bell.style.display='flex';bell.style.alignItems='center';}
  if(badge){
    badge.style.display=unread>0?'flex':'none';
    badge.textContent=unread>9?'9+':String(unread);
  }
}

function _renderNotifList(notifs){
  const el=document.getElementById('notif-list');if(!el)return;
  if(!notifs||!notifs.length){el.innerHTML='<div class="notif-empty">Aucune notification</div>';return;}
  const icons={friend_request:'👥',friend_accepted:'🤝',duel_invite:'⚔️',duel_your_turn:'🎯',duel_result:'🏆'};
  el.innerHTML=notifs.map(n=>{
    const ic=icons[n.type]||'🔔';
    const p=n.payload||{};
    const titles={
      friend_request:(p.from||'Quelqu\'un')+' t\'a envoyé une demande d\'ami',
      friend_accepted:(p.from||'Ton ami')+' a accepté ta demande',
      duel_invite:(p.from||'Quelqu\'un')+' te défie en duel !',
      duel_your_turn:'C\'est ton tour dans le duel vs '+(p.opponent||'?'),
      duel_result:'Résultat du duel vs '+(p.opponent||'?')+' : '+(p.result||''),
    };
    const title=titles[n.type]||n.type;
    const ts=n.created_at?_timeAgo(new Date(n.created_at)):'';
    const action=_notifAction(n);
    return '<div class="notif-item'+(n.read?'':' unread')+'" onclick="'+action+';markNotifRead(\''+n.id+'\')">'+
      '<div class="notif-item-icon">'+ic+'</div>'+
      '<div class="notif-item-body"><div class="notif-item-title">'+title+'</div></div>'+
      '<div class="notif-item-time">'+ts+'</div>'+
    '</div>';
  }).join('');
}

function _notifAction(n){
  const p=n.payload||{};
  if(n.type==='friend_request'||n.type==='friend_accepted')return 'goProfile();switchTab(\'amis\')';
  if(n.type==='duel_invite'||n.type==='duel_your_turn'||n.type==='duel_result')
    return p.duel_id?'openAsyncDuel(\''+p.duel_id+'\')':'goPlay()';
  return 'void(0)';
}

function _timeAgo(date){
  const s=Math.round((Date.now()-date)/1000);
  if(s<60)return 'à l\'instant';
  if(s<3600)return Math.floor(s/60)+'min';
  if(s<86400)return Math.floor(s/3600)+'h';
  return Math.floor(s/86400)+'j';
}

function toggleNotifPanel(){
  const bd=document.getElementById('notif-bd');if(!bd)return;
  bd.classList.toggle('on');
}
function closeNotifPanel(){
  const bd=document.getElementById('notif-bd');if(bd)bd.classList.remove('on');
}

async function markNotifRead(id){
  await sb.from('notifications').update({read:true}).eq('id',id);
  loadNotifications();
}

async function markAllNotifsRead(){
  if(!currentUser)return;
  await sb.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false);
  loadNotifications();
}

async function _sendNotif(userId,type,payload){
  if(!userId)return;
  await sb.from('notifications').insert({user_id:userId,type,payload});
}

// ════════════════════════════════════════════════════════════════════════════
// Duels Async — Refonte complète (sans code, tour par tour, 5 manches × 3q)
// ════════════════════════════════════════════════════════════════════════════
let _asyncDuel=null; // duel en cours
const ASYNC_DUEL_THEMES=[
  {id:'histoire',  label:'Histoire',    icon:'🏛️'},
  {id:'science',   label:'Science',     icon:'🔬'},
  {id:'nature',    label:'Nature',      icon:'🌿'},
  {id:'insolite',  label:'Insolite',    icon:'🎭'},
  {id:'art',       label:'Art',         icon:'🎨'},
  {id:'espace',    label:'Espace',      icon:'🚀'},
  {id:'sport',     label:'Sport',       icon:'⚡'},
  {id:'food',      label:'Gastro',      icon:'🍽️'},
  {id:'legendes',  label:'Légendes',    icon:'🔍'},
];

// Remplace la fonction showDuelLobby existante
async function showDuelLobby(){
  const el=document.getElementById('multi-content');if(!el)return;
  document.getElementById('multi-title-txt').innerHTML='<em>Duels</em>';
  document.getElementById('multi-sub').textContent='Tour par tour — 5 manches, 3 questions chacune.';
  if(!currentUser){
    el.innerHTML='<div class="duel-waiting"><p style="margin-bottom:16px">Connecte-toi pour jouer en duel !</p><button class="btn-main" onclick="show(\'screen-login\')">Se connecter</button></div>';
    return;
  }
  el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--ink3);font-size:.8rem;">⏳ Chargement…</div>';
  // Charger les duels actifs
  const{data:duels}=await sb.from('async_duels')
    .select('*').or('player_a.eq.'+currentUser.id+',player_b.eq.'+currentUser.id)
    .in('status',['pending','active']).order('updated_at',{ascending:false});
  const activeHtml=(duels&&duels.length)?
    '<div class="duel-active-label">Duels en cours</div>'+
    duels.map(d=>{
      const isA=d.player_a===currentUser.id;
      const oppName=isA?d.player_b_name:d.player_a_name;
      const myScore=isA?d.score_a:d.score_b;
      const opScore=isA?d.score_b:d.score_a;
      const myTurn=d.current_turn===currentUser.id;
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

async function showChallengeFriend(){
  const el=document.getElementById('multi-content');if(!el)return;
  document.getElementById('multi-title-txt').innerHTML='<em>Défier</em> un ami';
  const backBtn=document.querySelector('#screen-multi .btn-back');
  if(backBtn){backBtn.style.display='block';}
  el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--ink3);">⏳ Chargement des amis…</div>';
  const{data:friends}=await sb.from('friendships')
    .select('*,req:profiles!friendships_requester_id_fkey(id,username),adr:profiles!friendships_addressee_id_fkey(id,username)')
    .or('requester_id.eq.'+currentUser.id+',addressee_id.eq.'+currentUser.id)
    .eq('status','accepted');
  if(!friends||!friends.length){
    el.innerHTML='<div class="duel-friend-list"><div style="text-align:center;padding:2rem;color:var(--ink3);font-size:.8rem;">Tu n\'as pas encore d\'amis.<br><a onclick="goProfile();switchTab(\'amis\')" style="color:var(--a);cursor:pointer;">Chercher des amis →</a></div></div>';
    return;
  }
  const items=friends.map(f=>{
    const isReq=f.requester_id===currentUser.id;
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

async function challengeFriend(friendId,friendName){
  if(!currentUser)return;
  const btn=document.getElementById('challenge-btn-'+friendId);
  if(btn){btn.disabled=true;btn.textContent='⏳';}
  // Créer le duel
  const{data:duel,error}=await sb.from('async_duels').insert({
    player_a:currentUser.id,player_a_name:currentUser.username,
    player_b:friendId,player_b_name:friendName,
    status:'active',current_turn:currentUser.id,current_round:1
  }).select().maybeSingle();
  if(error||!duel){showToast('Erreur lors de la création du duel');if(btn){btn.disabled=false;btn.textContent='Défier';}return;}
  // Notifier l'ami
  await _sendNotif(friendId,'duel_invite',{from:currentUser.username,duel_id:duel.id});
  showToast('✓ Défi envoyé à '+friendName+' !');
  openAsyncDuel(duel.id);
}

async function joinRandomDuel(){
  if(!currentUser){showToast('Connecte-toi !');return;}
  showToast('🔍 Recherche d\'adversaire…');
  // Chercher un duel aléatoire en attente d'un joueur
  const{data:waiting}=await sb.from('async_duels')
    .select('*').eq('status','pending').eq('is_random',true)
    .is('player_b',null).neq('player_a',currentUser.id).limit(1).maybeSingle();
  if(waiting){
    // Rejoindre ce duel
    const{error}=await sb.from('async_duels').update({
      player_b:currentUser.id,player_b_name:currentUser.username,
      status:'active',current_turn:waiting.player_a
    }).eq('id',waiting.id);
    if(error){showToast('Erreur : '+error.message);return;}
    await _sendNotif(waiting.player_a,'duel_your_turn',{opponent:currentUser.username,duel_id:waiting.id});
    showToast('✓ Adversaire trouvé !');
    openAsyncDuel(waiting.id);
  }else{
    // Créer un duel aléatoire en attente
    const{data:duel,error}=await sb.from('async_duels').insert({
      player_a:currentUser.id,player_a_name:currentUser.username,
      status:'pending',current_turn:currentUser.id,is_random:true
    }).select().maybeSingle();
    if(error||!duel){showToast('Erreur');return;}
    showToast('⏳ En attente d\'un adversaire… Tu seras notifié dès qu\'il arrive !');
    openAsyncDuel(duel.id);
  }
}

async function openAsyncDuel(duelId){
  const el=document.getElementById('multi-content');if(!el)return;
  document.getElementById('multi-title-txt').innerHTML='<em>Duel</em>';
  el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--ink3);">⏳ Chargement…</div>';
  const{data:duel}=await sb.from('async_duels').select('*').eq('id',duelId).maybeSingle();
  if(!duel){showToast('Duel introuvable');showDuelLobby();return;}
  _asyncDuel=duel;show('screen-multi');renderAsyncDuelView(duel);
}

async function renderAsyncDuelView(duel){
  const el=document.getElementById('multi-content');if(!el)return;
  const isA=duel.player_a===currentUser.id;
  const myScore=isA?duel.score_a:duel.score_b;
  const opScore=isA?duel.score_b:duel.score_a;
  const oppName=isA?duel.player_b_name:duel.player_a_name;
  const myTurn=duel.current_turn===currentUser.id;

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

function renderAsyncThemePicker(el,scoreHtml,duel){
  const btnHtml=ASYNC_DUEL_THEMES.map(t=>
    '<button class="duel-round-theme-btn" onclick="asyncPickTheme(\''+duel.id+'\','+duel.current_round+',\''+t.id+'\')">'+t.icon+'<br>'+t.label+'</button>'
  ).join('');
  el.innerHTML=scoreHtml+
    '<div style="font-weight:700;font-size:.82rem;margin-bottom:.75rem;text-align:center;">🎯 C\'est ton tour ! Choisis un thème pour cette manche :</div>'+
    '<div class="duel-round-theme-grid">'+btnHtml+'</div>';
}

async function asyncPickTheme(duelId,roundNumber,theme){
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
  const isA=_asyncDuel&&_asyncDuel.player_a===currentUser.id;
  const answers_me={answers:[],score:0,answered_at:null};
  const{error}=await sb.from('async_duel_rounds').insert({
    duel_id:duelId,round_number:roundNumber,theme,initiated_by:currentUser.id,questions,
    answers_a:isA?null:null,answers_b:null
  });
  if(error){showToast('Erreur : '+error.message);return;}
  // Recharger le duel
  const{data:duel}=await sb.from('async_duels').select('*').eq('id',duelId).maybeSingle();
  if(duel){_asyncDuel=duel;renderAsyncDuelView(duel);}
}

// ─── ASYNC DUEL QUESTION RENDERING ───────────────────────────────────────────
let _asyncRoundAnswers = [];
let _asyncRoundQIdx    = 0;
let _asyncCurrentRound = null;
window._asyncRoundQs   = [];   // questions stored globally (no JSON in onclick)

function renderAsyncQuestions(el, scoreHtml, duel, round) {
  _asyncCurrentRound  = round;
  _asyncRoundAnswers  = [];
  _asyncRoundQIdx     = 0;
  window._asyncRoundQs = round.questions || [];
  if (!window._asyncRoundQs.length) { showToast('Aucune question dans cette manche'); return; }
  el.innerHTML = scoreHtml + '<div id="duel-q-zone"></div>';
  renderAsyncQuestion(duel);
}

function renderAsyncQuestion(duel) {
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

function answerAsyncQ(optIdx, duelId) {
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

async function submitAsyncAnswers(duel) {
  const qs      = window._asyncRoundQs;
  const score   = _asyncRoundAnswers.filter(a => a.correct).length;
  const roundNo = _asyncCurrentRound ? _asyncCurrentRound.round_number : 1;

  // Determine which score column to update
  const isChallenger = (duel.challenger_id === currentUser.id);
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

async function advanceAsyncDuel(duel, roundNo, roundScore) {
  const isChallenger = (duel.challenger_id === currentUser.id);
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

function resolveWinner(updates, duel) {
  const cs = (updates.challenger_score !== undefined) ? updates.challenger_score : duel.challenger_score;
  const os = (updates.opponent_score   !== undefined) ? updates.opponent_score   : duel.opponent_score;
  if (cs > os)  return duel.challenger_id;
  if (os > cs)  return duel.opponent_id;
  return null; // draw
}

function renderAsyncDuelResult(duel, roundScore) {
  const el = document.getElementById('screen-duel');
  if (!el) return;

  const isChallenger = (duel.challenger_id === currentUser.id);
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

async function cancelAsyncDuel(duelId) {
  if (!confirm('Abandonner ce duel ?')) return;
  const { error } = await sb.from('async_duels').update({ status: 'cancelled' }).eq('id', duelId);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Duel annulé');
  showDuelLobby();
}

// ─── PARAMÈTRES COMPTE ────────────────────────────────────────────────────────

async function openAccountSettings() {
  const bd = document.getElementById('acct-modal-bd');
  if (!bd) return;

  // Pré-remplir l'email actuel — appel frais pour éviter le cache JWT
  const emailEl = document.getElementById('acct-current-email');
  if (emailEl) {
    try {
      const { data: { user: freshUser } } = await sb.auth.getUser();
      if (freshUser) {
        emailEl.textContent = freshUser.email || '—';
        if (currentUser) currentUser.email = freshUser.email || '';
      }
    } catch(e) {
      if (emailEl && currentUser) emailEl.textContent = currentUser.email || '—';
    }
  }

  // Pré-remplir le pseudo actuel
  const unEl = document.getElementById('acct-username-input');
  if (unEl && currentUser) unEl.value = currentUser.username || '';

  // Pré-remplir la bio
  const bioEl = document.getElementById('acct-bio-input');
  if (bioEl && currentUser) bioEl.value = currentUser.bio || '';

  // Afficher les providers connectés
  _renderProviders();



  // Reset erreurs
  ['acct-username-err','acct-email-err','acct-pw-err','acct-bio-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  bd.style.display = 'flex';
  // Activer le premier onglet
  switchAcctTab('profil', document.querySelector('.acct-tab'));
}

function closeAccountSettings() {
  const bd = document.getElementById('acct-modal-bd');
  if (bd) bd.style.display = 'none';
}

function switchAcctTab(name, btn) {
  // Masquer tous les panels
  ['profil','compte','notifs','danger'].forEach(t => {
    const p = document.getElementById('acct-panel-' + t);
    if (p) p.style.display = 'none';
  });
  // Désactiver tous les onglets
  document.querySelectorAll('.acct-tab').forEach(b => b.classList.remove('active'));
  // Afficher le bon panel
  const panel = document.getElementById('acct-panel-' + name);
  if (panel) panel.style.display = '';
  if (btn) btn.classList.add('active');
}

function _renderProviders() {
  const el = document.getElementById('acct-providers');
  if (!el || !currentUser) return;
  const providers = currentUser.app_metadata?.providers || [currentUser.app_metadata?.provider || 'email'];
  const icons = { email: '📧', discord: '💬', google: '🔵', github: '⚫' };
  const names = { email: 'Email / Mot de passe', discord: 'Discord', google: 'Google', github: 'GitHub' };
  el.innerHTML = providers.map(p =>
    '<div class="acct-provider-row">' +
      '<span class="acct-provider-icon">' + (icons[p] || '❓') + '</span>' +
      '<span class="acct-provider-name">' + (names[p] || p) + '</span>' +
    '</div>'
  ).join('');
}

// ── Supprimer le compte ──────────────────────────────────────────────────────
async function confirmDeleteAccount() {
  const input = prompt('Pour confirmer, tape "SUPPRIMER" en majuscules :');
  if (input !== 'SUPPRIMER') { showToast('Suppression annulée.'); return; }
  await sb.from('profiles').delete().eq('id', currentUser.id);
  await sb.auth.signOut();
  showToast('Compte supprimé. À bientôt peut-être 👋');
  currentUser = null;
  goHome();
}

// ─── 1 CONTRE 100 ─────────────────────────────────────────────────────────────

const BOT_RANKS_DEF=[
  {id:'E',count:40,successRate:0.38,color:'#9ca3af'},
  {id:'D',count:25,successRate:0.52,color:'#60a5fa'},
  {id:'C',count:20,successRate:0.65,color:'#34d399'},
  {id:'B',count:10,successRate:0.75,color:'#fbbf24'},
  {id:'A',count:4, successRate:0.85,color:'#f97316'},
  {id:'S',count:1, successRate:0.93,color:'#a855f7'},
];

const BOT_NAMES_POOL=[
  'Théo42','LucasQ','Emma_X','JujuPro','Naomie','Zak99','BirH','KilianK',
  'Sofia3','MaxDev','Clément','InèsZ','ThibO','CharlyB','Jérémy','NoéM',
  'AlinaS','Baptiste','Florent','ChloéX','AntoineR','MaevaQ','OlivierT','SarahV',
  'RemiC','PaulaD','TomG','IsaH','KarimL','ValéryM','DorianN','LauraO',
  'VincentP','NathalQ','GregR','StephS','AnnikaT','MarcV','JuliettW','CyrilX',
  'AurelyY','GastonZ','SimonA','MarieB','RafaelC','EloiseD','EdouardE','LeaF',
  'AlbanG','CamilH','DamienI','FlorJ','GuillK','HenriL','IreneM','JacqN',
  'KevO','LisaP','MathQ','NinaR','OlgaS','PierrT','RoxanU','SamuelV',
  'TaniaW','UgoX','ViolaY','WilZ','XavA','YannB','ZoéC','ActD',
  'BeatE','CedF','DelphG','EtienH','FabI','GenevJ','HugoK','IrinaL',
  'JoakM','KatiaN','LorenO','MariP','NicoQ','OctavR','PercS','QuinT',
  'RomU','SylvV','ThierW','UlanX','VictY','WendZ','XimA','YvetB',
  'ZachC','AbelD'
];

const FALLBACK_VS100=[
  {question:"Quelle est la capitale de l'Australie ?",answers:["Sydney","Melbourne","Canberra","Brisbane"],correctIdx:2},
  {question:"Combien de côtés a un hexagone ?",answers:["5","6","7","8"],correctIdx:1},
  {question:"Qui a peint la Joconde ?",answers:["Michel-Ange","Raphaël","Léonard de Vinci","Botticelli"],correctIdx:2},
  {question:"En quelle année a eu lieu la Révolution française ?",answers:["1789","1769","1799","1815"],correctIdx:0},
  {question:"Quel est l'élément chimique de symbole 'Fe' ?",answers:["Fluor","Fer","Francium","Fermium"],correctIdx:1},
  {question:"Quelle planète est la plus grande du système solaire ?",answers:["Saturne","Neptune","Jupiter","Uranus"],correctIdx:2},
  {question:"Combien d'os contient le corps humain adulte ?",answers:["196","206","216","226"],correctIdx:1},
  {question:"Qui a écrit 'Les Misérables' ?",answers:["Balzac","Zola","Hugo","Flaubert"],correctIdx:2},
  {question:"Quelle est la vitesse de la lumière (km/s) ?",answers:["100 000","200 000","300 000","400 000"],correctIdx:2},
  {question:"En quelle année l'Homme a-t-il marché sur la Lune pour la première fois ?",answers:["1965","1967","1969","1971"],correctIdx:2},
];

function generateVs100Bots(){
  const bots=[];
  let nameIdx=0;
  BOT_RANKS_DEF.forEach(tier=>{
    for(let i=0;i<tier.count;i++){
      bots.push({
        id:bots.length,
        name:BOT_NAMES_POOL[nameIdx%BOT_NAMES_POOL.length],
        rank:tier.id,
        color:tier.color,
        successRate:tier.successRate,
        eliminated:false,
      });
      nameIdx++;
    }
  });
  return bots;
}

async function fetchVs100Questions(){
  try{
    const{data}=await sb.from('quiz_questions')
      .select('id,question,correct_answer,wrong_answers')
      .limit(300);
    if(data&&data.length>=10){
      const shuffled=data.sort(()=>Math.random()-.5).slice(0,10);
      return shuffled.map(q=>{
        const allAns=[q.correct_answer,...(q.wrong_answers||[])].filter(Boolean).sort(()=>Math.random()-.5);
        if(allAns.length<2)return null;
        return{question:q.question,answers:allAns,correctIdx:allAns.indexOf(q.correct_answer)};
      }).filter(Boolean);
    }
  }catch(e){console.error('fetchVs100',e);}
  return FALLBACK_VS100;
}

function getOrCreateVs100Screen(){
  let sc=document.getElementById('screen-vs100');
  if(!sc){
    sc=document.createElement('div');
    sc.id='screen-vs100';sc.className='screen';
    const container=document.querySelector('main')||document.body;
    container.appendChild(sc);
  }
  return sc;
}
function show1vs100Lobby(){
  const sc=getOrCreateVs100Screen();
  let previewDots='';
  BOT_RANKS_DEF.forEach(tier=>{
    for(let i=0;i<tier.count;i++){
      previewDots+=`<div class="vs100-dot" style="background:${tier.color};box-shadow:0 0 5px ${tier.color}55;"></div>`;
    }
  });
  sc.innerHTML=`
<div class="vs100-lobby">
  <div class="vs100-lobby-header">
    <button class="vs100-back-btn" onclick="showHub()">← Retour</button>
    <div class="vs100-logo-wrap">
      <div class="vs100-logo-1">1</div>
      <div class="vs100-logo-vs">CONTRE</div>
      <div class="vs100-logo-100">100</div>
    </div>
    <p class="vs100-lobby-sub">Affronte 100 challengers. Reste le dernier debout.</p>
  </div>
  <div class="vs100-rules-grid">
    <div class="vs100-rule"><span>❓</span><span>10 questions · 4 choix</span></div>
    <div class="vs100-rule"><span>🤖</span><span>100 bots rangs E → S</span></div>
    <div class="vs100-rule"><span>⏱</span><span>20 secondes par question</span></div>
    <div class="vs100-rule"><span>💀</span><span>1 erreur = fin de partie</span></div>
    <div class="vs100-rule"><span>🏆</span><span>Tous éliminés = +500 XP</span></div>
    <div class="vs100-rule"><span>📈</span><span>Les forts survivent plus longtemps</span></div>
  </div>
  <div class="vs100-preview-wrap">
    <div class="vs100-preview-label">LES 100 CHALLENGERS</div>
    <div class="vs100-preview-grid">${previewDots}</div>
    <div class="vs100-preview-legend">
      ${BOT_RANKS_DEF.map(t=>`<span class="vs100-leg-dot" style="background:${t.color};"></span><span class="vs100-leg-lbl">${t.id} (${t.count})</span>`).join('')}
    </div>
  </div>
  <button class="vs100-launch-btn" id="vs100-launch-btn" onclick="start1vs100()">⚡ LANCER LA PARTIE</button>
</div>`;
  show('screen-vs100');updateNav('');
}

async function start1vs100(){
  const btn=document.getElementById('vs100-launch-btn');
  if(btn){btn.textContent='⏳ Préparation...';btn.disabled=true;}
  const questions=await fetchVs100Questions();
  const bots=generateVs100Bots();
  vs100State={questions,bots,currentQ:0,playerEliminated:false,botsAlive:100,_timer:null};
  renderVs100Question();
}

function renderVs100Question(){
  const s=vs100State;
  if(!s)return;
  if(s.currentQ>=s.questions.length){endVs100Victory();return;}
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

async function pickVs100Answer(chosen){
  const s=vs100State;
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
  vs100ShowInterlude(eliminated.length,s.botsAlive,s.currentQ);
}

function vs100AnimateElim(eliminated){
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

function vs100Delay(ms){return new Promise(r=>setTimeout(r,ms));}

function vs100ShowInterlude(elimCount,botsLeft,nextQ){
  const sc=getOrCreateVs100Screen();
  const panel=document.createElement('div');
  panel.className='vs100-interlude';
  panel.innerHTML=`
    <div class="vs100-interlude-box">
      <div class="vs100-interlude-elim">💀 <strong>${elimCount}</strong> challenger${elimCount>1?'s':''} éliminé${elimCount>1?'s':''}</div>
      <div class="vs100-interlude-remain">
        <span class="vs100-interlude-count">${botsLeft}</span>
        <span class="vs100-interlude-lbl">challenger${botsLeft>1?'s':''} encore debout</span>
      </div>
      <div class="vs100-interlude-next">Question ${nextQ}/10</div>
      <button class="vs100-continue-btn" onclick="this.closest('.vs100-interlude').remove();renderVs100Question();">Continuer ▶</button>
    </div>`;
  sc.appendChild(panel);
  requestAnimationFrame(()=>panel.classList.add('vs100-interlude-show'));
}

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
    <div class="vs100-dc-row"><span>Questions réussies</span><span class="vs100-dc-val">${s.currentQ-1} / 10</span></div>
    <div class="vs100-dc-row"><span>Ta réponse</span><span class="vs100-dc-val vs100-dc-wrong">${picked}</span></div>
    <div class="vs100-dc-row"><span>Bonne réponse</span><span class="vs100-dc-val vs100-dc-ok">${correct}</span></div>
    <div class="vs100-dc-row"><span>Challengers restants</span><span class="vs100-dc-val" style="color:#f97316;">${s.botsAlive} / 100</span></div>
  </div>
  <div class="vs100-defeat-btns">
    <button class="vs100-retry-btn" onclick="show1vs100Lobby()">🔄 Réessayer</button>
    <button class="vs100-home-btn" onclick="showHub()">← Accueil</button>
  </div>
</div>`;
}


async function endVs100Victory(){
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
