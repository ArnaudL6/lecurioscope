import { state, sb, show, escHtml, showToast, setBtn, today } from '../shared.js';
import { showHub, checkFriendRequests } from './hub.js';
import { awardXP } from './xp.js';
import { subscribeNotifications, _sendNotif } from './notifs.js';

const ONBOARD_SLIDES=[
  {wolf:'🐺',title:'Bienvenue !',desc:'Chaque jour, une nouvelle anecdote fascinante du monde entier vous attend.'},
  {wolf:'📖',title:'Lisez & Apprenez',desc:'Gagnez des XP en lisant et en répondant aux quiz. Montez de niveau et débloquez des badges !'},
  {wolf:'🏆',title:'Défiez vos amis',desc:'Ajoutez des amis, comparez vos scores dans la ligue hebdomadaire et grimpez au classement !'}
];
let _onboardStep=0;

export function updateHeader(){
  const lbl=document.getElementById('date-lbl');
  if(lbl)lbl.textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const btnL=document.getElementById('btn-hlogin'),btnA=document.getElementById('av-btn');
  if(state.currentUser){if(btnL)btnL.style.display='none';if(btnA){btnA.classList.add('on');btnA.textContent=state.currentUser.username[0].toUpperCase();}}
  else{if(btnL)btnL.style.display='';if(btnA)btnA.classList.remove('on');}
}

export async function doDiscordLogin(){
  const{error}=await sb.auth.signInWithOAuth({
    provider:'discord',
    options:{redirectTo:window.location.origin}
  });
  if(error)showToast('Erreur Discord : '+error.message);
}

export async function doForgotPassword(){
  const email=(document.getElementById('lu')?.value||'').trim();
  if(!email||!email.includes('@')){showErr('lerr','Entre ton email d\'abord.');return;}
  const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'?reset=1'});
  if(error){showErr('lerr','Erreur : '+error.message);return;}
  showToast('\u2709 Email de r\u00e9initialisation envoy\u00e9 !');
}

export function checkPwStrength(pw){
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

export async function doLogin(){
  const email=(document.getElementById('lu')?.value||'').trim(),p=document.getElementById('lp')?.value||'';
  hideErr('lerr');
  if(!email||!p){showErr('lerr','Remplis tous les champs.');return;}
  if(!email.includes('@')){showErr('lerr','Entre une adresse email valide.');return;}
  setBtn('btn-login',true);
  const{data,error}=await sb.auth.signInWithPassword({email,password:p});
  setBtn('btn-login',false);
  if(error){showErr('lerr','Email ou mot de passe incorrect.');return;}
  state.currentUser=await getProfile(data.user.id);
  if(!state.currentUser){showErr('lerr','Profil introuvable.');return;}
  state.currentUser.email=data.user.email||'';
  updateHeader();afterLogin();
}

export async function doRegister(){
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
  state.currentUser={id:data.user.id,username:u,joined:today(),email:data.user.email||''};
  updateHeader();afterLogin();
}

export async function getProfile(uid){const{data}=await sb.from('profiles').select('*').eq('id',uid).maybeSingle();return data;}

export function afterLogin(){
  showToast('\u2713 Connect\u00e9 en tant que '+state.currentUser.username+' !');
  showHub();
}

export async function doSignOut(){
  await sb.auth.signOut();
  state.currentUser=null;
  updateHeader();
  closeNotifPanel();
  showToast('À bientôt !');
  goHome();
}

export function showOnboarding(){
  if(localStorage.getItem('adj_onboarded'))return;
  const ol=document.getElementById('onboard-overlay');if(ol)ol.style.display='flex';
}

export function nextOnboard(){
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

export function initOnboarding(){
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

export function subscribeNewHunters(){
  sb.channel('new-hunters')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'profiles'},(payload)=>{
      if(state.currentUser&&payload.new.id===state.currentUser.id)return;
      showHunterToast(payload.new.username||'Chasseur inconnu');
    })
    .subscribe();
}

export function showHunterToast(username){
  let t=document.getElementById('hunter-toast');
  if(!t){t=document.createElement('div');t.id='hunter-toast';t.className='hunter-toast';document.body.appendChild(t);}
  t.innerHTML='<span class="hunter-toast-ico">⚡</span><div><div class="hunter-toast-title">Nouveau chasseur détecté</div><div class="hunter-toast-name">'+username+' a rejoint le Système</div></div>';
  t.classList.add('on');
  clearTimeout(t._tmr);
  t._tmr=setTimeout(()=>t.classList.remove('on'),4500);
}

export async function computeStreak(){
  if(!state.currentUser)return 0;
  const{data:logins}=await sb.from('user_logins').select('date').eq('user_id',state.currentUser.id).order('date',{ascending:false}).limit(400);
  if(!logins||!logins.length)return 0;
  const dates=[...new Set(logins.map(r=>r.date))].sort().reverse();
  const todayStr=today();
  let streak=0,expected=todayStr;
  for(const date of dates){
    if(date===expected){streak++;const d=new Date(expected+'T12:00:00');d.setDate(d.getDate()-1);expected=d.toISOString().slice(0,10);}
    else if(date<expected)break;
  }
  return streak;
}

export async function loadStreak(){
  if(state.currentUser)await sb.from('user_logins').upsert({user_id:state.currentUser.id,date:today()},{onConflict:'user_id,date'});
  const n=await computeStreak();
  state.userStreak=n;
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
