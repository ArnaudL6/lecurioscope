import { state, sb, show, escHtml, fmt } from '../shared.js';

let _histAllAnec=[],_histReads=new Set(),_histFavs=new Set(),_histFilter='all';

export async function goHistoire(){
  setRoute('hist');
  if(!state.currentUser){showToast('â  Connecte-toi pour voir ton historique !');show('screen-login');return;}
  updateNav('bn-hist');
  state.prevScreen=document.querySelector('.screen.on')?.id||'screen-anec';
  show('screen-hist');
  document.getElementById('hist-screen-list').innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--ink3);font-size:.8rem;">â³ Chargementâ¦</div>';
  const[{data:allAnec},{data:reads}]=await Promise.all([
    sb.from('anecdotes').select('*').lte('date',today()).order('date',{ascending:false}).limit(90),
    sb.from('reads').select('anecdote_id').eq('user_id',state.currentUser.id)
  ]);
  _histAllAnec=allAnec||[];
  _histReads=new Set((reads||[]).map(r=>r.anecdote_id));
  if(state.currentUser){const{data:favData}=await sb.from('favorites').select('anecdote_id').eq('user_id',state.currentUser.id);_histFavs=new Set((favData||[]).map(f=>String(f.anecdote_id)));}
  _histFilter='all';
  document.querySelectorAll('.hist-chip').forEach((c,i)=>c.classList.toggle('active',i===0));
  renderHistScreen();
}

export function filterHist(filter,btn){
  _histFilter=filter;
  document.querySelectorAll('.hist-chip').forEach(c=>c.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderHistScreen();
}

export function renderHistScreen(){
  const list=document.getElementById('hist-screen-list');if(!list)return;
  let items=_histAllAnec;
  if(_histFilter==='read')items=items.filter(a=>_histReads.has(a.id));
  if(_histFilter==='unread')items=items.filter(a=>!_histReads.has(a.id));
  if(_histFilter==='fav')items=items.filter(a=>_histFavs.has(String(a.id)));
  if(!items.length){list.innerHTML='<div class="empty"><span class="empty-ico">ð</span><p>Aucune anecdote ici.</p></div>';return;}
  list.innerHTML=items.map(a=>{
    const isRead=_histReads.has(a.id),isToday=a.date===today();
    return'<div class="hist-screen-card" onclick="viewHistAnec(\''+a.id+'\')">'
      +'<div class="hist-screen-icon">'+(a.icon||'ð')+'</div>'
      +'<div>'
        +'<div class="hist-screen-theme">'+(a.theme||'Anecdote')
          +(isToday?'<span class="hist-today-chip">Aujourd\'hui</span>':'')
        +'</div>'
        +'<div class="hist-screen-preview">'+(a.anecdote||'').slice(0,110)+'â¦</div>'
        +'<div class="hist-screen-footer">'
          +'<span class="hist-screen-date">'+fmtShort(a.date)+(a.chooser&&a.chooser!=='Auto'?' Â· '+a.chooser:'')+'</span>'
          +'<span class="'+(isRead?'hist-read-badge':'hist-unread-badge')+'">'+(isRead?'â Lu':'Ã lire')+'</span>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}

export async function viewHistAnec(anecId){
  state.prevScreen='screen-hist';
  const[{data:anec},{data:questions}]=await Promise.all([
    sb.from('anecdotes').select('*').eq('id',anecId).single(),
    sb.from('questions').select('*').eq('anecdote_id',anecId)
  ]);
  if(!anec){showToast('â  Anecdote introuvable.');return;}
  state.todayAnec=anec;state.todayQs=questions||[];
  if(state.currentUser){await markRead();_histReads.add(anecId);loadFavs();}
  showAnec(false);updateNav('bn-hist');
}
