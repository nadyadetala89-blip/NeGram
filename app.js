(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const pages = ['chats','chat','profile','stickers','bubbles','settings'];
  const toastEl = $('#toast'); let toastTimer;
  function toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2200)}
  function go(page){if(!pages.includes(page))return;pages.forEach(p=>$('#page-'+p)?.classList.toggle('active',p===page));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.classList.contains('nav-item')&&b.dataset.page===page));if(page==='chat')setTimeout(()=>$('#message-input').focus({preventScroll:true}),180);window.scrollTo({top:0,behavior:'smooth'})}
  $$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
  $('#open-demo-chat').addEventListener('click',()=>go('chat'));$('#empty-open').addEventListener('click',()=>go('chat'));$('#new-chat').addEventListener('click',()=>{go('chat');toast('Открыт твой тестовый диалог')});
  const storageKey='negram-demo-messages-v1';let messages=[];try{messages=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{}
  const area=$('#messages-area');
  function render(){area.querySelectorAll('.message').forEach(n=>n.remove());const welcome=$('.welcome-message');if(messages.length&&welcome)welcome.style.display='none';else if(welcome)welcome.style.display='block';messages.forEach(m=>addMessageNode(m,false));if(messages.length){const last=messages[messages.length-1];$('#last-preview').textContent=last.text;$('#last-time').textContent=last.time}area.scrollTop=area.scrollHeight}
  function addMessageNode(m,scroll=true){const node=document.createElement('div');node.className='message outgoing';node.textContent=m.text;const time=document.createElement('time');time.textContent=m.time;node.appendChild(time);area.appendChild(node);if(scroll)area.scrollTop=area.scrollHeight}
  function clock(){return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date())}
  $('#message-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#message-input');const text=input.value.trim();if(!text)return;const m={text,time:clock()};messages.push(m);try{localStorage.setItem(storageKey,JSON.stringify(messages))}catch{};const welcome=$('.welcome-message');if(welcome)welcome.style.display='none';addMessageNode(m);$('#last-preview').textContent=text;$('#last-time').textContent='сейчас';input.value='';});
  $('#attach-button').addEventListener('click',()=>toast('Вложения появятся в следующих версиях'));
  $('#chat-options').addEventListener('click',()=>toast('Это локальный тестовый чат'));
  $('#search-input').addEventListener('input',e=>{const match='тестовый чат'.includes(e.target.value.trim().toLowerCase());$('#open-demo-chat').style.display=match?'flex':'none';$('.empty-space').style.display=e.target.value.trim()?'none':'block'});
  const bubbleStyles={glass:'linear-gradient(135deg,rgba(147,116,222,.75),rgba(63,91,174,.78))',violet:'linear-gradient(135deg,#a77be8,#5a3d9e)',blue:'linear-gradient(135deg,#76b4ff,#3558a8)',dark:'linear-gradient(135deg,#47445d,#171727)'};
  $$('.bubble-option').forEach(b=>b.addEventListener('click',()=>{$$('.bubble-option').forEach(x=>x.classList.toggle('selected',x===b));$('#bubble-preview-out').style.background=bubbleStyles[b.dataset.style];try{localStorage.setItem('negram-bubble-style',b.dataset.style)}catch{};toast('Стиль пузырей изменён')}));
  try{const saved=localStorage.getItem('negram-bubble-style');if(saved){const b=$(`[data-style="${saved}"]`);if(b)b.click()}}catch{}
  $('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('glow-off');$('#glow-toggle').classList.toggle('on');try{localStorage.setItem('negram-glow',document.body.classList.contains('glow-off')?'off':'on')}catch{}});
  try{if(localStorage.getItem('negram-glow')==='off'){document.body.classList.add('glow-off');$('#glow-toggle').classList.remove('on')}}catch{}
  $('#install-help').addEventListener('click',()=>toast('В Safari нажми «Поделиться» → «На экран Домой»'));
  $('#about-button').addEventListener('click',()=>toast('NEGRAM · версия 0.1 · тестовая сборка'));
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
