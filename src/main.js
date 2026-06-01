import * as Shared from './shared.js';
import * as Xp from './modules/xp.js';
import * as Auth from './modules/auth.js';
import * as Hub from './modules/hub.js';
import * as Anecdote from './modules/anecdote.js';
import * as Enigme from './modules/enigme.js';
import * as Mystery from './modules/mystery.js';
import * as Profile from './modules/profile.js';
import * as History from './modules/history.js';
import * as Play from './modules/play.js';
import * as Duels from './modules/duels.js';
import * as Admin from './modules/admin.js';
import * as Vs100 from './modules/vs100.js';
import * as Notifs from './modules/notifs.js';
import * as MaisDisMoi from './modules/mais-dis-moi.js';
import * as Ephemeride from './modules/ephemeride.js';
import * as TasDitQuoi from './modules/tas-dit-quoi.js';
import * as Archives from './modules/archives.js';
import * as Amis from './modules/amis.js';
import { state, sb } from './shared.js';

export function _handleHashRouting(){
  const hash=window.location.hash;
  const m=hash.match(/^\/profil\/([a-f0-9-]{36})$/i) || hash.match(/^#\/profil\/([a-f0-9-]{36})$/i) ;
  if(m){viewUserProfile(m[1]);return;}
  const SECTIONS=['hub','anecdote','quiz','enigme','mystere','duels','vs100','profil','notifs','admin','mais-dis-moi','ephemeride','tas-dit-quoi','archives','amis'];
  const sec=(hash||'').replace(/^#/,'').toLowerCase().split('/')[0];
  if(sec&&SECTIONS.includes(sec))show(sec);
}e();
    userResp=r;
  }

  const{data:allResps}=await sb.from('challenge_responses').select('answer,correct').eq('challenge_id',ch.id);
  const total=(allResps||[]).length;
  const nbOk=(allResps||[]).filter(r=>r.correct).length;
  const pctOk=total?Math.round(nbOk/total*100):0;
  const opts=(ch.options||[]);
  const answered=!!userResp;
  const optHtml=opts.map((o,i)=>{const cls='challenge-opt'+(answered?(i===ch.answer?' reveal-ok':''+selected):'');return '<button class="'+cls+'" '+(answered?'disabled':'')+' onclick="answerChallenge(\''+ch.id+'\','+i+','+ch.answer+')"><span style="font-weight:700;color:var(--ink3);margin-right:.4rem">'+String.fromCharCode(65+i)$+'.</span>'+o+'</button>';}).join('');
  let bottomHtml='';
  if(answered){const ok=userResp.correct;bottomHtml='<div class="challenge-result"><span>'+(ok?'✅':'❌')+'</span><span>'+(ok?'Bonne réponse !':'Raté ! La bonne réponse est <strong>'+opts[ch.answer]+'</strong>')+'</span></div>';
  }else if(!state.currentUser){bottomHtml='<div style="margin-top:.75rem;text-align:center"><button class="btn-main" style="font-size:.75rem;padding:.5rem 1.25rem" onclick="show(\'screen-login\')">Se connecter pour jouer</button></div>';}
  el.innerHTML='<div class="challenge-card"><div class="challenge-week">'+ch.icon+' Défi de la semaine</div><div class="challenge-q">'+ch.question+'</div><div class="challenge-opts">'+optHtml+'</div>'+bottomHtml+'</div>';}
function popXP(amount,anchorEl){const pop=document.createElement('div');pop.className='xp-pop';pop.textContent='+'+amount+' XP';if(anchorEl){const r=anchorEl.getBoundingClientRect();pop.style.left=r.left+'px';pop.style.top=r.top+'px';}else{pop.style.left='50%';pop.style.top='40%';}document.body.appendChild(pop);setTimeout(()=>pop.remove(),1300);}
  initOnboarding();if(isEte()){const f=document.getElementById('bingo-fab');if(f)f.style.display='flex';}
  if(state.currentUser){setTimeout(()=>{loadStreak();loadBingo();},50);}
  window.shareAnec=shareAnec;window.closeShare=closeShare;window.setReaction=setReaction;window.showDuelLobby=showDuelLobby;
  window.createDuel=createDuel;window.joinDuelByCode=joinDuelByCode;window.cancelDuel=cancelDuel;
  window.resumeDuel=resumeDuel;window.showJoinDuel=showJoinDuel;window.pickDuelTheme=pickDuelTheme;window.readyForNext=readyForNext;
  window.answerDuel=answerDuel;window.downloadShareImage=downloadShareImage;window.checkAndAwardBadges=checkAndAwardBadges;
  window.shareViaWhatsApp=shareViaWhatsApp;window.shareViaDiscord=shareViaDiscord;window.copyShareText=copyShareText;
  window.openBingo=openBingo;window.closeBingo=closeBingo;window.answerChallenge=answerChallenge;window.completeBingoCell=completeBingoCell;
  window.loadContexte=loadContexte;window.toggleContexte=toggleContexte;window.buildCommunityChallenge=buildCommunityChallenge;
})();
window.addEventListener('hashchange',_handleHashRouting);
document.addEventListener('DOMContentLoaded',()=>setTimeout(_handleHashRouting,800));
_handleHashRouting();
window.addEventListener('hashchange',_handleHashRouting);
async function loadNavConfig(){
  try{
    const[{data:hd},{data:bn}]=await Promise.all([sb.from('app_config').select('value').eq('key','nav_header').maybeSingle(),sb.from('app_config').select('value').eq('key','nav_bottom').maybeSingle()]);
    if(hd?.value){const tabs=JSON.parse(hd.value);tabs.forEach(t=>{const el=document.getElementById('top-tab-'+t.id);if(!el)return;if(t.hidden){el.style.display='none';return;}else{el.style.display='';}const lbl=el.querySelector('.logo-txt');if(lbl&&t.label)lbl.innerHTML=t;if(t.url)el.onclick=()=>{location.href=t.url;};const wipBadge=el.querySelector('[data-wip]');if(t.wip){el.style.opacity='.45';el.style.cursor='not-allowed';el.title='Bientot disponible';if(!wipBadge){const b=document.createElement('span');b.setAttribute('data-wip','1');b.textContent='WIP';el.appendChild(b);}}else{el.style.opacity='';el.style.cursor='';el.title='';if(wipBadge)wipBadge.remove();}});}if(bn?.value){const btns=JSON.parse(bn.value);const idMap={anec:'bn-anec',play:'bn-play',league:'bn-league',profil:'bn-profil'};btns.forEach(b=>{const el=document.getElementById(idMap[b.id]||('bn-'+b.id));if(!el)return;let ic=el.querySelector('.bn-icon');let lb=el.querySelector('.bn-label');if(ic&&b.icon)ic.textContent=b.icon;if(lb&&b.label)lb.textContent=b.label;if(b.url)el.onclick=()=>{location.href=b.url;};});}}catch(e){}}
async function loadSiteBanner(){try{var d=await sb.from("app_config").select("value").eq("key","site_banner").maybeSingle();if(!d.data||!d.data.value)return;var b=JSON.parse(d.data.value);if(!b.enabled||!b.message)return;if(!document.getElementById("site-banner")){var el=document.createElement("div");el.id="site-banner";document.body.insertBefore(el,document.body.firstChild);}var c=({info:"#3b82f6",warning:"#f59e0b",success:"#22c55e",error:"#ef4444"})[b.type]||"#3b82f6";el.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9999;padding:.6rem 1rem;background:"+c+"18;border-bottom:2px solid "+c+";display:flex;align-items:center;justify-content:center;gap:.6rem;font-size:.82rem;font-weight:600;color:"+c;var icon=document.createElement("span");icon.textContent=b.type==="warning"?"WARNING":b.type==="error"?"ERROR":"INFO";var msg=document.createElement("span");msg.textContent=b.message;var btn=document.createElement("button");btn.textContent="x";btn.style.cssText="margin-left:.75rem;background:none;border:none;cursor:pointer;font-size:1rem;opacity:.7";btn.addEventListener("click",function(){el.style.display="none";});el.innerHTML="";el.append(icon,msg,btn);document.documentElement.style.setProperty("--banner-h","38px");}catch(e){}}
setTimeout(loadSiteBanner,100);
