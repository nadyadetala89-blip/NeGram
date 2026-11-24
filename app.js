(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  // Local-only prototype authentication. Passwords are PBKDF2 hashes, never stored as plain text.
  const accountStoreKey='negram-local-accounts-v1';
  const sessionStoreKey='negram-local-session-v1';
  document.body.classList.add('logged-out');
  const authScreen=$('#auth-screen');
  const loginForm=$('#login-form'), registerForm=$('#register-form');
  const authError=$('#auth-error');
  let currentAccount=null;
  function readAccounts(){try{return JSON.parse(localStorage.getItem(accountStoreKey)||'[]')}catch{return []}}
  function writeAccounts(accounts){localStorage.setItem(accountStoreKey,JSON.stringify(accounts))}
  function bytesToHex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  async function passwordHash(password,saltHex){
    if(!crypto?.subtle) throw new Error('Для регистрации открой NEGRAM через HTTPS в Safari.');
    const salt=saltHex?new Uint8Array(saltHex.match(/.{2}/g).map(x=>parseInt(x,16))):crypto.getRandomValues(new Uint8Array(16));
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},material,256);
    return {salt:bytesToHex(salt),hash:bytesToHex(bits)};
  }
  function showAuthMode(mode){
    const registering=mode==='register';loginForm.hidden=registering;registerForm.hidden=!registering;
    $('#auth-title').textContent=registering?'Создай свой аккаунт':'С возвращением';
    $('#auth-subtitle').textContent=registering?'Твоё имя и профиль будут сохранены на этом iPhone.':'Войди в свой аккаунт NEGRAM.';
    $('#auth-switch-text').innerHTML=registering?'Уже есть аккаунт? <button type="button" id="show-login">Войти</button>':'Впервые в NEGRAM? <button type="button" id="show-register">Создать аккаунт</button>';
    $('#show-register')?.addEventListener('click',()=>showAuthMode('register'));
    $('#show-login')?.addEventListener('click',()=>showAuthMode('login'));
    authError.textContent='';
  }
  function updateAccountUI(account){
    currentAccount=account;
    const displayName=account?.name||'Пользователь';
    const username='@'+(account?.username||'the_ugly_smile');
    const initial=(displayName.trim()[0]||'N').toUpperCase();
    const nameNode=$('#profile-display-name'), userNode=$('#profile-username'), avatar=$('#profile-avatar');
    if(nameNode)nameNode.textContent=displayName;
    if(userNode)userNode.textContent=username;
    if(avatar){avatar.textContent=initial;const glint=document.createElement('span');glint.className='avatar-glint';avatar.appendChild(glint)}
    const mini=$('.avatar-mini');if(mini)mini.textContent=initial;
    const badge=$('.profile-badge');if(badge)badge.textContent=account?.username==='the_ugly_smile'?'✦ OWNER':'NEGRAM MEMBER';
  }
  const profileAssetsKey='negram-profile-assets-v1';
  function loadProfileAssets(){try{return JSON.parse(localStorage.getItem(profileAssetsKey)||'{}')}catch{return {}}}
  function applyProfileAssets(){const assets=loadProfileAssets();const avatar=$('#profile-avatar'),cover=$('#profile-cover');if(assets.avatar&&avatar){avatar.textContent='';const img=document.createElement('img');img.src=assets.avatar;img.alt='Фото профиля';avatar.appendChild(img)}if(assets.cover&&cover){cover.style.backgroundImage=`linear-gradient(90deg,rgba(12,9,29,.25),rgba(12,9,29,.42)),url("${assets.cover}")`;cover.style.backgroundSize='cover';cover.style.backgroundPosition='center'}}
  function saveProfileAsset(kind,file){if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{const assets=loadProfileAssets();assets[kind]=reader.result;try{localStorage.setItem(profileAssetsKey,JSON.stringify(assets));applyProfileAssets();toast(kind==='avatar'?'Фото профиля обновлено':'Обложка профиля обновлена')}catch{toast('Файл слишком большой. Выбери фото поменьше.')}};reader.readAsDataURL(file)}
  $('#change-avatar')?.addEventListener('click',()=>$('#avatar-file').click());
  $('#change-cover')?.addEventListener('click',()=>$('#cover-file').click());
  $('#avatar-file')?.addEventListener('change',e=>{saveProfileAsset('avatar',e.target.files?.[0]);e.target.value=''});
  $('#cover-file')?.addEventListener('change',e=>{saveProfileAsset('cover',e.target.files?.[0]);e.target.value=''});
  applyProfileAssets();

  function enterApp(account){
    currentAccount=account;localStorage.setItem(sessionStoreKey,account.username);
    updateAccountUI(account);document.body.classList.remove('logged-out');
    authError.textContent='';showAuthMode('login');
  }
  $('#show-register')?.addEventListener('click',()=>showAuthMode('register'));
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();authError.textContent='';
    const username=$('#login-username').value.trim().toLowerCase();const password=$('#login-password').value;
    const account=readAccounts().find(a=>a.username===username);
    if(!account){authError.textContent='Аккаунт не найден. Проверь имя или создай аккаунт.';return}
    try{const result=await passwordHash(password,account.salt);if(result.hash!==account.hash){authError.textContent='Неверный пароль. Попробуй ещё раз.';return}enterApp(account)}catch(err){authError.textContent=err.message||'Не удалось выполнить вход.'}
  });
  registerForm.addEventListener('submit',async e=>{
    e.preventDefault();authError.textContent='';
    const name=$('#register-name').value.trim();const username=$('#register-username').value.trim().toLowerCase();const password=$('#register-password').value;
    if(!/^[a-z0-9_]{3,24}$/.test(username)){authError.textContent='Имя пользователя: 3–24 символа, латиница, цифры или _. ';return}
    if(password.length<8){authError.textContent='Пароль должен содержать минимум 8 символов.';return}
    const accounts=readAccounts();if(accounts.some(a=>a.username===username)){authError.textContent='Это имя пользователя уже занято на этом устройстве.';return}
    try{const secured=await passwordHash(password);const account={name,username,salt:secured.salt,hash:secured.hash,createdAt:Date.now()};accounts.push(account);writeAccounts(accounts);enterApp(account);toast('Аккаунт создан на этом iPhone')}catch(err){authError.textContent=err.message||'Не удалось создать аккаунт.'}
  });
  $('#switch-account')?.addEventListener('click',()=>{localStorage.removeItem(sessionStoreKey);currentAccount=null;document.body.classList.add('logged-out');$('#login-password').value='';$('#login-username').value='';showAuthMode('login')});
  try{const savedUsername=localStorage.getItem(sessionStoreKey);const savedAccount=readAccounts().find(a=>a.username===savedUsername);if(savedAccount){updateAccountUI(savedAccount);document.body.classList.remove('logged-out')}else{localStorage.removeItem(sessionStoreKey)}}catch{}
  const pages = ['chats','chat','profile','stickers','bubbles','themes','premium','settings','circles','faces','ai'];
  const toastEl = $('#toast'); let toastTimer;
  function toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2300)}
  function go(page){if(!pages.includes(page))return;pages.forEach(p=>$('#page-'+p)?.classList.toggle('active',p===page));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.classList.contains('nav-item')&&b.dataset.page===page));if(page==='chat')setTimeout(()=>$('#message-input').focus({preventScroll:true}),180);window.scrollTo({top:0,behavior:'smooth'})}
  $$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
  $('#open-demo-chat').addEventListener('click',()=>go('chat'));$('#empty-open').addEventListener('click',()=>go('chat'));$('#new-chat').addEventListener('click',()=>{go('chat');toast('Открыт твой тестовый диалог')});

  const storageKey='negram-demo-messages-v1';let messages=[];try{messages=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{}
  const area=$('#messages-area');messages=messages.map((m,i)=>({...m,id:m.id||('legacy-'+i)}));
  function persistMessages(){try{localStorage.setItem(storageKey,JSON.stringify(messages.filter(x=>x.type!=='media'&&x.type!=='voice')))}catch{}}
  function render(){area.querySelectorAll('.message').forEach(n=>n.remove());const welcome=$('.welcome-message');if(messages.length&&welcome)welcome.style.display='none';else if(welcome)welcome.style.display='block';messages.forEach(m=>addMessageNode(m,false));if(messages.length){const last=messages[messages.length-1];$('#last-preview').textContent=last.type==='sticker'?'Стикер: '+(stickerNames[last.stickerId]||'NEGRAM'):last.type==='media'?(last.mediaType.startsWith('video/')?'Видео':'Фото'):last.type==='voice'?'Голосовое сообщение':last.text;$('#last-time').textContent=last.time}area.scrollTop=area.scrollHeight}
  const stickerMarkup={
    pulse:'<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="gp"><stop stop-color="#f4eaff"/><stop offset=".4" stop-color="#bd9aff"/><stop offset="1" stop-color="#6245d7"/></radialGradient></defs><circle cx="60" cy="61" r="43" fill="url(#gp)"/><path d="M28 48Q38 17 72 22" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="5" stroke-linecap="round"/><ellipse cx="46" cy="58" rx="5" ry="7" fill="#211743"/><ellipse cx="74" cy="58" rx="5" ry="7" fill="#211743"/><path d="M47 76Q60 88 74 75" fill="none" stroke="#34205e" stroke-width="4" stroke-linecap="round"/></svg>',
    wisp:'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 18C38 18 27 37 29 62l-4 28q10-8 18 0 9-11 18 0 9-11 18 0 8-8 16 0l-4-28C93 37 82 18 60 18Z" fill="#c9c2ff" stroke="#fff" stroke-width="2"/><ellipse cx="48" cy="58" rx="4" ry="7" fill="#35305d"/><ellipse cx="71" cy="58" rx="4" ry="7" fill="#35305d"/><path d="M51 72q9 8 18 0" fill="none" stroke="#625a9b" stroke-width="3" stroke-linecap="round"/></svg>',
    prism:'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 12 98 42 84 91 36 98 17 51Z" fill="#9c8be9" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><path d="m60 12 2 77M17 51l45 38 36-47M36 98l26-9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><circle cx="48" cy="57" r="3.5" fill="#28214b"/><circle cx="71" cy="57" r="3.5" fill="#28214b"/><path d="M52 71q8 7 16 0" fill="none" stroke="#3a2c70" stroke-width="3" stroke-linecap="round"/></svg>',
    orbit:'<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="62" rx="51" ry="19" transform="rotate(-27 60 62)" fill="none" stroke="#c4eaff" stroke-width="5"/><circle cx="60" cy="60" r="31" fill="#477fe0"/><ellipse cx="49" cy="58" rx="5" ry="7" fill="#102653"/><ellipse cx="70" cy="58" rx="5" ry="7" fill="#102653"/><path d="M49 73q11 9 22 0" fill="none" stroke="#102653" stroke-width="3.5" stroke-linecap="round"/></svg>',
    heart:'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 98S15 69 19 42C23 17 51 18 60 39 72 15 100 21 102 44c2 25-42 54-42 54Z" fill="#e98bc9" stroke="#ffe9f8" stroke-width="2"/><ellipse cx="47" cy="54" rx="4" ry="6" fill="#58224f"/><ellipse cx="72" cy="54" rx="4" ry="6" fill="#58224f"/><path d="M51 68q9 8 18 0" fill="none" stroke="#7b2c69" stroke-width="3" stroke-linecap="round"/></svg>',
    alien:'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 15C34 15 23 36 29 70c4 23 18 35 31 35s28-13 32-35C98 36 86 15 60 15Z" fill="#76d9b5" stroke="#d9fff0" stroke-width="2"/><ellipse cx="45" cy="58" rx="9" ry="13" transform="rotate(18 45 58)" fill="#183b4a"/><ellipse cx="75" cy="58" rx="9" ry="13" transform="rotate(-18 75 58)" fill="#183b4a"/><path d="M52 82q8 5 16 0" fill="none" stroke="#236b72" stroke-width="3" stroke-linecap="round"/></svg>',
    moon:'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M84 19C54 26 43 59 58 82c9 14 25 20 42 15C85 117 46 111 29 83 8 49 35 10 70 13c5 0 10 2 14 6Z" fill="#d6baff"/><circle cx="60" cy="58" r="3" fill="#534477"/><circle cx="75" cy="58" r="3" fill="#534477"/><path d="M62 70q7 5 13 0" fill="none" stroke="#6d5a91" stroke-width="3" stroke-linecap="round"/></svg>',
    spark:'<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 8 72 43 108 31 84 60 108 88 72 77 60 112 48 77 12 88 36 60 12 31 48 43Z" fill="#ffc66f" stroke="#fff0d6" stroke-width="2"/><circle cx="49" cy="57" r="3.5" fill="#70416c"/><circle cx="71" cy="57" r="3.5" fill="#70416c"/><path d="M51 70q9 8 18 0" fill="none" stroke="#8c4c69" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  const stickerNames={pulse:'Пульс',wisp:'Висп',prism:'Призма',orbit:'Орбит',heart:'Люми',alien:'Зип',moon:'Луна',spark:'Искра',fox:'Фокс',cat:'Нокс',dragon:'Драко',robot:'Бип',capy:'Капи',frog:'Квак',penguin:'Пин',rocket:'Рокет',planet:'Сатурн',mushroom:'Шрум',lightning:'Заряд',trophy:'Топ'};
  const extraStickerGlyphs={fox:'🦊',cat:'🐈‍⬛',dragon:'🐉',robot:'🤖',capy:'🦫',frog:'🐸',penguin:'🐧',rocket:'🚀',planet:'🪐',mushroom:'🍄',lightning:'⚡',trophy:'🏆'};
  Object.entries(extraStickerGlyphs).forEach(([id,glyph])=>{stickerMarkup[id]=`<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="grad-${id}"><stop stop-color="#f5eaff"/><stop offset=".5" stop-color="#a98cff"/><stop offset="1" stop-color="#436bd1"/></radialGradient></defs><circle cx="60" cy="60" r="49" fill="url(#grad-${id})" opacity=".18"/><text x="60" y="79" text-anchor="middle" font-size="76">${glyph}</text><path d="M18 29l5-8m74 9 5-8" stroke="#e6d8ff" stroke-width="3" stroke-linecap="round"/></svg>`});
  function addMessageNode(m,scroll=true){const node=document.createElement('div');node.className='message outgoing'+(m.type==='sticker'?' sticker-message':'')+(m.type==='media'?' media-message':'')+(m.type==='voice'?' voice-message':'')+(m.type==='customSticker'?' custom-sticker':'');node.dataset.messageId=m.id||'';if(m.type==='sticker'&&stickerMarkup[m.stickerId]){const art=document.createElement('div');art.className='sent-sticker sent-'+m.stickerId;art.innerHTML=stickerMarkup[m.stickerId];node.appendChild(art)}else if(m.type==='customSticker'&&m.image){const wrap=document.createElement('div');wrap.className='custom-sticker-message';const img=document.createElement('img');img.src=m.image;wrap.appendChild(img);if(m.caption){const cap=document.createElement('strong');cap.textContent=m.caption;wrap.appendChild(cap)}node.appendChild(wrap)}else if(m.type==='media'&&m.url){if(m.mediaType.startsWith('video/')){const video=document.createElement('video');video.src=m.url;video.controls=true;video.playsInline=true;node.appendChild(video)}else{const img=document.createElement('img');img.src=m.url;img.alt='Фото';node.appendChild(img)}}else if(m.type==='voice'&&m.url){const audio=document.createElement('audio');audio.controls=true;audio.src=m.url;if(m.voicePreset==='autotune')audio.playbackRate=1.07;if(m.voicePreset==='deep')audio.playbackRate=.92;if(m.voicePreset==='robot')audio.playbackRate=1.12;node.appendChild(audio);const note=document.createElement('small');note.textContent=m.voicePreset==='autotune'?'✨ AutoTune Pop':m.voicePreset==='deep'?'Deep voice':m.voicePreset==='robot'?'Robot voice':'Оригинальный голос';node.appendChild(note)}else{node.appendChild(document.createTextNode(m.text||''))}const time=document.createElement('time');time.textContent=m.time;node.appendChild(time);const del=document.createElement('button');del.type='button';del.className='message-delete';del.textContent='×';del.setAttribute('aria-label','Удалить сообщение');del.addEventListener('click',()=>deleteMessage(m.id));node.appendChild(del);area.appendChild(node);if(scroll)area.scrollTop=area.scrollHeight}
  function deleteMessage(id){if(!id)return;messages=messages.filter(m=>m.id!==id);persistMessages();const node=area.querySelector(`[data-message-id=\"${CSS.escape(id)}\"]`);node?.remove();if(!messages.length){const welcome=$('.welcome-message');if(welcome)welcome.style.display='block'}const last=messages[messages.length-1];$('#last-preview').textContent=last?(last.text|| (last.type==='sticker'?'Стикер: '+(stickerNames[last.stickerId]||'NEGRAM'):last.type==='customSticker'?'Свой стикер':'Вложение')):'Здесь появятся твои сообщения';toast('Сообщение удалено на этом устройстве')}
  function sendSticker(id){if(!stickerMarkup[id])return;const m={id:'m-'+Date.now()+'-'+Math.random().toString(16).slice(2),type:'sticker',stickerId:id,text:'Стикер: '+stickerNames[id],time:clock()};messages.push(m);persistMessages();const welcome=$('.welcome-message');if(welcome)welcome.style.display='none';addMessageNode(m);$('#last-preview').textContent='Стикер: '+stickerNames[id];$('#last-time').textContent='сейчас';go('chat');toast('Стикер отправлен в тестовый чат')}
  $('#sticker-collection').addEventListener('click',e=>{const b=e.target.closest('[data-sticker]');if(b)sendSticker(b.dataset.sticker)});
  function clock(){return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date())}
  function persistAndShow(m){m.id=m.id||('m-'+Date.now()+'-'+Math.random().toString(16).slice(2));messages.push(m);persistMessages();const welcome=$('.welcome-message');if(welcome)welcome.style.display='none';addMessageNode(m);$('#last-preview').textContent=m.type==='sticker'?'Стикер: '+(stickerNames[m.stickerId]||'NEGRAM'):m.type==='media'?(m.mediaType.startsWith('video/')?'Видео':'Фото'):m.type==='voice'?'Голосовое сообщение':m.text;$('#last-time').textContent='сейчас'}
  $('#message-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#message-input');const text=input.value.trim();if(!text)return;persistAndShow({text,time:clock()});input.value=''});
  $('#attach-button').addEventListener('click',()=>$('#media-input').click());
  $('#media-input').addEventListener('change',e=>{[...e.target.files].forEach(file=>{if(!file.type.startsWith('image/')&&!file.type.startsWith('video/'))return;const url=URL.createObjectURL(file);persistAndShow({type:'media',url,mediaType:file.type,text:file.name,time:clock()})});e.target.value=''});
  const tray=$('#inline-sticker-tray');$('#sticker-toggle').addEventListener('click',()=>{tray.hidden=!tray.hidden;if(!tray.hidden){const list=$('#inline-sticker-list');list.innerHTML='';Object.entries(extraStickerGlyphs).concat([['pulse','🟣'],['wisp','👻'],['prism','💎'],['orbit','🪐'],['heart','💗'],['alien','👽'],['moon','🌙'],['spark','⭐']]).forEach(([id,g])=>{const b=document.createElement('button');b.type='button';b.className='inline-sticker';b.textContent=g;b.title=stickerNames[id];b.addEventListener('click',()=>{sendSticker(id);tray.hidden=true});list.appendChild(b)});let mine=[];try{mine=JSON.parse(localStorage.getItem('negram-my-stickers')||'[]')}catch{};mine.forEach((sticker,index)=>{const b=document.createElement('button');b.type='button';b.className='inline-sticker inline-custom-sticker';b.title=sticker.caption||'Мой стикер';const img=document.createElement('img');img.src=sticker.image;img.alt=sticker.caption||'Мой стикер';b.appendChild(img);b.addEventListener('click',()=>{persistAndShow({type:'customSticker',image:sticker.image,caption:sticker.caption,time:clock()});tray.hidden=true;go('chat')});list.appendChild(b)})}});
  $('#open-sticker-gallery').addEventListener('click',()=>go('stickers'));
  let activeVoicePreset='autotune';$$('.voice-preset').forEach(b=>b.addEventListener('click',()=>{$$('.voice-preset').forEach(x=>x.classList.toggle('active',x===b));activeVoicePreset=b.dataset.voice}));
  let recorder=null,recordChunks=[],recording=false,recordStream=null;
  $('#voice-button').addEventListener('click',async()=>{const button=$('#voice-button');if(!recording){if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Запись голоса не поддерживается этим браузером');return}try{recordStream=await navigator.mediaDevices.getUserMedia({audio:true});recordChunks=[];recorder=new MediaRecorder(recordStream);recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data)};recorder.onstop=()=>{const blob=new Blob(recordChunks,{type:recorder.mimeType||'audio/mp4'});const url=URL.createObjectURL(blob);persistAndShow({type:'voice',url,voicePreset:activeVoicePreset,time:clock()});recordStream?.getTracks().forEach(t=>t.stop());recordStream=null};recorder.start();recording=true;button.classList.add('recording');button.textContent='■';$('#voice-tools').hidden=false;toast('Запись началась — нажми ■, чтобы отправить')}catch(err){toast('Разреши NEGRAM доступ к микрофону в Safari')}}else{recording=false;button.classList.remove('recording');button.textContent='●';recorder?.stop()}});
  $('#chat-options').addEventListener('click',()=>toast('Это локальный тестовый чат'));
  $('#search-input').addEventListener('input',e=>{const match='тестовый чат'.includes(e.target.value.trim().toLowerCase());$('#open-demo-chat').style.display=match?'flex':'none';$('.empty-space').style.display=e.target.value.trim()?'none':'block'});

  // Premium sticker maker: local-only demo. User-selected image remains on this device.
  let pendingStickerData='';
  const premiumEnabled=()=>{try{return localStorage.getItem('negram-premium-demo')==='active'}catch{return false}};
  $('#studio-add').addEventListener('click',()=>{if(!premiumEnabled()){toast('Создание личных стикеров доступно в Premium');go('premium');return}$('#sticker-photo-input').click()});
  $('#sticker-photo-input').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{pendingStickerData=reader.result;$('#sticker-source-preview').src=pendingStickerData;$('#sticker-editor').hidden=false};reader.readAsDataURL(file);e.target.value=''});
  $('#sticker-cancel').addEventListener('click',()=>{$('#sticker-editor').hidden=true;pendingStickerData=''});
  function renderMyStickers(){let list=[];try{list=JSON.parse(localStorage.getItem('negram-my-stickers')||'[]')}catch{};const host=$('#my-stickers');host.innerHTML='';if(!list.length){host.innerHTML='<span class="my-stickers-empty">Твои стикеры появятся здесь</span>';return}list.forEach((s,i)=>{const b=document.createElement('button');b.className='my-sticker';b.type='button';const img=document.createElement('img');img.src=s.image;b.appendChild(img);if(s.caption){const cap=document.createElement('strong');cap.textContent=s.caption;b.appendChild(cap)}b.addEventListener('click',()=>{persistAndShow({type:'customSticker',image:s.image,caption:s.caption,time:clock()});go('chat')});host.appendChild(b)})}
  $('#sticker-save').addEventListener('click',()=>{if(!pendingStickerData)return;let list=[];try{list=JSON.parse(localStorage.getItem('negram-my-stickers')||'[]')}catch{};const item={image:pendingStickerData,caption:$('#sticker-caption').value.trim()};try{localStorage.setItem('negram-my-stickers',JSON.stringify([...list,item].slice(-30)));toast('Твой стикер сохранён')}catch{toast('Фото слишком большое — выбери изображение поменьше')}$('#sticker-editor').hidden=true;$('#sticker-caption').value='';pendingStickerData='';renderMyStickers()});
  renderMyStickers();

  const bubbleNames=['glass','violet','blue','dark','holo','chrome','neon','rose','mint','sunset','carbon','crystal'];
  function setBubble(style,notify=false){if(!bubbleNames.includes(style))style='glass';document.body.dataset.bubble=style;$$('.bubble-option').forEach(b=>b.classList.toggle('selected',b.dataset.style===style));try{localStorage.setItem('negram-bubble-style',style)}catch{};if(notify)toast('Пузырь изменён: '+($('.bubble-option[data-style="'+style+'"] strong')?.textContent||style))}
  $$('.bubble-option').forEach(b=>b.addEventListener('click',()=>setBubble(b.dataset.style,true)));
  try{setBubble(localStorage.getItem('negram-bubble-style')||'glass')}catch{setBubble('glass')}

  const themeNames=['nebula','deep','aurora','platinum','rose'];
  function setTheme(theme,notify=false){if(!themeNames.includes(theme))theme='nebula';document.body.dataset.theme=theme;$$('.theme-option').forEach(b=>b.classList.toggle('selected',b.dataset.theme===theme));try{localStorage.setItem('negram-theme',theme)}catch{};if(notify)toast('Тема оформления применена')}
  $$('.theme-option').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme,true)));
  try{setTheme(localStorage.getItem('negram-theme')||'nebula')}catch{setTheme('nebula')}

  // Glass Edition chat wallpapers: preset covers and an optional user image.
  const wallpaperNames=['nebula','aurora','crystal','night'];
  function setWallpaper(name,notify=false){
    if(!wallpaperNames.includes(name) && name!=='custom') name='nebula';
    document.body.dataset.wallpaper=name;
    $$('.wallpaper-option').forEach(b=>b.classList.toggle('selected',b.dataset.wallpaper===name));
    try{localStorage.setItem('negram-wallpaper',name)}catch{}
    if(notify)toast('Обложка чата изменена');
  }
  function loadWallpaper(){try{const name=localStorage.getItem('negram-wallpaper')||'nebula';setWallpaper(name);const image=localStorage.getItem('negram-wallpaper-image');if(image){document.body.style.setProperty('--custom-wallpaper',`url("${image}")`);document.body.dataset.wallpaper='custom';}}catch{setWallpaper('nebula')}}
  $$('.wallpaper-option').forEach(b=>b.addEventListener('click',()=>{document.body.style.removeProperty('--custom-wallpaper');try{localStorage.removeItem('negram-wallpaper-image')}catch{};setWallpaper(b.dataset.wallpaper,true)}));
  $('#wallpaper-upload')?.addEventListener('click',()=>$('#wallpaper-file').click());
  $('#wallpaper-file')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{try{localStorage.setItem('negram-wallpaper-image',reader.result);document.body.style.setProperty('--custom-wallpaper',`url("${reader.result}")`);setWallpaper('custom',true);document.body.dataset.wallpaper='custom'}catch{toast('Изображение слишком большое — выбери файл поменьше')}};reader.readAsDataURL(file);e.target.value=''});
  $('#wallpaper-reset')?.addEventListener('click',()=>{document.body.style.removeProperty('--custom-wallpaper');try{localStorage.removeItem('negram-wallpaper-image')}catch{};setWallpaper('nebula',true)});
  loadWallpaper();

  $('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('glow-off');$('#glow-toggle').classList.toggle('on');try{localStorage.setItem('negram-glow',document.body.classList.contains('glow-off')?'off':'on')}catch{}});
  try{if(localStorage.getItem('negram-glow')==='off'){document.body.classList.add('glow-off');$('#glow-toggle').classList.remove('on')}}catch{}
  $('#install-help').addEventListener('click',()=>toast('В Safari нажми «Поделиться» → «На экран Домой»'));
  $('#about-button').addEventListener('click',()=>toast('NEGRAM 2.0 · интерфейс 0.7 + новые функции'));

  const premiumKey='negram-premium-demo';
  function updatePremium(){const active=localStorage.getItem(premiumKey)==='active';const label=$('#premium-status');if(label)label.textContent=active?'ДЕМО PREMIUM АКТИВЕН':'PREMIUM НЕ ПОДКЛЮЧЁН';const btn=$('#premium-demo-toggle');if(btn)btn.textContent=active?'Отключить демо Premium':'Включить демо Premium';}
  $('#premium-demo-toggle')?.addEventListener('click',()=>{const active=localStorage.getItem(premiumKey)==='active';try{localStorage.setItem(premiumKey,active?'off':'active')}catch{};updatePremium();toast(active?'Демо Premium отключён':'Демо Premium включён — оплаты не было')});
  updatePremium();
  $('#activate-premium-code')?.addEventListener('click',()=>{const code=$('#premium-code-input').value.trim().toUpperCase();const result=$('#premium-code-result');if(code==='NEGRAM-TEST-2026'||code==='NEGRAM-PREMIUM-TEST'){try{localStorage.setItem(premiumKey,'active')}catch{};updatePremium();result.textContent='Демо Premium активирован. Оплата не производилась.';result.className='code-success';toast('Демо Premium активирован')}else if(code==='NEGRAM-OWNER-TEST'){if(currentAccount?.username==='the_ugly_smile'){try{localStorage.setItem(premiumKey,'active')}catch{};updatePremium();result.textContent='Демо Owner Premium активирован.';result.className='code-success'}else{result.textContent='Этот тестовый код предназначен для аккаунта владельца.';result.className='code-error'}}else{result.textContent='Код не распознан. Проверь написание.';result.className='code-error'}});

  // NEGRAM 2.0 — features added without replacing the original 0.7 interface.
  const faceChoices=[['😂','Смеюсь'],['🥰','Умиление'],['😎','Круто'],['😭','Грустно'],['🤩','В восторге'],['😡','Злюсь'],['🥺','Пожалуйста'],['🤯','Вау'],['😴','Сплю'],['🤔','Думаю'],['😜','Дразнюсь'],['🤗','Обнимаю']];
  const faceHost=$('#v2-faces-grid');
  faceChoices.forEach(([emoji,label])=>{const b=document.createElement('button');b.type='button';b.className='v2-face';b.innerHTML='<span>'+emoji+'</span><small>'+label+'</small>';b.addEventListener('click',()=>{persistAndShow({text:emoji+' '+label,time:clock()});go('chat');toast('Реакция добавлена в чат')});faceHost.appendChild(b)});

  const AI_ENDPOINT='https://negram-ai.cameraz-09165.workers.dev/';
  let v2AiHistory=[];
  function addV2AiLine(text,who='assistant'){const line=document.createElement('div');line.className='v2-ai-line'+(who==='user'?' user':'');line.textContent=text;$('#v2-ai-log').appendChild(line);$('#v2-ai-log').scrollTop=$('#v2-ai-log').scrollHeight}
  $('#v2-ai-form').addEventListener('submit',async e=>{
    e.preventDefault();const input=$('#v2-ai-input'),button=$('#v2-ai-send'),status=$('#v2-ai-status');const value=input.value.trim();if(!value)return;
    v2AiHistory.push({role:'user',content:value});addV2AiLine(value,'user');input.value='';button.disabled=true;status.textContent='NE AI думает…';
    try{const response=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:v2AiHistory.slice(-12)})});const data=await response.json();if(!response.ok||!data.reply)throw new Error(data.error||('HTTP '+response.status));v2AiHistory.push({role:'assistant',content:data.reply});addV2AiLine(data.reply);status.textContent='NE AI на связи'}
    catch(err){status.textContent='Не удалось получить ответ. Проверь сервер и интернет.';addV2AiLine('Сейчас не получилось связаться с NE AI. Попробуй позже.')}finally{button.disabled=false}
  });

  let v2CameraStream=null,v2Recorder=null,v2Chunks=[],v2CircleUrl=null;
  $('#v2-camera-start').addEventListener('click',async()=>{const status=$('#v2-camera-status');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Камера недоступна');v2CameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});const video=$('#v2-camera-preview');video.srcObject=v2CameraStream;video.style.display='block';$('#v2-camera-placeholder').style.display='none';$('#v2-record-start').disabled=false;status.textContent='Камера включена. Можно записывать.'}catch(err){status.textContent='Не удалось открыть камеру. Проверь разрешения Safari.'}});
  $('#v2-record-start').addEventListener('click',()=>{if(!v2CameraStream)return;if(!window.MediaRecorder){$('#v2-camera-status').textContent='Запись видео не поддерживается этим браузером.';return}try{let mime='';for(const type of ['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp8,opus','video/webm'])if(MediaRecorder.isTypeSupported(type)){mime=type;break}v2Chunks=[];v2Recorder=new MediaRecorder(v2CameraStream,mime?{mimeType:mime}:undefined);v2Recorder.ondataavailable=e=>{if(e.data?.size)v2Chunks.push(e.data)};v2Recorder.onstop=()=>{const blob=new Blob(v2Chunks,{type:v2Recorder.mimeType||'video/webm'});if(v2CircleUrl)URL.revokeObjectURL(v2CircleUrl);v2CircleUrl=URL.createObjectURL(blob);const host=$('#v2-circle-result');host.innerHTML='';const video=document.createElement('video');video.src=v2CircleUrl;video.controls=true;video.playsInline=true;host.appendChild(video);$('#v2-send-circle').disabled=false;$('#v2-camera-status').textContent='Кружок записан. Его можно посмотреть и добавить в чат.'};v2Recorder.start();$('#v2-record-start').disabled=true;$('#v2-record-stop').disabled=false;$('#v2-camera-status').textContent='Идёт запись…'}catch(err){$('#v2-camera-status').textContent='Не удалось начать запись.'}});
  $('#v2-record-stop').addEventListener('click',()=>{if(v2Recorder&&v2Recorder.state!=='inactive')v2Recorder.stop();$('#v2-record-start').disabled=false;$('#v2-record-stop').disabled=true});
  $('#v2-send-circle').addEventListener('click',()=>{if(!v2CircleUrl)return;persistAndShow({type:'media',url:v2CircleUrl,mediaType:'video/webm',text:'Видеокружок',time:clock()});go('chat');toast('Кружок добавлен в локальный чат')});
  window.addEventListener('pagehide',()=>{v2CameraStream?.getTracks().forEach(track=>track.stop())});

  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
