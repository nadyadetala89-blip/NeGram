
const pages={home:'Главная',chats:'Сообщения',bubbles:'Пузырь чата',stickers:'Стикеры',circles:'Видеокружки',faces:'Живые лица',ai:'NeGram AI',settings:'Настройки',premium:'Premium'};
function go(id){const target=document.getElementById(id);if(!target){showToast('Раздел пока недоступен');return}document.querySelectorAll('.content').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===id));document.getElementById('pageTitle').textContent=pages[id]||'NeGram';window.scrollTo({top:0,behavior:'smooth'})}
function openBubbleSettings(){go('bubbles')}
document.querySelectorAll('.chat-person').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.chat-person').forEach(x=>x.classList.remove('selected'));item.classList.add('selected');const name=item.querySelector('b')?.textContent||'Наша семья';const head=document.querySelector('.chat-head b');if(head)head.textContent=(name==='Наша семья'?'👨‍👩‍👧‍👦 ':'')+name;showToast('Открыт чат: '+name)}));
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
function showToast(s){let t=document.getElementById('toast');t.textContent=s;t.style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.style.display='none',2600)}
function appendChatMessage(content,kind='text'){let d=document.createElement('div');d.className='msg mine';if(kind==='face'){let f=document.createElement('span');f.className='face-reaction';f.textContent=content;d.appendChild(f)}else if(kind==='video'){let v=document.createElement('video');v.src=content;v.controls=true;v.playsInline=true;v.className='circle-video';d.appendChild(v)}else{d.textContent=content}let sm=document.createElement('small');sm.textContent='Ты · сейчас';d.appendChild(sm);document.getElementById('messages').appendChild(d);document.getElementById('messages').scrollTop=99999;return d}
function sendMessage(){let i=document.getElementById('messageInput'),v=i.value.trim();if(!v)return;appendChatMessage(v);i.value='';try{let a=JSON.parse(localStorage.getItem('ng_local_messages')||'[]');a.push({text:v,time:Date.now()});localStorage.setItem('ng_local_messages',JSON.stringify(a.slice(-100)))}catch(e){}}
const themes=[['Стандартный','linear-gradient(135deg,#b7a5d9,#7e699e)','Стандартный спокойный стиль'],['Гиппопотам','linear-gradient(135deg,#d6a8c9,#8b6b9c)','Мультяшный бегемотик 🦛'],['Гламурная дива','linear-gradient(135deg,#f2a4d4,#9e4caa)','Блеск и розовый гламур 💅'],['Лягушка и утка','linear-gradient(135deg,#a6d58b,#e9d58a)','Весёлый дуэт 🐸🦆'],['Капибара','linear-gradient(135deg,#c89a68,#8a5d3d)','Уютная капибара 🦫'],['Кот-силач','linear-gradient(135deg,#a6b4c9,#64758f)','Суперсильный кот 💪'],['Лягушка-рукалицо','linear-gradient(135deg,#9acb83,#568e62)','Ох уж эти дела 🤦'],['Кошка и собака','linear-gradient(135deg,#e9c8a8,#a77eae)','Дружная парочка 🐱🐶'],['Сердечки','linear-gradient(135deg,#f3a6c8,#b85c91)','Много сердечек 💕'],['Свинка','linear-gradient(135deg,#f2b2bb,#c96d87)','Розовая свинка 🐷'],['Акула','linear-gradient(135deg,#8fc8d8,#497c9c)','Морская акула 🦈']];
const grid=document.getElementById('bubbleGrid');themes.forEach((t,i)=>{let b=document.createElement('button');b.className='bubble-card'+(i===0?' selected':'');b.innerHTML=`<div class="bubble-thumb" style="background:${t[1]}"><span>Привет!</span><span>Привет 😊</span></div><b>${t[0]}</b><small>${t[2]}</small>`;b.onclick=()=>{document.querySelectorAll('.bubble-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.getElementById('previewChat').style.background=t[1];document.getElementById('previewIn').style.background='rgba(255,255,255,.88)';document.getElementById('previewIn').style.color='#272033';document.getElementById('previewOut').style.background='#7657d8';document.getElementById('previewChat').style.borderColor='#a78bfa';document.querySelectorAll('#messages .msg:not(.mine)').forEach(x=>{x.style.background='rgba(255,255,255,.88)';x.style.color='#272033'});document.querySelectorAll('#messages .msg.mine').forEach(x=>{x.style.background='#7657d8';x.style.color='#fff'});showToast('Выбрано оформление «'+t[0]+'»')};grid.appendChild(b)});
const stickers=[['🦛','Бегемот'],['💅','Гламур'],['🐸','Лягушка'],['🦆','Утка'],['🦫','Капибара'],['💪','Кот-силач'],['🤦','Рукалицо'],['🐱','Кошка'],['🐶','Собака'],['💕','Сердечки'],['🐷','Свинка'],['🦈','Акула'],['😂','Смешно'],['🥰','Обнимашки'],['🎉','Ура!']];let sg=document.getElementById('stickerGrid');stickers.forEach(s=>{let d=document.createElement('button');d.className='sticker';d.innerHTML=`<span class="emoji">${s[0]}</span><small>${s[1]}</small>`;d.onclick=()=>{appendChatMessage(s[0],'face');showToast('Стикер добавлен в локальный чат');};sg.appendChild(d)});
function aiRewrite(mode){let v=document.getElementById('aiInput').value.trim();if(!v){showToast('Сначала напиши черновик сообщения');return}let out=v;if(mode==='friendly')out='Привет! '+v+' 😊';if(mode==='short')out=v.split(/[.!?]/)[0].trim()+'.';if(mode==='formal')out=v.charAt(0).toUpperCase()+v.slice(1).replace(/\s+/g,' ')+' ✨';if(mode==='emoji')out=v+' 💜😊✨';document.getElementById('aiText').textContent=out;document.getElementById('aiResult').style.display='block'}
function useTune(){let n=Number(localStorage.getItem('ng_tune_demo')??2);if(n<=0){showToast('Бесплатные применения Auto-Tune закончились для всего NeGram');return}n--;localStorage.setItem('ng_tune_demo',n);document.getElementById('tuneCount').textContent=n;showToast('Демо Auto-Tune использовано. Осталось: '+n)}document.getElementById('tuneCount').textContent=localStorage.getItem('ng_tune_demo')??2;
function setTheme(t){if(t==='black'){document.documentElement.style.setProperty('--bg','#08090d');document.documentElement.style.setProperty('--panel','#14151b');showToast('Выбрана чёрная тема')}else if(t==='light'){document.documentElement.style.setProperty('--bg','#e9e5f1');document.documentElement.style.setProperty('--text','#211b2c');document.documentElement.style.setProperty('--panel','#fff');document.body.style.background='#e9e5f1';document.querySelector('.main').style.background='#fff';showToast('Светлая тема — демонстрация')}else{document.documentElement.style.setProperty('--bg','#100e19');document.documentElement.style.setProperty('--text','#f7f4ff');document.body.style.background='';document.querySelector('.main').style.background='';showToast('Выбрана фиолетовая тема')}}

// NeGram 2.0: AI conversation
const AI_ENDPOINT='https://negram-ai.cameraz-09165.workers.dev/';
let aiHistory=[];
function addAILine(text,who){const box=document.getElementById('aiChatLog');const el=document.createElement('div');el.className='ai-line'+(who==='user'?' user':'');el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight}
async function sendAI(){
 const input=document.getElementById('aiInput'),btn=document.getElementById('aiSendBtn'),status=document.getElementById('aiStatus');
 const value=input.value.trim();if(!value){showToast('Напиши сообщение для NE AI');return}
 aiHistory.push({role:'user',content:value});addAILine(value,'user');input.value='';btn.disabled=true;status.textContent='NE AI думает…';
 try{
  const response=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:aiHistory.slice(-12)})});
  const data=await response.json();
  if(!response.ok||!data.reply)throw new Error(data.error||('HTTP '+response.status));
  aiHistory.push({role:'assistant',content:data.reply});addAILine(data.reply,'assistant');status.textContent='NE AI на связи';
 }catch(err){status.textContent='Не удалось получить ответ. Проверь Worker и соединение.';addAILine('Не получилось связаться с NE AI. Проверь подключение к интернету и настройки Worker.','assistant');}
 finally{btn.disabled=false}
}
function clearAIChat(){aiHistory=[];document.getElementById('aiChatLog').innerHTML='';addAILine('Диалог очищен. Чем могу помочь?','assistant');document.getElementById('aiStatus').textContent='Диалог очищен'}

// NeGram 2.0: circular video recording (local preview; no remote upload)
let cameraStream=null,mediaRecorder=null,circleChunks=[],circleBlobUrl=null;
async function startCamera(){
 const status=document.getElementById('cameraStatus');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Камера недоступна в этом браузере');
  cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});
  const video=document.getElementById('cameraPreview');video.srcObject=cameraStream;video.style.display='block';document.getElementById('cameraPlaceholder').style.display='none';
  document.getElementById('recordStart').disabled=false;status.textContent='Камера включена. Можно записывать кружок.';
 }catch(e){status.textContent='Не удалось открыть камеру. Проверь разрешение Safari на использование камеры и микрофона.'}
}
function startCircleRecording(){
 if(!cameraStream)return;
 if(!window.MediaRecorder){document.getElementById('cameraStatus').textContent='Этот браузер не поддерживает запись видео.';return}
 try{
  let mime='';for(const m of ['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp8,opus','video/webm']){if(MediaRecorder.isTypeSupported(m)){mime=m;break}}
  mediaRecorder=new MediaRecorder(cameraStream,mime?{mimeType:mime}:undefined);circleChunks=[];
  mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)circleChunks.push(e.data)};
  mediaRecorder.onstop=()=>{
   const blob=new Blob(circleChunks,{type:mediaRecorder.mimeType||'video/webm'});
   if(circleBlobUrl)URL.revokeObjectURL(circleBlobUrl);circleBlobUrl=URL.createObjectURL(blob);
   const holder=document.getElementById('circleResult');holder.innerHTML='';
   const v=document.createElement('video');v.src=circleBlobUrl;v.controls=true;v.playsInline=true;v.className='circle-video';holder.appendChild(v);
   document.getElementById('sendCircleBtn').disabled=false;document.getElementById('cameraStatus').textContent='Кружок записан. Его можно посмотреть и добавить в локальный чат.';
  };
  mediaRecorder.start();document.getElementById('recordStart').disabled=true;document.getElementById('recordStop').disabled=false;document.getElementById('cameraStatus').innerHTML='<span class="record-dot"></span>Идёт запись…';
 }catch(e){document.getElementById('cameraStatus').textContent='Не удалось начать запись на этом устройстве.'}
}
function stopCircleRecording(){if(mediaRecorder&&mediaRecorder.state!=='inactive'){mediaRecorder.stop()}document.getElementById('recordStart').disabled=false;document.getElementById('recordStop').disabled=true}
function sendCircleToChat(){if(!circleBlobUrl)return;appendChatMessage(circleBlobUrl,'video');go('chats');showToast('Кружок добавлен в локальный чат. Онлайн-отправка ещё не подключена.')}
window.addEventListener('pagehide',()=>{if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop())});

// Animated faces
const faceItems=[['😂','Смеюсь'],['🥰','Умиление'],['😎','Круто'],['😭','Очень грустно'],['🤩','В восторге'],['😡','Злюсь'],['🥺','Ну пожааалуйста'],['🤯','Вау'],['😴','Сплю'],['🤔','Думаю'],['😜','Дразнюсь'],['🤗','Обнимаю']];
const faceGrid=document.getElementById('facesGrid');
faceItems.forEach(([emoji,label])=>{const b=document.createElement('button');b.className='face-choice';b.innerHTML='<span class="face">'+emoji+'</span><small>'+label+'</small>';b.addEventListener('click',()=>{appendChatMessage(emoji,'face');go('chats');showToast('Анимированная реакция добавлена')});faceGrid.appendChild(b)});

// Restore locally stored text messages after reload.
try{const saved=JSON.parse(localStorage.getItem('ng_local_messages')||'[]');saved.forEach(m=>{if(m&&typeof m.text==='string')appendChatMessage(m.text)})}catch(e){}

