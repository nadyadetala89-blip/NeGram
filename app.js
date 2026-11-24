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
  function render(){area.querySelectorAll('.message').forEach(n=>n.remove());const welcome=$('.welcome-message');if(messages.length&&welcome)welcome.style.display='none';else if(welcome)welcome.style.display='block';messages.forEach(m=>addMessageNode(m,false));if(messages.length){const last=messages[messages.length-1];$('#last-preview').textContent=last.text;$('#last-time').textContent=last.time}area.scrollTop=area.scrollHeight}
  function addMessageNode(m,scroll=true){const node=document.createElement('div');node.className='message outgoing';node.textContent=m.text;const time=document.createElement('time');time.textContent=m.time;node.appendChild(time);area.appendChild(node);if(scroll)area.scrollTop=area.scrollHeight}
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
  $('#about-button').addEventListener('click',()=>toast('NEGRAM · версия 0.2 · тестовая сборка'));

  const premiumKey='negram-premium-demo';
  function updatePremium(){const active=localStorage.getItem(premiumKey)==='active';const label=$('#premium-status');if(label)label.textContent=active?'ДЕМО PREMIUM АКТИВЕН':'PREMIUM НЕ ПОДКЛЮЧЁН';const btn=$('#premium-demo-toggle');if(btn)btn.textContent=active?'Отключить демо Premium':'Включить демо Premium';}
  $('#premium-demo-toggle')?.addEventListener('click',()=>{const active=localStorage.getItem(premiumKey)==='active';try{localStorage.setItem(premiumKey,active?'off':'active')}catch{};updatePremium();toast(active?'Демо Premium отключён':'Демо Premium включён — оплаты не было')});
  updatePremium();

  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
