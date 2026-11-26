(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const API_BASE = window.NEGRAM_API_BASE || 'https://negram-messages.cameraz-09165.workers.dev';

  const tokenStoreKey = 'negram-server-tokens-v1';
  const activeUserKey = 'negram-active-user-v1';
  const pages = ['chats', 'chat', 'profile', 'stickers', 'bubbles', 'themes', 'premium', 'settings'];

  const toastEl = $('#toast');
  let toastTimer;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  let currentAccount = null;
  let currentToken = '';
  let activeChatId = null;
  let activeChat = null;
  let messages = [];
  let chats = [];
  let pollTimer = null;
  let lastMessageTimestamp = 0;

  const authScreen = $('#auth-screen');
  const loginForm = $('#login-form');
  const registerForm = $('#register-form');
  const authError = $('#auth-error');
  const area = $('#messages-area');
  const chatListHost = $('#network-chat-list');

  document.body.classList.add('logged-out');

  function readTokens() {
    try {
      return JSON.parse(localStorage.getItem(tokenStoreKey) || '{}');
    } catch {
      return {};
    }
  }

  function writeTokens(value) {
    localStorage.setItem(tokenStoreKey, JSON.stringify(value));
  }

  async function api(path, {
    method = 'GET',
    body = null,
    auth = true,
    token = null
  } = {}) {
    const headers = { Accept: 'application/json' };

    if (body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    const bearer = token || (auth ? currentToken : '');

    if (bearer) {
      headers.Authorization = 'Bearer ' + bearer;
    }

    let response;

    try {
      response = await fetch(API_BASE + path, {
        method,
        headers,
        body: body === null ? undefined : JSON.stringify(body),
        cache: 'no-store'
      });
    } catch {
      throw new Error('Не удалось подключиться к серверу NeGram. Проверь интернет.');
    }

    let data = {};

    try {
      data = await response.json();
    } catch {}

    if (!response.ok) {
      const error = new Error(
        data.error || 'Ошибка сервера: HTTP ' + response.status
      );
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function showAuthMode(mode) {
    const registering = mode === 'register';

    if (loginForm) loginForm.hidden = registering;
    if (registerForm) registerForm.hidden = !registering;

    const title = $('#auth-title');
    const subtitle = $('#auth-subtitle');
    const switchText = $('#auth-switch-text');

    if (title) title.textContent = registering ? 'Создай свой аккаунт' : 'С возвращением';

    if (subtitle) {
      subtitle.textContent = registering
        ? 'Аккаунт будет доступен на разных устройствах.'
        : 'Войди в свой аккаунт NeGram.';
    }

    if (switchText) {
      switchText.innerHTML = registering
        ? 'Уже есть аккаунт? <button type="button" id="show-login">Войти</button>'
        : 'Впервые в NeGram? <button type="button" id="show-register">Создать аккаунт</button>';
    }

    $('#show-register')?.addEventListener('click', () => showAuthMode('register'));
    $('#show-login')?.addEventListener('click', () => showAuthMode('login'));

    if (authError) authError.textContent = '';
  }

  function updateAccountUI(account) {
    currentAccount = account;

    const displayName =
      account?.displayName ||
      account?.display_name ||
      account?.name ||
      'Пользователь';

    const username = account?.username || '';
    const initial = (displayName.trim()[0] || 'N').toUpperCase();

    const nameNode = $('#profile-display-name');
    const userNode = $('#profile-username');
    const avatar = $('#profile-avatar');

    if (nameNode) nameNode.textContent = displayName;
    if (userNode) userNode.textContent = '@' + username;

    if (avatar) {
      avatar.textContent = initial;
      const glint = document.createElement('span');
      glint.className = 'avatar-glint';
      avatar.appendChild(glint);
    }

    const mini = $('.avatar-mini');
    if (mini) mini.textContent = initial;

    const badge = $('.profile-badge');

    if (badge) {
      badge.textContent = username === 'negramdev'
        ? '✦ DEVELOPER'
        : 'NEGRAM MEMBER';
    }

    applyProfileAssets();
  }

  function enterApp(user, token) {
    currentAccount = user;
    currentToken = token;

    const tokens = readTokens();
    tokens[user.username] = token;
    writeTokens(tokens);

    localStorage.setItem(activeUserKey, user.username);

    updateAccountUI(user);
    document.body.classList.remove('logged-out');

    if (authError) authError.textContent = '';

    showAuthMode('login');
    renderCustomEmojis();

    loadChats().catch(error => {
      toast('Не удалось загрузить чаты: ' + error.message);
    });
  }

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();

    if (authError) authError.textContent = '';

    const username = $('#login-username')?.value.trim().toLowerCase() || '';
    const password = $('#login-password')?.value || '';
    const submit = loginForm.querySelector('button[type="submit"]');

    if (submit) submit.disabled = true;

    try {
      const result = await api('/login', {
        method: 'POST',
        auth: false,
        body: { username, password }
      });

      enterApp(result.user, result.token);
      toast('Вход выполнен · ' + username);
    } catch (error) {
      if (authError) authError.textContent = error.message;
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  registerForm?.addEventListener('submit', async event => {
    event.preventDefault();

    if (authError) authError.textContent = '';

    const displayName = $('#register-name')?.value.trim() || '';
    const username = $('#register-username')?.value.trim().toLowerCase() || '';
    const password = $('#register-password')?.value || '';
    const inviteCode = $('#register-invite')?.value.trim() || '';

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      if (authError) {
        authError.textContent = 'Имя пользователя: 3–24 символа, латиница, цифры или _.';
      }
      return;
    }

    if (password.length < 8) {
      if (authError) {
        authError.textContent = 'Пароль должен содержать минимум 8 символов.';
      }
      return;
    }

    const submit = registerForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      const result = await api('/register', {
        method: 'POST',
        auth: false,
        body: { username, displayName, password, inviteCode }
      });

      enterApp(result.user, result.token);
      toast('Аккаунт создан на сервере NeGram');
    } catch (error) {
      if (authError) authError.textContent = error.message;
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  async function restoreSession() {
    const username = localStorage.getItem(activeUserKey);
    const token = readTokens()[username];

    if (!username || !token) {
      showAuthMode('login');
      return;
    }

    try {
      const result = await api('/me', { token });
      enterApp(result.user, token);
    } catch (error) {
      showAuthMode('login');

      if (error.status === 401) {
        const tokens = readTokens();
        delete tokens[username];
        writeTokens(tokens);
        localStorage.removeItem(activeUserKey);

        if (authError) {
          authError.textContent = 'Сессия завершилась. Войди снова.';
        }
      } else if (authError) {
        authError.textContent =
          'Не удалось связаться с сервером. Проверь интернет и обнови страницу.';
      }
    }
  }

  $('#switch-account')?.addEventListener('click', async () => {
    const tokens = readTokens();
    const names = Object.keys(tokens);

    if (names.length > 1) {
      const choice = prompt(
        'Сохранённые аккаунты:\n' +
        names.join('\n') +
        '\n\nВведи имя аккаунта для переключения:'
      );

      if (choice === null) return;

      if (choice.trim()) {
        const key = choice.trim().toLowerCase();
        const token = tokens[key];

        if (!token) {
          toast('Для этого аккаунта нет сохранённой сессии');
          return;
        }

        try {
          const result = await api('/me', { token });
          enterApp(result.user, token);
          toast('Переключено на @' + key);
        } catch {
          toast('Сессия аккаунта завершилась — войди снова');
        }

        return;
      }
    }

    localStorage.removeItem(activeUserKey);
    currentAccount = null;
    currentToken = '';

    document.body.classList.add('logged-out');

    if ($('#login-password')) $('#login-password').value = '';
    if ($('#login-username')) $('#login-username').value = '';

    showAuthMode('login');

    if (names.length && $('#login-username')) {
      $('#login-username').value = names[0];
    }
  });

  // Профиль

  const profileAssetsKey = () =>
    `negram-profile-assets-v2:${currentAccount?.username || 'guest'}`;

  function loadProfileAssets() {
    try {
      return JSON.parse(localStorage.getItem(profileAssetsKey()) || '{}');
    } catch {
      return {};
    }
  }

  function applyProfileAssets() {
    const assets = loadProfileAssets();
    const avatar = $('#profile-avatar');
    const cover = $('#profile-cover');

    if (assets.avatarEmoji && avatar) {
      avatar.textContent = assets.avatarEmoji;

      const glint = document.createElement('span');
      glint.className = 'avatar-glint';
      avatar.appendChild(glint);
    }

    if (assets.avatar && avatar) {
      avatar.textContent = '';

      const img = document.createElement('img');
      img.src = assets.avatar;
      img.alt = 'Фото профиля';

      avatar.appendChild(img);
    }

    if (assets.cover && cover) {
      cover.style.backgroundImage =
        `linear-gradient(90deg,rgba(12,9,29,.25),rgba(12,9,29,.42)),url("${assets.cover}")`;

      cover.style.backgroundSize = 'cover';
      cover.style.backgroundPosition = 'center';
    } else if (cover && assets.coverStyle) {
      cover.style.background = assets.coverStyle;
    }
  }

  function saveProfileAsset(kind, file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();

    reader.onload = () => {
      const assets = loadProfileAssets();
      assets[kind] = reader.result;

      try {
        localStorage.setItem(profileAssetsKey(), JSON.stringify(assets));
        applyProfileAssets();
        toast(kind === 'avatar' ? 'Фото профиля обновлено' : 'Обложка обновлена');
      } catch {
        toast('Файл слишком большой. Выбери фото поменьше.');
      }
    };

    reader.readAsDataURL(file);
  }

  $('#change-avatar')?.addEventListener('click', () => $('#avatar-file')?.click());
  $('#change-cover')?.addEventListener('click', () => $('#cover-file')?.click());

  $('#avatar-file')?.addEventListener('change', event => {
    saveProfileAsset('avatar', event.target.files?.[0]);
    event.target.value = '';
  });

  $('#cover-file')?.addEventListener('change', event => {
    saveProfileAsset('cover', event.target.files?.[0]);
    event.target.value = '';
  });

  const presetAvatars = [
    '🙂', '😎', '🐸', '🦊', '🐱', '🐼',
    '🐧', '🦄', '👾', '🌙', '💜', '🦋',
    '🐲', '🐻', '🐨', '🐰', '🦝', '🐯'
  ];

  const presetCovers = [
    'linear-gradient(120deg,#47336e,#1c386d)',
    'linear-gradient(120deg,#8b477b,#3e3b83)',
    'linear-gradient(120deg,#245c68,#292b60)',
    'linear-gradient(120deg,#5d4b35,#292b52)',
    'linear-gradient(120deg,#8c5270,#33224e)',
    'linear-gradient(120deg,#334b70,#191b35)'
  ];

  function renderProfilePresets() {
    const avatarGrid = $('#preset-avatars');
    const coverGrid = $('#preset-covers');

    if (avatarGrid) {
      avatarGrid.innerHTML = '';

      presetAvatars.forEach(emoji => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'preset-avatar';
        button.textContent = emoji;

        button.addEventListener('click', () => {
          const assets = loadProfileAssets();
          assets.avatarEmoji = emoji;
          delete assets.avatar;

          localStorage.setItem(profileAssetsKey(), JSON.stringify(assets));
          applyProfileAssets();

          avatarGrid.querySelectorAll('button').forEach(item => {
            item.classList.toggle('selected', item === button);
          });
        });

        avatarGrid.appendChild(button);
      });
    }

    if (coverGrid) {
      coverGrid.innerHTML = '';

      presetCovers.forEach(style => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'preset-cover';
        button.style.background = style;

        button.addEventListener('click', () => {
          const assets = loadProfileAssets();
          assets.coverStyle = style;
          delete assets.cover;

          localStorage.setItem(profileAssetsKey(), JSON.stringify(assets));
          applyProfileAssets();

          coverGrid.querySelectorAll('button').forEach(item => {
            item.classList.toggle('selected', item === button);
          });
        });

        coverGrid.appendChild(button);
      });
    }
  }

  renderProfilePresets();

  // Навигация

  function go(page) {
    if (!pages.includes(page)) return;

    pages.forEach(name => {
      $('#page-' + name)?.classList.toggle('active', name === page);
    });

    $$('[data-page]').forEach(button => {
      button.classList.toggle(
        'active',
        button.classList.contains('nav-item') &&
        button.dataset.page === page
      );
    });

    if (page === 'chat') {
      setTimeout(() => {
        $('#message-input')?.focus({ preventScroll: true });
      }, 180);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'chats') {
      loadChats().catch(() => {});
    }

    if (page === 'stickers') renderMyStickers();
  }

  $$('[data-page]').forEach(button => {
    button.addEventListener('click', () => go(button.dataset.page));
  });

  // Чаты

  function chatTitle(chat) {
    return chat.name || chat.other_username || 'Личный чат';
  }

  function renderChatList(list) {
    if (!chatListHost) return;

    chatListHost.innerHTML = '';

    const empty = $('.empty-space');
    if (empty) empty.style.display = list.length ? 'none' : 'block';

    const count = $('.tiny-count');
    if (count) count.textContent = String(list.length).padStart(2, '0');

    list.forEach(chat => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'network-chat-card';

      const avatar = document.createElement('span');
      avatar.className = 'chat-avatar avatar-orbit';
      avatar.textContent = chat.chat_type === 'group' ? '👥' : '💬';

      const info = document.createElement('span');
      info.className = 'chat-info';

      const row = document.createElement('span');
      row.className = 'chat-title-row';

      const title = document.createElement('strong');
      title.textContent = chatTitle(chat);

      const time = document.createElement('time');
      time.textContent = chat.last_at ? clock(new Date(chat.last_at)) : 'сейчас';

      row.append(title, time);

      const preview = document.createElement('p');
      preview.textContent =
        chat.last_message ||
        (chat.chat_type === 'group' ? 'Групповой чат' : 'Начните переписку');

      const meta = document.createElement('span');
      meta.className = 'secure-mark';
      meta.textContent =
        chat.chat_type === 'group' ? '◇ ГРУППА' : '◇ ЛИЧНЫЙ ЧАТ';

      info.append(row, preview, meta);

      const arrow = document.createElement('span');
      arrow.className = 'chevron';
      arrow.textContent = '›';

      button.append(avatar, info, arrow);
      button.addEventListener('click', () => openChat(chat));

      chatListHost.appendChild(button);
    });
  }

  async function loadChats() {
    if (!currentToken) return;

    const data = await api('/chats');
    chats = Array.isArray(data.chats) ? data.chats : [];

    renderChatList(chats);
  }

  async function createPrivateChat() {
    const username = prompt(
      'Имя пользователя собеседника (например, family_user):'
    );

    if (!username?.trim()) return;

    try {
      const cleanUsername = username
        .trim()
        .replace(/^@/, '')
        .toLowerCase();

      const data = await api('/chats/private', {
        method: 'POST',
        body: { username: cleanUsername }
      });

      await loadChats();

      const chat = chats.find(
        item => String(item.id) === String(data.chatId)
      );

      if (!chat) {
        throw new Error(
          'Чат создан, но не появился в списке. Обнови страницу.'
        );
      }

      await openChat(chat);
    } catch (error) {
      toast(error.message);
    }
  }

  async function createGroupChat() {
    const name = prompt('Название группового чата:');
    if (!name?.trim()) return;

    const members = prompt('Имена пользователей через запятую (без @):');
    if (members === null) return;

    const usernames = members
      .split(',')
      .map(value => value.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean);

    try {
      const data = await api('/chats/group', {
        method: 'POST',
        body: { name: name.trim(), usernames }
      });

      const chatId = data.chatId ?? data.chat?.id;

      await loadChats();

      const chat =
        chats.find(item => String(item.id) === String(chatId)) ||
        data.chat;

      if (!chat) {
        throw new Error('Группа создана, но не появилась в списке.');
      }

      await openChat(chat);
    } catch (error) {
      toast(error.message);
    }
  }

  $('#new-chat')?.addEventListener('click', createPrivateChat);
  $('#empty-open')?.addEventListener('click', createPrivateChat);
  $('#new-group')?.addEventListener('click', createGroupChat);

  $('#search-input')?.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();

    chatListHost?.querySelectorAll('.network-chat-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(query)
        ? 'flex'
        : 'none';
    });
  });

  // Сообщения

  function clock(date = new Date()) {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function toViewMessage(message) {
    const rawTime = message.created_at;
    const numericTime = Number(rawTime);

    const createdAt = Number.isFinite(numericTime)
      ? numericTime
      : Date.parse(rawTime) || Date.now();

    return {
      id: message.id,
      text: message.body || '',
      time: clock(new Date(createdAt)),
      created_at: createdAt,
      mine: !!message.mine,
      senderName:
        message.display_name ||
        message.username ||
        'Участник',
      remote: true
    };
  }

  function render() {
    if (!area) return;

    area.querySelectorAll('.message').forEach(node => node.remove());

    const welcome = $('.welcome-message');

    if (messages.length && welcome) {
      welcome.style.display = 'none';
    } else if (welcome) {
      welcome.style.display = 'block';

      const paragraph = welcome.querySelector('p');
      if (paragraph) {
        paragraph.textContent =
          'Сообщения будут появляться здесь после отправки.';
      }
    }

    messages.forEach(message => addMessageNode(message, false));

    area.scrollTop = area.scrollHeight;
  }

  async function openChat(chat) {
    if (!chat) return;

    activeChat = chat;
    activeChatId = chat.id;
    lastMessageTimestamp = 0;

    const title = $('.chat-top-info strong');
    const subtitle = $('.chat-top-info span');
    const notice = $('.chat-notice');

    if (title) title.textContent = chatTitle(chat);

    if (subtitle) {
      subtitle.textContent =
        chat.chat_type === 'group' ? 'Групповой чат' : 'Личный чат';
    }

    if (notice) {
      notice.textContent =
        '◇ Онлайн-чат NeGram · сообщения синхронизируются через сервер';
    }

    go('chat');

    await loadMessages(true);
    startPolling();
  }

  async function loadMessages() {
    if (!activeChatId) return;

    try {
      const data = await api(
        `/chats/${encodeURIComponent(activeChatId)}/messages?after=0`
      );

      messages = (data.messages || []).map(toViewMessage);

      lastMessageTimestamp = messages.reduce(
        (max, message) => Math.max(max, message.created_at),
        0
      );

      render();
    } catch (error) {
      toast('Не удалось загрузить сообщения: ' + error.message);
    }
  }

  async function pollMessages() {
    if (!activeChatId || document.hidden) return;

    try {
      const after = Math.max(0, lastMessageTimestamp - 1);

      const data = await api(
        `/chats/${encodeURIComponent(activeChatId)}/messages?after=${after}`
      );

      let changed = false;

      for (const raw of data.messages || []) {
        if (messages.some(message => String(message.id) === String(raw.id))) {
          continue;
        }

        const message = toViewMessage(raw);
        messages.push(message);

        lastMessageTimestamp = Math.max(
          lastMessageTimestamp,
          message.created_at
        );

        changed = true;
      }

      if (changed) render();
    } catch (error) {
      console.warn('NeGram polling error:', error);
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(pollMessages, 2500);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) pollMessages();
  });

  async function sendNetworkText(text) {
    if (!activeChatId) {
      toast('Сначала открой личный или групповой чат');
      return;
    }

    const cleanText = String(text || '').trim();
    if (!cleanText) return;

    try {
      const data = await api(
        `/chats/${encodeURIComponent(activeChatId)}/messages`,
        {
          method: 'POST',
          body: { body: cleanText }
        }
      );

      const raw = data.message;

      if (raw && !messages.some(message => String(message.id) === String(raw.id))) {
        const message = toViewMessage(raw);
        messages.push(message);

        lastMessageTimestamp = Math.max(
          lastMessageTimestamp,
          message.created_at
        );

        render();
      }

      loadChats().catch(() => {});
    } catch (error) {
      toast('Сообщение не отправлено: ' + error.message);
    }
  }

  function addMessageNode(message, scroll = true) {
    if (!area) return;

    const node = document.createElement('div');

    node.className =
      'message ' +
      (message.mine ? 'outgoing' : 'incoming') +
      (message.type === 'sticker' ? ' sticker-message' : '');

    node.dataset.messageId = message.id || '';

    if (message.type === 'sticker' && message.stickerId) {
      const sticker = stickerList.find(item => item.id === message.stickerId);

      const art = document.createElement('div');
      art.className = 'sent-sticker';
      art.textContent = sticker?.emoji || '✨';

      node.appendChild(art);
    } else {
      node.appendChild(document.createTextNode(message.text || ''));
    }

    if (message.remote && !message.mine) {
      const sender = document.createElement('small');
      sender.className = 'message-sender';
      sender.textContent = message.senderName || 'Участник';
      node.appendChild(sender);
    }

    const time = document.createElement('time');
    time.textContent = message.time || clock();
    node.appendChild(time);

    area.appendChild(node);

    if (scroll) area.scrollTop = area.scrollHeight;
  }

  $('#message-form')?.addEventListener('submit', event => {
    event.preventDefault();

    const input = $('#message-input');
    const text = input?.value.trim();

    if (!text) return;

    input.value = '';
    sendNetworkText(text);
  });

  $('#chat-options')?.addEventListener('click', () => {
    toast('Настройки онлайн-чата NeGram');
  });

  // Большая коллекция стикеров

  const stickerList = [
    { id: 'laugh', emoji: '😂', name: 'Смеюсь' },
    { id: 'rofl', emoji: '🤣', name: 'Очень смешно' },
    { id: 'smile', emoji: '😊', name: 'Улыбка' },
    { id: 'love', emoji: '🥰', name: 'Любовь' },
    { id: 'heart-eyes', emoji: '😍', name: 'Влюблённость' },
    { id: 'cool', emoji: '😎', name: 'Круто' },
    { id: 'wow', emoji: '🤩', name: 'Вау' },
    { id: 'party', emoji: '🥳', name: 'Праздник' },
    { id: 'crazy', emoji: '🤪', name: 'Безумие' },
    { id: 'wink', emoji: '😉', name: 'Подмигивание' },
    { id: 'kiss', emoji: '😘', name: 'Поцелуй' },
    { id: 'hug', emoji: '🤗', name: 'Обнимашки' },
    { id: 'please', emoji: '🥺', name: 'Пожалуйста' },
    { id: 'cry', emoji: '😭', name: 'Плачу' },
    { id: 'sad', emoji: '😢', name: 'Грусть' },
    { id: 'angry', emoji: '😡', name: 'Злость' },
    { id: 'rage', emoji: '🤬', name: 'Очень злюсь' },
    { id: 'think', emoji: '🤔', name: 'Думаю' },
    { id: 'peek', emoji: '🫣', name: 'Подглядываю' },
    { id: 'shock', emoji: '😱', name: 'Испуг' },
    { id: 'mind', emoji: '🤯', name: 'Взрыв мозга' },
    { id: 'sleep', emoji: '😴', name: 'Сплю' },
    { id: 'nerd', emoji: '🤓', name: 'Умничаю' },
    { id: 'ghost', emoji: '👻', name: 'Привидение' },
    { id: 'robot', emoji: '🤖', name: 'Робот' },
    { id: 'skull', emoji: '💀', name: 'Череп' },
    { id: 'clown', emoji: '🤡', name: 'Клоун' },
    { id: 'angel', emoji: '😇', name: 'Ангел' },
    { id: 'devil', emoji: '😈', name: 'Озорник' },
    { id: 'frog', emoji: '🐸', name: 'Лягушка' },
    { id: 'fox', emoji: '🦊', name: 'Лисёнок' },
    { id: 'cat', emoji: '🐱', name: 'Котик' },
    { id: 'black-cat', emoji: '🐈‍⬛', name: 'Чёрный кот' },
    { id: 'dog', emoji: '🐶', name: 'Собачка' },
    { id: 'bear', emoji: '🐻', name: 'Медведь' },
    { id: 'panda', emoji: '🐼', name: 'Панда' },
    { id: 'rabbit', emoji: '🐰', name: 'Кролик' },
    { id: 'hamster', emoji: '🐹', name: 'Хомяк' },
    { id: 'penguin', emoji: '🐧', name: 'Пингвин' },
    { id: 'unicorn', emoji: '🦄', name: 'Единорог' },
    { id: 'dragon', emoji: '🐉', name: 'Дракон' },
    { id: 'dinosaur', emoji: '🦖', name: 'Динозавр' },
    { id: 'shark', emoji: '🦈', name: 'Акула' },
    { id: 'whale', emoji: '🐳', name: 'Кит' },
    { id: 'octopus', emoji: '🐙', name: 'Осьминог' },
    { id: 'capybara', emoji: '🦫', name: 'Капибара' },
    { id: 'monkey', emoji: '🐵', name: 'Обезьянка' },
    { id: 'tiger', emoji: '🐯', name: 'Тигр' },
    { id: 'koala', emoji: '🐨', name: 'Коала' },
    { id: 'frog-heart', emoji: '🐸💗', name: 'Лягушка с сердцем' },
    { id: 'cat-heart', emoji: '😻', name: 'Кот влюблён' },
    { id: 'pig', emoji: '🐷', name: 'Поросёнок' },
    { id: 'chicken', emoji: '🐔', name: 'Курочка' },
    { id: 'duck', emoji: '🦆', name: 'Уточка' },
    { id: 'bee', emoji: '🐝', name: 'Пчёлка' },
    { id: 'butterfly', emoji: '🦋', name: 'Бабочка' },
    { id: 'spider', emoji: '🕷️', name: 'Паук' },
    { id: 'alien', emoji: '👽', name: 'Пришелец' },
    { id: 'rocket', emoji: '🚀', name: 'Ракета' },
    { id: 'planet', emoji: '🪐', name: 'Планета' },
    { id: 'moon', emoji: '🌙', name: 'Луна' },
    { id: 'star', emoji: '⭐', name: 'Звезда' },
    { id: 'sparkles', emoji: '✨', name: 'Блёстки' },
    { id: 'fire', emoji: '🔥', name: 'Огонь' },
    { id: 'lightning', emoji: '⚡', name: 'Молния' },
    { id: 'rainbow', emoji: '🌈', name: 'Радуга' },
    { id: 'heart', emoji: '💗', name: 'Сердце' },
    { id: 'purple-heart', emoji: '💜', name: 'Фиолетовое сердце' },
    { id: 'blue-heart', emoji: '💙', name: 'Синее сердце' },
    { id: 'broken-heart', emoji: '💔', name: 'Разбитое сердце' },
    { id: 'crown', emoji: '👑', name: 'Корона' },
    { id: 'trophy', emoji: '🏆', name: 'Кубок' },
    { id: 'diamond', emoji: '💎', name: 'Алмаз' },
    { id: 'gift', emoji: '🎁', name: 'Подарок' },
    { id: 'balloon', emoji: '🎈', name: 'Шарик' },
    { id: 'mushroom', emoji: '🍄', name: 'Грибочек' },
    { id: 'pizza', emoji: '🍕', name: 'Пицца' },
    { id: 'cake', emoji: '🎂', name: 'Торт' },
    { id: 'coffee', emoji: '☕', name: 'Кофе' },
    { id: 'watermelon', emoji: '🍉', name: 'Арбуз' },
    { id: 'cookie', emoji: '🍪', name: 'Печенье' },
    { id: 'ghost-heart', emoji: '👻💜', name: 'Привидение с сердцем' },
    { id: 'robot-love', emoji: '🤖💗', name: 'Робот влюблён' },
    { id: 'frog-cool', emoji: '🐸😎', name: 'Крутая лягушка' },
    { id: 'cat-laugh', emoji: '😹', name: 'Смеющийся кот' },
    { id: 'dog-love', emoji: '🐶❤️', name: 'Собака любит' },
    { id: 'capybara-love', emoji: '🦫💗', name: 'Капибара с сердцем' },
    { id: 'duck-love', emoji: '🦆💕', name: 'Уточка с сердцем' },
    { id: 'shark-cool', emoji: '🦈😎', name: 'Крутая акула' },
    { id: 'pepe', emoji: '🐸', name: 'Квак' },
    { id: 'facepalm', emoji: '🤦', name: 'Фейспалм' },
    { id: 'clap', emoji: '👏', name: 'Аплодисменты' },
    { id: 'ok', emoji: '👌', name: 'Окей' },
    { id: 'thumbs-up', emoji: '👍', name: 'Лайк' },
    { id: 'thumbs-down', emoji: '👎', name: 'Дизлайк' },
    { id: 'handshake', emoji: '🤝', name: 'Договорились' },
    { id: 'salute', emoji: '🫡', name: 'На связи' },
    { id: 'eyes', emoji: '👀', name: 'Глаза' },
    { id: 'party-face', emoji: '🥳🎉', name: 'Вечеринка' },
    { id: 'love-you', emoji: '🥰💗', name: 'Обожаю' },
    { id: 'sleepy-cat', emoji: '😽💤', name: 'Сонный кот' },
    { id: 'wow-cat', emoji: '🙀', name: 'Удивлённый кот' },
    { id: 'angry-cat', emoji: '😾', name: 'Сердитый кот' }
  ];

  function sendSticker(id) {
    const sticker = stickerList.find(item => item.id === id);

    if (!sticker) return;

    if (!activeChatId) {
      toast('Сначала открой чат');
      return;
    }

    sendNetworkText(sticker.emoji);
  }

  function renderStickerCollection() {
    const gallery = $('#sticker-collection');
    if (!gallery) return;

    gallery.innerHTML = '';

    stickerList.forEach(sticker => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.sticker = sticker.id;
      button.className = 'sticker-option';
      button.title = sticker.name;

      const emoji = document.createElement('span');
      emoji.className = 'sticker-emoji';
      emoji.textContent = sticker.emoji;

      const label = document.createElement('small');
      label.textContent = sticker.name;

      button.append(emoji, label);

      button.addEventListener('click', () => {
        sendSticker(sticker.id);
      });

      gallery.appendChild(button);
    });
  }

  renderStickerCollection();

  $('#sticker-collection')?.addEventListener('click', event => {
    const button = event.target.closest('[data-sticker]');

    if (button) {
      sendSticker(button.dataset.sticker);
    }
  });

  // Панель быстрых стикеров

  const tray = $('#inline-sticker-tray');

  $('#sticker-toggle')?.addEventListener('click', () => {
    if (!tray) return;

    tray.hidden = !tray.hidden;

    if (tray.hidden) return;

    const list = $('#inline-sticker-list');
    if (!list) return;

    list.innerHTML = '';

    stickerList.forEach(sticker => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inline-sticker';
      button.textContent = sticker.emoji;
      button.title = sticker.name;

      button.addEventListener('click', () => {
        sendSticker(sticker.id);
        tray.hidden = true;
      });

      list.appendChild(button);
    });

    let mine = [];

    try {
      mine = JSON.parse(localStorage.getItem('negram-my-stickers') || '[]');
    } catch {}

    mine.forEach(sticker => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inline-sticker inline-custom-sticker';

      const img = document.createElement('img');
      img.src = sticker.image;
      img.alt = sticker.caption || 'Мой стикер';

      button.appendChild(img);

      button.addEventListener('click', () => {
        toast('Личные стикеры пока доступны только на этом устройстве.');
        tray.hidden = true;
      });

      list.appendChild(button);
    });
  });

  $('#open-sticker-gallery')?.addEventListener('click', () => go('stickers'));

  // Голосовые и вложения

  let activeVoicePreset = 'autotune';

  $$('.voice-preset').forEach(button => {
    button.addEventListener('click', () => {
      $$('.voice-preset').forEach(item => {
        item.classList.toggle('active', item === button);
      });

      activeVoicePreset = button.dataset.voice;
    });
  });

  $('#voice-button')?.addEventListener('click', () => {
    toast('Голосовые сообщения появятся после подключения файлового хранилища.');
  });

  $('#video-circle-button')?.addEventListener('click', () => {
    toast('Видеокружки появятся после подключения файлового хранилища.');
  });

  $('#attach-button')?.addEventListener('click', () => {
    toast('Фото и видео появятся после подключения файлового хранилища.');
  });

  $('#media-input')?.addEventListener('change', event => {
    if (event.target.files?.length) {
      toast('Загрузка файлов пока не подключена к серверу.');
    }

    event.target.value = '';
  });

  // Создание собственных стикеров

  let pendingStickerData = '';

  const premiumEnabled = () => false;

  $('#studio-add')?.addEventListener('click', () => {
    if (!premiumEnabled()) {
      toast('Создание личных стикеров доступно в NeGram +');
      go('premium');
      return;
    }

    $('#sticker-photo-input')?.click();
  });

  $('#sticker-photo-input')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      pendingStickerData = reader.result;

      const preview = $('#sticker-source-preview');
      const editor = $('#sticker-editor');

      if (preview) preview.src = pendingStickerData;
      if (editor) editor.hidden = false;
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  });

  $('#sticker-cancel')?.addEventListener('click', () => {
    if ($('#sticker-editor')) $('#sticker-editor').hidden = true;
    pendingStickerData = '';
  });

  function renderMyStickers() {
    const host = $('#my-stickers');
    if (!host) return;

    let list = [];

    try {
      list = JSON.parse(localStorage.getItem('negram-my-stickers') || '[]');
    } catch {}

    host.innerHTML = '';

    if (!list.length) {
      host.innerHTML =
        '<span class="my-stickers-empty">Твои стикеры появятся здесь</span>';
      return;
    }

    list.forEach(sticker => {
      const button = document.createElement('button');
      button.className = 'my-sticker';
      button.type = 'button';

      const img = document.createElement('img');
      img.src = sticker.image;

      button.appendChild(img);

      if (sticker.caption) {
        const caption = document.createElement('strong');
        caption.textContent = sticker.caption;
        button.appendChild(caption);
      }

      button.addEventListener('click', () => {
        toast('Личные стикеры пока доступны только на этом устройстве.');
      });

      host.appendChild(button);
    });
  }

  $('#sticker-save')?.addEventListener('click', () => {
    if (!pendingStickerData) return;

    let list = [];

    try {
      list = JSON.parse(localStorage.getItem('negram-my-stickers') || '[]');
    } catch {}

    const item = {
      image: pendingStickerData,
      caption: $('#sticker-caption')?.value.trim() || ''
    };

    try {
      localStorage.setItem(
        'negram-my-stickers',
        JSON.stringify([...list, item].slice(-30))
      );

      toast('Твой стикер сохранён');
    } catch {
      toast('Фото слишком большое — выбери изображение поменьше');
    }

    if ($('#sticker-editor')) $('#sticker-editor').hidden = true;
    if ($('#sticker-caption')) $('#sticker-caption').value = '';

    pendingStickerData = '';
    renderMyStickers();
  });

  renderMyStickers();

  // Пузырьки сообщений

  const bubbleNames = [
    'glass', 'violet', 'blue', 'dark',
    'holo', 'chrome', 'neon', 'rose',
    'mint', 'sunset', 'carbon', 'crystal'
  ];

  function setBubble(style, notify = false) {
    if (!bubbleNames.includes(style)) style = 'glass';

    document.body.dataset.bubble = style;

    $$('.bubble-option').forEach(button => {
      button.classList.toggle('selected', button.dataset.style === style);
    });

    try {
      localStorage.setItem('negram-bubble-style', style);
    } catch {}

    if (notify) {
      const label = $(`.bubble-option[data-style="${style}"] strong`);
      toast('Пузырь изменён: ' + (label?.textContent || style));
    }
  }

  $$('.bubble-option').forEach(button => {
    button.addEventListener('click', () => {
      setBubble(button.dataset.style, true);
    });
  });

  try {
    setBubble(localStorage.getItem('negram-bubble-style') || 'glass');
  } catch {
    setBubble('glass');
  }

  // Темы

  const themeNames = ['nebula', 'deep', 'aurora', 'platinum', 'rose'];

  function setTheme(theme, notify = false) {
    if (!themeNames.includes(theme)) theme = 'nebula';

    document.body.dataset.theme = theme;

    $$('.theme-option').forEach(button => {
      button.classList.toggle('selected', button.dataset.theme === theme);
    });

    try {
      localStorage.setItem('negram-theme', theme);
    } catch {}

    if (notify) toast('Тема оформления применена');
  }

  $$('.theme-option').forEach(button => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.theme, true);
    });
  });

  try {
    setTheme(localStorage.getItem('negram-theme') || 'nebula');
  } catch {
    setTheme('nebula');
  }

  // Настройки оформления

  $('#theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('glow-off');

    $('#glow-toggle')?.classList.toggle('on');

    try {
      localStorage.setItem(
        'negram-glow',
        document.body.classList.contains('glow-off') ? 'off' : 'on'
      );
    } catch {}
  });

  try {
    if (localStorage.getItem('negram-glow') === 'off') {
      document.body.classList.add('glow-off');
      $('#glow-toggle')?.classList.remove('on');
    }
  } catch {}

  $('#install-help')?.addEventListener('click', () => {
    toast('В Safari нажми «Поделиться» → «На экран Домой»');
  });

  $('#about-button')?.addEventListener('click', () => {
    toast('NeGram 2.1 · сетевые чаты');
  });

  // Premium

  const premiumButton = $('#premium-demo-toggle');

  if (premiumButton) {
    premiumButton.disabled = true;
    premiumButton.textContent = 'Оплата пока не подключена';
  }

  const premiumCodeButton = $('#activate-premium-code');

  if (premiumCodeButton) {
    premiumCodeButton.disabled = true;
  }

  // Эмодзи-лица

  const faceEmojis = [
    ['😂', 'Смеюсь'], ['🤣', 'Очень смешно'],
    ['😆', 'Хохочу'], ['😅', 'Неловко'],
    ['😊', 'Улыбка'], ['🥰', 'Обожаю'],
    ['😍', 'Восторг'], ['😘', 'Поцелуй'],
    ['😎', 'Круто'], ['🤩', 'Вау'],
    ['🥳', 'Праздник'], ['😜', 'Дразнюсь'],
    ['🤪', 'Безуминка'], ['🤗', 'Обнимашки'],
    ['🥺', 'Пожалуйста'], ['😭', 'Плачу'],
    ['😢', 'Грущу'], ['😤', 'Фыркаю'],
    ['😡', 'Злюсь'], ['🤬', 'Очень злюсь'],
    ['🤔', 'Думаю'], ['🫣', 'Подглядываю'],
    ['🫢', 'Ой'], ['😱', 'Испуг'],
    ['🤯', 'Взрыв мозга'], ['😴', 'Сплю'],
    ['🥱', 'Зеваю'], ['🤧', 'Апчхи'],
    ['🤒', 'Приболел'], ['🤓', 'Умничаю'],
    ['🤑', 'Деньги'], ['🤠', 'Ковбой'],
    ['👻', 'Привидение'], ['🤖', 'Робот'],
    ['💀', 'Череп'], ['🤡', 'Клоун'],
    ['😇', 'Ангел'], ['🙃', 'Вверх ногами'],
    ['😏', 'Хитрюга'], ['😶', 'Без слов'],
    ['🫡', 'На связи'], ['🤝', 'Договорились'],
    ['🙄', 'Ну конечно'], ['😬', 'Неловко'],
    ['😋', 'Вкусно'], ['🤤', 'Хочу'],
    ['🥹', 'До слёз'], ['😈', 'Озорник'],
    ['💩', 'Какашка'], ['🐸', 'Лягушка']
  ];

  const faceGrid = $('#animated-faces-grid');

  if (faceGrid) {
    faceGrid.innerHTML = '';

    faceEmojis.forEach(([emoji, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'animated-face-card';

      const face = document.createElement('span');
      face.className = 'emoji';
      face.textContent = emoji;

      const caption = document.createElement('small');
      caption.textContent = label;

      button.append(face, caption);

      button.addEventListener('click', () => {
        go('chat');

        const input = $('#message-input');
        if (!input) return;

        input.value = (input.value ? input.value + ' ' : '') + emoji;
        input.focus();
      });

      faceGrid.appendChild(button);
    });
  }

  // Собственные эмодзи

  let emojiSourceImage = null;
  let emojiSourceUrl = null;

  const customEmojiKey = () =>
    `negram-custom-emojis-v2:${currentAccount?.username || 'guest'}`;

  function getCustomEmojis() {
    try {
      const value = JSON.parse(localStorage.getItem(customEmojiKey()) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function drawEmojiCrop() {
    const canvas = $('#emojiCropCanvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');

    context.clearRect(0, 0, 256, 256);

    if (!emojiSourceImage) {
      context.fillStyle = '#b8a9d2';
      context.font = '14px system-ui';
      context.textAlign = 'center';
      context.fillText('Нет картинки', 128, 132);
      return;
    }

    const width = emojiSourceImage.naturalWidth;
    const height = emojiSourceImage.naturalHeight;
    const base = Math.max(256 / width, 256 / height);
    const zoom = Number($('#emojiZoom')?.value || 1);

    const drawWidth = width * base * zoom;
    const drawHeight = height * base * zoom;

    context.save();
    context.beginPath();
    context.rect(0, 0, 256, 256);
    context.clip();

    context.drawImage(
      emojiSourceImage,
      (256 - drawWidth) / 2,
      (256 - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

    context.restore();
  }

  function renderCustomEmojis() {
    const grid = $('#customEmojiGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const items = getCustomEmojis();
    const count = $('#customEmojiCount');

    if (count) count.textContent = items.length + ' / 30';

    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'animated-face-card custom-emoji-item';

      const img = document.createElement('img');
      img.src = item.data;
      img.alt = item.name;

      const label = document.createElement('small');
      label.textContent = item.name;

      button.append(img, label);

      button.addEventListener('click', () => {
        go('chat');

        const input = $('#message-input');
        if (!input) return;

        input.value =
          (input.value ? input.value + ' ' : '') +
          `[${item.name}]`;

        input.focus();

        toast('Картинка остаётся в личной коллекции этого устройства');
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-emoji';
      remove.textContent = '×';

      remove.addEventListener('click', event => {
        event.stopPropagation();

        localStorage.setItem(
          customEmojiKey(),
          JSON.stringify(
            getCustomEmojis().filter(value => value.id !== item.id)
          )
        );

        renderCustomEmojis();
      });

      button.appendChild(remove);
      grid.appendChild(button);
    });

    if (count) count.textContent = items.length + ' / 30';
  }

  $('#customEmojiFile')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !/^image\/(png|jpeg|webp|gif)$/.test(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      toast('Выбери PNG, JPG, WEBP или GIF до 8 МБ');
      event.target.value = '';
      return;
    }

    if (emojiSourceUrl) {
      URL.revokeObjectURL(emojiSourceUrl);
    }

    emojiSourceUrl = URL.createObjectURL(file);

    const img = new Image();

    img.onload = () => {
      emojiSourceImage = img;

      if ($('#emojiZoom')) $('#emojiZoom').value = '1';

      drawEmojiCrop();

      const saveButton = $('#saveCustomEmoji');
      if (saveButton) saveButton.disabled = false;

      const hint = $('#emojiCropHint');

      if (hint) {
        hint.textContent = file.type === 'image/gif'
          ? 'GIF: сохраняется первый кадр'
          : 'Предпросмотр готов';
      }
    };

    img.onerror = () => toast('Не удалось открыть картинку');
    img.src = emojiSourceUrl;
    event.target.value = '';
  });

  $('#emojiZoom')?.addEventListener('input', drawEmojiCrop);

  $('#saveCustomEmoji')?.addEventListener('click', () => {
    if (!emojiSourceImage) return;

    const items = getCustomEmojis();

    if (items.length >= 30) {
      toast('Максимум 30 своих эмодзи');
      return;
    }

    const name =
      ($('#customEmojiName')?.value || 'Моё эмодзи')
        .trim()
        .slice(0, 24);

    const canvas = $('#emojiCropCanvas');
    if (!canvas) return;

    const data = canvas.toDataURL('image/png');

    try {
      items.push({
        id: Date.now().toString(36),
        name,
        data
      });

      localStorage.setItem(customEmojiKey(), JSON.stringify(items));

      renderCustomEmojis();
      toast('Эмодзи сохранено на этом устройстве');
    } catch {
      toast('Не хватило места в памяти браузера');
    }
  });

  $('#resetCustomEmoji')?.addEventListener('click', () => {
    emojiSourceImage = null;

    if (emojiSourceUrl) {
      URL.revokeObjectURL(emojiSourceUrl);
    }

    emojiSourceUrl = null;

    if ($('#customEmojiFile')) $('#customEmojiFile').value = '';
    if ($('#customEmojiName')) $('#customEmojiName').value = '';
    if ($('#emojiZoom')) $('#emojiZoom').value = '1';

    const saveButton = $('#saveCustomEmoji');
    if (saveButton) saveButton.disabled = true;

    const hint = $('#emojiCropHint');
    if (hint) hint.textContent = 'Здесь появится предпросмотр';

    drawEmojiCrop();
  });

  renderCustomEmojis();
  drawEmojiCrop();

  // Проверка актуального сервера

  (async () => {
    const label = $('.demo-label');

    try {
      const response = await fetch(API_BASE + '/health', {
        cache: 'no-store'
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'online') {
        throw new Error('Сервер не отвечает');
      }

      if (label) {
        label.innerHTML = '<i></i> NEGRAM · СЕРВЕР НА СВЯЗИ';
      }
    } catch {
      if (label) {
        label.textContent = 'СЕРВЕР НЕ ДОСТУПЕН';
      }
    }
  })();

  // Service Worker

  if (
    'serviceWorker' in navigator &&
    location.protocol.startsWith('http')
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .catch(error => console.warn('NeGram SW:', error));
    });
  }

  restoreSession();
  render();

})();
