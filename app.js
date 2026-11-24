(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const pages = ['chats','chat','profile','stickers','bubbles','themes','premium','settings'];
  const toastEl = $('#toast'); let toastTimer;
  function toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2300)}
  function go(page){if(!pages.includes(page))return;pages.forEach(p=>$('#page-'+p)?.classList.toggle('active',p===page));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.classList.contains('nav-item')&&b.dataset.page===page));if(page==='chat')setTimeout(()=>$('#message-input').focus({preventScroll:true}),180);window.scrollTo({top:0,behavior:'smooth'})}
  $$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
  $('#open-demo-chat').addEventListener('click',()=>go('chat'));$('#empty-open').addEventListener('click',()=>go('chat'));$('#new-chat').addEventListener('click',()=>{go('chat');toast('Открыт твой тестовый диалог')});

  const storageKey='negram-demo-messages-v1';let messages=[];try{messages=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{}
  const area=$('#messages-area');
  function render(){area.querySelectorAll('.message').forEach(n=>n.remove());const welcome=$('.welcome-message');if(messages.length&&welcome)welcome.style.display='none';else if(welcome)welcome.style.display='block';messages.forEach(m=>addMessageNode(m,false));if(messages.length){const last=messages[messages.length-1];$('#last-preview').textContent=last.type==='sticker'?'Стикер: '+(stickerNames[last.stickerId]||'NEGRAM'):last.text;$('#last-time').textContent=last.time}area.scrollTop=area.scrollHeight}
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
  const stickerNames={pulse:'Пульс',wisp:'Висп',prism:'Призма',orbit:'Орбит',heart:'Люми',alien:'Зип',moon:'Луна',spark:'Искра'};
  function addMessageNode(m,scroll=true){const node=document.createElement('div');node.className='message outgoing'+(m.type==='sticker'?' sticker-message':'');if(m.type==='sticker'&&stickerMarkup[m.stickerId]){const art=document.createElement('div');art.className='sent-sticker sent-'+m.stickerId;art.innerHTML=stickerMarkup[m.stickerId];node.appendChild(art)}else{node.appendChild(document.createTextNode(m.text||''))}const time=document.createElement('time');time.textContent=m.time;node.appendChild(time);area.appendChild(node);if(scroll)area.scrollTop=area.scrollHeight}
  function sendSticker(id){if(!stickerMarkup[id])return;const m={type:'sticker',stickerId:id,text:'Стикер: '+stickerNames[id],time:clock()};messages.push(m);try{localStorage.setItem(storageKey,JSON.stringify(messages))}catch{};const welcome=$('.welcome-message');if(welcome)welcome.style.display='none';addMessageNode(m);$('#last-preview').textContent='Стикер: '+stickerNames[id];$('#last-time').textContent='сейчас';go('chat');toast('Стикер отправлен в тестовый чат')}
  $$('.sticker-card').forEach(b=>b.addEventListener('click',()=>sendSticker(b.dataset.sticker)));
  function clock(){return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date())}
  $('#message-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#message-input');const text=input.value.trim();if(!text)return;const m={text,time:clock()};messages.push(m);try{localStorage.setItem(storageKey,JSON.stringify(messages))}catch{};const welcome=$('.welcome-message');if(welcome)welcome.style.display='none';addMessageNode(m);$('#last-preview').textContent=text;$('#last-time').textContent='сейчас';input.value=''});
  $('#attach-button').addEventListener('click',()=>toast('Вложения появятся в следующих версиях'));
  $('#chat-options').addEventListener('click',()=>toast('Это локальный тестовый чат'));
  $('#search-input').addEventListener('input',e=>{const match='тестовый чат'.includes(e.target.value.trim().toLowerCase());$('#open-demo-chat').style.display=match?'flex':'none';$('.empty-space').style.display=e.target.value.trim()?'none':'block'});

  const bubbleNames=['glass','violet','blue','dark','holo','chrome','neon','rose','mint','sunset','carbon','crystal'];
  function setBubble(style,notify=false){if(!bubbleNames.includes(style))style='glass';document.body.dataset.bubble=style;$$('.bubble-option').forEach(b=>b.classList.toggle('selected',b.dataset.style===style));try{localStorage.setItem('negram-bubble-style',style)}catch{};if(notify)toast('Пузырь изменён: '+($('.bubble-option[data-style="'+style+'"] strong')?.textContent||style))}
  $$('.bubble-option').forEach(b=>b.addEventListener('click',()=>setBubble(b.dataset.style,true)));
  try{setBubble(localStorage.getItem('negram-bubble-style')||'glass')}catch{setBubble('glass')}

  const themeNames=['nebula','deep','aurora','platinum','rose'];
  function setTheme(theme,notify=false){if(!themeNames.includes(theme))theme='nebula';document.body.dataset.theme=theme;$$('.theme-option').forEach(b=>b.classList.toggle('selected',b.dataset.theme===theme));try{localStorage.setItem('negram-theme',theme)}catch{};if(notify)toast('Тема оформления применена')}
  $$('.theme-option').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme,true)));
  try{setTheme(localStorage.getItem('negram-theme')||'nebula')}catch{setTheme('nebula')}

  $('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('glow-off');$('#glow-toggle').classList.toggle('on');try{localStorage.setItem('negram-glow',document.body.classList.contains('glow-off')?'off':'on')}catch{}});
  try{if(localStorage.getItem('negram-glow')==='off'){document.body.classList.add('glow-off');$('#glow-toggle').classList.remove('on')}}catch{}
  $('#install-help').addEventListener('click',()=>toast('В Safari нажми «Поделиться» → «На экран Домой»'));
  $('#about-button').addEventListener('click',()=>toast('NEGRAM · версия 0.3 · анимированные эмоции'));

  const premiumKey='negram-premium-demo';
  function updatePremium(){const active=localStorage.getItem(premiumKey)==='active';const label=$('#premium-status');if(label)label.textContent=active?'ДЕМО PREMIUM АКТИВЕН':'PREMIUM НЕ ПОДКЛЮЧЁН';const btn=$('#premium-demo-toggle');if(btn)btn.textContent=active?'Отключить демо Premium':'Включить демо Premium';}
  $('#premium-demo-toggle')?.addEventListener('click',()=>{const active=localStorage.getItem(premiumKey)==='active';try{localStorage.setItem(premiumKey,active?'off':'active')}catch{};updatePremium();toast(active?'Демо Premium отключён':'Демо Premium включён — оплаты не было')});
  updatePremium();

  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
