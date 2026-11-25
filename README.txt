NEGRAM 2.0 — DEV BUILD (based on original 0.7 interface)

This development build keeps the original NeGram 0.7 interface and local prototype features.

Changes in this build:
- Temporarily hides the NEGRAM AI page and removes its network request. Existing Cloudflare Worker is not changed.
- Removes a duplicate chat-options click handler.
- Prevents duplicate avatar-glint elements after repeated profile updates.
- Bumps the service-worker cache to v21.

Current limitations (not yet implemented):
- Accounts and messages are local to one browser/device; there is no real multi-user online messaging yet.
- Media and voice recordings are local previews and are not synced between devices.
- Video circles are local recordings; server delivery/calls are not connected.
- Premium remains a demo toggle; there are no real payments.
- NEGRAM AI is temporarily paused by project decision.

The original layout and visual design are preserved as the baseline. Do not deploy this build over the live site until it has been tested and the owner explicitly approves deployment.
