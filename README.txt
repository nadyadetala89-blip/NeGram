NEGRAM 2.0 — DEVELOPMENT BUILD
Based on the original 0.7 visual interface. This archive is a separate local test build; it does not deploy or modify the live GitHub Pages site or Cloudflare Worker.

Included in this update:
- Main subscription label changed to NeGram +; original demo price/conditions are unchanged.
- NeGram + benefits section expanded with exclusive sticker packs, animated face reactions, themes, customization and emoji status concepts.
- 24 expressive face reactions added to the sticker gallery and inline chat sticker panel.
- Four independent local test chats: Тестовый чат, Кирилл, Вася, Петя.
- Message context menu on long press/right-click: copy, edit, delete, forward to another local test chat.
- Video-circle shortcut placed beside sticker and voice controls in the chat composer.
- Profile editor: change nickname, username and password locally. Passwords remain PBKDF2 hashes.
- Developer badge uses the actual NeGram icon.svg and is labelled Разработчик; local demo developer panel shows device-only counts and local account names, never passwords or message contents.
- Readable handwritten-style heading font fallback.
- Service worker cache version bumped.

Important limitations:
- This is still a local prototype. Accounts, chats, subscription status, developer rights and settings are not synchronized or enforced by a server.
- NeGram + activation is a local demo; there is no payment provider.
- The developer panel is a local demo, not a secure server admin panel. The hidden-presence switch does not change real online status.
- The current voice AutoTune selector is still a playback/effect demo, not true pitch correction. True pitch correction and processing of the audio track in video circles remain unfinished.
- Voice/media recordings are not persisted across reloads or delivered to other devices.
- No site or Worker deployment was performed.

Test the archive locally/through HTTPS before any deployment. Do not put passwords, API tokens or private keys into this prototype.
