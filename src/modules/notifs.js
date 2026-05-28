import { state, sb } from '../shared.js';

let _notifChannel=null;

export async function loadNotifications(){
  if(!state.currentUser)return;
  const{data}=await sb.from('notifications')
    .select('*').eq('user_id',state.currentUser.id)
    .order('created_at',{ascending:false}).limit(30);
  _renderNotifBadge(data||[]);
  _renderNotifList(data||[]);
}

export function subscribeNotifications(){
  if(!state.currentUser)return;
  if(_notifChannel){_notifChannel.unsubscribe();}
  _notifChannel=sb.channel('notifs-'+state.currentUser.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+state.currentUser.id},()=>loadNotifications())
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:'user_id=eq.'+state.currentUser.id},()=>loadNotifications())
    .subscribe();
}

export function _renderNotifBadge(notifs){
  const unread=(notifs||[]).filter(n=>!n.read).length;
  const bell=document.getElementById('notif-bell');
  const badge=document.getElementById('notif-bell-badge');
  if(!bell)return;
  if(state.currentUser){bell.style.display='flex';bell.style.alignItems='center';}
  if(badge){
    badge.style.display=unread>0?'flex':'none';
    badge.textContent=unread>9?'9+':String(unread);
  }
}

export function _renderNotifList(notifs){
  const el=document.getElementById('notif-list');if(!el)return;
  if(!notifs||!notifs.length){el.innerHTML='<div class="notif-empty">Aucune notification</div>';return;}
  const icons={friend_request:'ð¥',friend_accepted:'ð¤',duel_invite:'âï¸',duel_your_turn:'ð¯',duel_result:'ð'};
  el.innerHTML=notifs.map(n=>{
    const ic=icons[n.type]||'ð';
    const p=n.payload||{};
    const titles={
      friend_request:(p.from||'Quelqu\'un')+' t\'a envoyÃ© une demande d\'ami',
      friend_accepted:(p.from||'Ton ami')+' a acceptÃ© ta demande',
      duel_invite:(p.from||'Quelqu\'un')+' te dÃ©fie en duel !',
      duel_your_turn:'C\'est ton tour dans le duel vs '+(p.opponent||'?'),
      duel_result:'RÃ©sultat du duel vs '+(p.opponent||'?')+' : '+(p.result||''),
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

export function _notifAction(n){
  const p=n.payload||{};
  if(n.type==='friend_request'||n.type==='friend_accepted')return 'goProfile();switchTab(\'amis\')';
  if(n.type==='duel_invite'||n.type==='duel_your_turn'||n.type==='duel_result')
    return p.duel_id?'openAsyncDuel(\''+p.duel_id+'\')':'goPlay()';
  return 'void(0)';
}

export function _timeAgo(date){
  const s=Math.round((Date.now()-date)/1000);
  if(s<60)return 'Ã  l\'instant';
  if(s<3600)return Math.floor(s/60)+'min';
  if(s<86400)return Math.floor(s/3600)+'h';
  return Math.floor(s/86400)+'j';
}

export function toggleNotifPanel(){
  const bd=document.getElementById('notif-bd');if(!bd)return;
  bd.classList.toggle('on');
}

export function closeNotifPanel(){
  const bd=document.getElementById('notif-bd');if(bd)bd.classList.remove('on');
}

export async function markNotifRead(id){
  await sb.from('notifications').update({read:true}).eq('id',id);
  loadNotifications();
}

export async function markAllNotifsRead(){
  if(!state.currentUser)return;
  await sb.from('notifications').update({read:true}).eq('user_id',state.currentUser.id).eq('read',false);
  loadNotifications();
}

export async function _sendNotif(userId,type,payload){
  if(!userId)return;
  await sb.from('notifications').insert({user_id:userId,type,payload});
}
