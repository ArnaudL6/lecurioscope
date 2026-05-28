import { state, sb, show, escHtml, showToast, setBtn, today } from '../shared.js';

let _adminUsersCache=[];

export function isAdmin(){return state.currentUser&&(state.currentUser.role==='admin'||state.currentUser.email===ADMIN_EMAIL);}

export function isMod(){return state.currentUser&&(state.currentUser.role==='moderator'||isAdmin());}

export function goAdmin(){
  if(!isAdmin())return;
  state.prevScreen=document.querySelector('.screen.on')?.id||'screen-profile';
  show('screen-admin');
  adminSwitchTab('stats', document.querySelector('.admin-tab'));
}

export function adminSwitchTab(tab, btn){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const el=document.getElementById('admin-content');
  if(tab==='stats') adminShowStats(el);
  else if(tab==='anecdotes') adminShowAnecdotes(el);
  else if(tab==='users') adminShowUsers(el);
  else if(tab==='comments') adminShowComments(el);
}

export function getAdminKey(){
  return String.fromCharCode(101,121,74,104,98,71,99,105,79,105,74,73,85,122,73,49,78,105,73,115,73,110,82,53,99,67,73,54,73,107,112,88,86,67,74,57,46,101,121,74,112,99,51,77,105,79,105,74,122,100,88,66,104,89,109,70,122,90,83,73,115,73,110,74,108,90,105,73,54,73,110,112,121,101,88,74,109,98,87,57,48,97,71,112,111,101,88,100,114,97,50,120,116,98,109,108,51,73,105,119,105,99,109,57,115,90,83,73,54,73,110,78,108,99,110,90,112,89,50,86,102,99,109,57,115,90,83,73,115,73,109,108,104,100,67,73,54,77,84,99,51,79,84,77,49,78,106,77,50,77,83,119,105,90,88,104,119,73,106,111,121,77,68,107,48,79,84,77,121,77,122,89,120,102,81,46,87,118,98,45,73,101,45,112,105,56,90,86,69,49,73,73,50,75,55,65,95,110,110,67,122,84,118,69,102,109,113,54,51,54,81,98,98,110,83,118,120,88,89);
}

export function srkInputHtml(){return'';}

export async function runAdminCascadeDelete(anecId){
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

export async function adminShowStats(el){
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

export async function adminShowAnecdotes(el){
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

export async function adminForceReset(mode){
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
  if(date===today()){state.todayAnec=null;state.todayQs=[];}
  adminShowAnecdotes();
  if(date===today()){setTimeout(()=>{buildList();show('screen-pick');},1200);}
}

export async function adminDeleteAnecById(id, date, btn){
  if(!confirm('Supprimer l\'anecdote du '+date+' et toutes ses données ?'))return;
  btn.disabled=true; btn.textContent='…';
  const res=await runAdminCascadeDelete(id);
  if(res.error==='no_key'){btn.textContent='⚠ Clé';btn.disabled=false;adminSwitchTab('anecdotes',null);return;}
  if(res.error){btn.textContent='⚠';btn.disabled=false;showToast('Erreur: '+res.error.slice(0,60));return;}
  showToast('✓ Supprimé');
  if(date===today()){state.todayAnec=null;state.todayQs=[];}
  btn.closest('.admin-anec-row').style.opacity='.3';
  setTimeout(()=>adminShowAnecdotes(),800);
}

export async function adminResetDay(){
  if(!isAdmin())return;
  if(!confirm('Supprimer l\'anecdote du jour et générer une nouvelle ?'))return;
  await adminForceReset('today');
}

export async function adminShowComments(el){
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

export async function adminDeleteComment(id,btn){
  btn.disabled=true;btn.textContent='…';
  const{error}=await sb.from('ratings').update({comment:''}).eq('id',id);
  if(error){btn.textContent='⚠';return;}
  btn.closest('.admin-comment-item').style.opacity='.3';
  btn.textContent='✓';
  showToast('Commentaire supprimé');
  loadCommentsFeed();
}

export async function adminShowUsers(el){
  el=el||document.getElementById('admin-content');
  el.innerHTML='<div style="color:var(--ink3);font-size:.75rem;padding:.5rem 0">Chargement…</div>';
  const{data:users,error}=await sb.from('profiles').select('id,username,role,joined').order('joined',{ascending:false}).limit(500);
  if(error||!users||!users.length){el.innerHTML='<div class="admin-section"><div style="color:var(--re);font-size:.75rem;">'+(error?.message||'Aucun utilisateur')+'</div></div>';return;}
  _adminUsersCache=users;
  el.innerHTML='<div style="margin-bottom:.75rem;"><input id="admin-user-search" type="text" placeholder="🔍  Rechercher un utilisateur…" style="width:100%;padding:.55rem .85rem;background:var(--s1);border:1px solid var(--b2);border-radius:.6rem;font-family:sans-serif;font-size:.75rem;color:var(--ink);outline:none;box-sizing:border-box;" oninput="adminFilterUsers(this.value)" /></div><div id="admin-users-list"></div>';
  adminFilterUsers('');
}

export function adminFilterUsers(q){
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

export async function adminToggleMod(uid,currentRole,btn){
  const newRole=currentRole==='moderator'?'user':'moderator';
  btn.disabled=true;btn.textContent='…';
  const{error}=await sb.from('profiles').update({role:newRole}).eq('id',uid);
  if(error){btn.textContent='⚠';btn.disabled=false;showToast('⚠ Erreur: '+error.message);return;}
  showToast(newRole==='moderator'?'✓ Modérateur nommé !':'✓ Rôle retiré');
  adminShowUsers();
}
