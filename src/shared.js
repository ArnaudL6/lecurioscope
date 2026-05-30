export const SB_URL='https://zryrfmothjhywkklmniw.supabase.co';
export const SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeXJmbW90aGpoeXdra2xtbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTYzNjEsImV4cCI6MjA5NDkzMjM2MX0.BWsZ5nXj8ePlB577zozrSO3voroRp8wkqGvM9MExaDg';
export const EDGE=SB_URL+'/functions/v1/daily';
export const EDGE_ENIGME=SB_URL+'/functions/v1/daily-enigmas';
export const sb=supabase.createClient(SB_URL,SB_ANON);
export const ENIGME_CATS=[
  {id:'enigme_du_jour',  label:'Énigme du jour',     icon:'🔮', tag:'La classique'},
  {id:'qui_suis_je',     label:'Qui suis-je ?',       icon:'🎭', tag:'Indices progressifs'},
  {id:'logique',         label:'Logique',             icon:'🧩', tag:'Déduction & raisonnement'},
  {id:'cryptogramme',    label:'Cryptogramme',        icon:'🔐', tag:'Code chiffré'},
  {id:'historique',      label:'Historique',          icon:'🏛ï¸', tag:'Faits & personnages'},
  {id:'paradoxe',        label:'Paradoxe',            icon:'â¾ï¸', tag:'Logique & philosophie'},
  {id:'maths_recreatives',label:'Maths récréatives',  icon:'🔢', tag:'Puzzles numériques'},
  {id:'science',         label:'Science',             icon:'âï¸', tag:'Phénomènes & curiosités'},
  {id:'surprise',        label:'Surprise',            icon:'🎲', tag:"L'inattendu"},
];
export const THEMES=[
  {id:'histoire',label:'Histoire',icon:'🏛ï¸',tag:'Faits historiques'},
  {id:'science',label:'Science',icon:'🔬',tag:'Découvertes & curiosités'},
  {id:'nature',label:'Nature',icon:'🌿',tag:'Merveilles du vivant'},
  {id:'insolite',label:'Insolite',icon:'🎭',tag:"L'incroyable du quotidien"},
  {id:'art',label:'Art & Culture',icon:'🎨',tag:'Créations & artistes'},
  {id:'espace',label:'Espace',icon:'🚀',tag:"Au-delà de l'atmosphère"},
  {id:'sport',label:'Sport',icon:'â¡',tag:'Exploits & records'},
  {id:'food',label:'Gastronomie',icon:'🍽ï¸',tag:'Histoires de saveurs'},
  {id:'legendes',label:'Légendes Urbaines',icon:'🔍',tag:'Mythes & réalité'},
];
export const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

let toastTimer=null;

export const RANKS=[
  {id:'E', label:'E', title:'Néophyte',   minXP:0,      color:'#9ca3af', bg:'rgba(156,163,175,.08)', glow:'0 0 16px rgba(156,163,175,.25)'},
  {id:'D', label:'D', title:'Apprenti',   minXP:500,    color:'#60a5fa', bg:'rgba(96,165,250,.08)',  glow:'0 0 16px rgba(96,165,250,.3)'},
  {id:'C', label:'C', title:'Érudit',     minXP:1500,   color:'#34d399', bg:'rgba(52,211,153,.08)',  glow:'0 0 16px rgba(52,211,153,.3)'},
  {id:'B', label:'B', title:'Chercheur',  minXP:4000,   color:'#fbbf24', bg:'rgba(251,191,36,.08)',  glow:'0 0 16px rgba(251,191,36,.3)'},
  {id:'A', label:'A', title:'Maître',     minXP:10000,  color:'#f97316', bg:'rgba(249,115,22,.1)',   glow:'0 0 20px rgba(249,115,22,.35)'},
  {id:'S', label:'S', title:'Archiviste', minXP:25000,  color:'#a855f7', bg:'rgba(168,85,247,.1)',   glow:'0 0 24px rgba(168,85,247,.45)'},
  {id:'\u2605', label:'\u2605', title:'Légendaire', minXP:75000,  color:'#ec4899', bg:'rgba(236,72,153,.1)',   glow:'0 0 28px rgba(236,72,153,.5)'},
];

export const state={
  currentUser:null,todayAnec:null,todayQs:[],selThemeId:null,
  todayEnigme:null,todayEnigmeChoice:null,selEnigmeCat:null,enigmeCurRating:0,
  curRating:0,quizState:null,cdTimer:null,prevScreen:'screen-anec',
  multiChannel:null,multiState:null,
  userStreak:0,bingoCompleted:new Set(),
  currentUserXP:0,currentUserRank:null,
  vs100State:null
};

export function computeStreak(dates){
  if(!dates||!dates.length)return 0;
  const uniq=[...new Set(dates)].sort().reverse();
  let streak=0,cur=new Date(today()+'T00:00:00Z');
  for(let i=0;i<uniq.length;i++){const exp=cur.toISOString().slice(0,10);if(uniq[i]===exp){streak++;cur.setUTCDate(cur.getUTCDate()-1);}else break;}
  return streak;
}
export function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));const el=document.getElementById(id);if(el)el.classList.add('on');}

export function updateNav(active){['bn-anec','bn-hist','bn-play','bn-league','bn-profil'].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.toggle('active',id===active);});}

export function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

export function fmt(d){return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}

export function fmtShort(d){return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}

export function showErr(id,msg){const e=document.getElementById(id);if(e){e.textContent=msg;e.classList.add('on');}}

export function hideErr(id){const e=document.getElementById(id);if(e)e.classList.remove('on');}

export function setBtn(id,loading){const b=document.getElementById(id);if(!b)return;b.disabled=loading;b.style.opacity=loading?'.5':'1';}

export function showToast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('on');if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),2800);}

export function dayOfYear(){const n=new Date(),s=new Date(n.getFullYear(),0,0);return Math.floor((n-s)/86400000);}

export function daysInYear(){const y=new Date().getFullYear();return((y%4===0&&y%100!==0)||y%400===0)?366:365;}

export function goBack(){show(state.prevScreen);}

export function toggleDark(){/* dark mode permanent */}

export function updateToggleIcon(){const btn=document.getElementById('dark-toggle');if(!btn)return;btn.textContent=document.documentElement.classList.contains('dark')?'âï¸':'🌙';}

export function setRoute(hash){try{history.replaceState(null,'','#'+hash);}catch(e){location.hash='#'+hash;}}
