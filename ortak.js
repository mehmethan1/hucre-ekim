/* Sena'nın Lab Kiti — ortak yardımcılar */
window.Lab=(function(){
  const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
  // "1,5" veya "1.5" -> 1.5
  const num=v=>{if(v==null)return NaN;const s=String(v).trim().replace(',','.');if(s==='')return NaN;return Number(s)};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function load(key,def){try{const v=JSON.parse(localStorage.getItem(key));return v==null?def:v}catch(e){return def}}
  function save(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}

  const DAY=864e5;
  const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const daysBetween=(a,b)=>Math.round((startOfDay(b)-startOfDay(a))/DAY);
  const dateStr=(d,withTime=true)=>new Date(d).toLocaleString('tr-TR',withTime?{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}:{weekday:'short',day:'numeric',month:'short'});
  const timeStr=d=>new Date(d).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  const pad=n=>String(n).padStart(2,'0');
  const toLocalInput=d=>{d=new Date(d);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
  function dur(ms){ // 1 g 3 sa 12 dk
    const neg=ms<0;ms=Math.abs(ms);
    const m=Math.floor(ms/6e4),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60;
    let s=d?`${d} g ${h} sa`:h?`${h} sa ${mm} dk`:`${mm} dk`;
    return neg?s+' geçti':s;
  }
  function clock(ms){ms=Math.max(0,ms);const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;return (h?h+':'+pad(m):m)+':'+pad(ss)}
  function relDay(d){const n=daysBetween(new Date(),d);if(n===0)return 'bugün';if(n===1)return 'yarın';if(n===-1)return 'dün';return n>0?`${n} gün sonra`:`${-n} gün önce`}

  // ---- Takvim (.ics) ----
  const icsEsc=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const icsDate=d=>{d=new Date(d);return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+'00Z'};
  // events: [{title, start, minutes, desc, alarms:[dakika önce,...]}]
  function ics(events){
    const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sena Lab Kiti//TR','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    const now=icsDate(new Date());
    events.forEach(ev=>{
      L.push('BEGIN:VEVENT','UID:'+uid()+'@sena-lab','DTSTAMP:'+now,'DTSTART:'+icsDate(ev.start),
        'DTEND:'+icsDate(new Date(+new Date(ev.start)+(ev.minutes||15)*6e4)),'SUMMARY:'+icsEsc(ev.title));
      if(ev.desc)L.push('DESCRIPTION:'+icsEsc(ev.desc));
      (ev.alarms||[0]).forEach(a=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(ev.title),'TRIGGER:-PT'+a+'M','END:VALARM'));
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');return L.join('\r\n');
  }
  const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function download(name,text,type){
    if(type==='text/calendar'&&isIOS()){location.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(text);return}
    const blob=new Blob([text],{type:type+';charset=utf-8'});const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  }
  function addToCalendar(name,events){if(!events.length)return false;download(name,ics(events),'text/calendar');return true}

  // ---- Bildirim / ses ----
  let swReg=null;
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(r=>swReg=r).catch(()=>{})}
  const canNotify=()=>'Notification' in window;
  async function askNotify(){if(!canNotify())return 'unsupported';try{return await Notification.requestPermission()}catch(e){return 'denied'}}
  function notify(title,body,tag){
    try{navigator.vibrate&&navigator.vibrate([300,150,300,150,300])}catch(e){}
    beep();
    if(!canNotify()||Notification.permission!=='granted')return;
    const opt={body,tag:tag||title,renotify:true,icon:undefined};
    if(swReg&&swReg.showNotification){swReg.showNotification(title,opt).catch(()=>{try{new Notification(title,opt)}catch(e){}})}
    else{try{new Notification(title,opt)}catch(e){}}
  }
  let actx=null;
  function beep(){
    try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();
      [0,0.35,0.7].forEach(t=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=880;
        g.gain.setValueAtTime(0.0001,actx.currentTime+t);g.gain.exponentialRampToValueAtTime(0.3,actx.currentTime+t+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+t+0.25);o.connect(g).connect(actx.destination);o.start(actx.currentTime+t);o.stop(actx.currentTime+t+0.3)});
    }catch(e){}
  }
  // iOS'ta ses ilk dokunuşla açılır
  document.addEventListener('pointerdown',()=>{try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume&&actx.resume()}catch(e){}},{once:true});

  return {fmt,num,esc,uid,load,save,DAY,daysBetween,startOfDay,dateStr,timeStr,toLocalInput,dur,clock,relDay,ics,download,addToCalendar,askNotify,notify,canNotify,beep};
})();
