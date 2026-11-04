# Notifications

Learnarr can tell you two things:

- **Cards are waiting.** Once a day, from 18:00 (the server's time zone), if you have cards due and haven't
  studied yet that day.
- **Before you watch.** When you press play on Plex or Jellyfin, a notification with that episode's suggested
  words, or an offer to get its subtitle. Tap it and the episode opens in Learnarr. A quick look before the
  opening titles is often all it takes.

Both are on by default; turn either off in **Settings → Notifications**.

## Getting them on your phone

Pick one, or both.

### Web push (no app needed)

In **Settings → Notifications**, press **Turn on notifications** on each device you want them on.

- **Android, desktop browsers:** works in the browser straight away.
- **iPhone and iPad (iOS 16.4 or newer):** add Learnarr to the home screen first (Safari → Share → Add to Home
  Screen), open it from there, then turn notifications on.

Learnarr needs to be reached over **HTTPS** for web push (browsers require it, except on `localhost`). Behind a
reverse proxy with a certificate, set `PUBLIC_URL`.

### ntfy

[ntfy](https://ntfy.sh) is a free notification app for Android and iOS. Install it, subscribe to a topic with a
name that's hard to guess (Learnarr can make one up for you), and enter the same topic in **Settings →
Notifications**.

To use your own ntfy server, set `NTFY_URL` (and `NTFY_TOKEN` if it needs one).

## "Before you watch": connecting your media server

This needs your media server to tell Learnarr when something starts playing.

**The admin**, once: open **Settings → Media server** and copy the webhook address.

- **Plex** (needs Plex Pass): Plex Web → Settings → Webhooks → Add Webhook, paste the address.
- **Jellyfin:** install the **Webhook** plugin (Dashboard → Plugins → Catalog), add a **Generic Destination**
  with the address, tick **Playback Start** and **Send All Properties**.

**Everyone**: in **Settings → Notifications**, enter your user name on the media server, so Learnarr knows which
plays are yours. In a one-person household this can stay empty.

The webhook address contains a secret; anyone who has it can send Learnarr plays (but nothing else). Treat it
like a password.

## When they don't arrive

1. Press **Send a test** in Settings → Notifications. If it says there's nothing to send to, turn on push or set
   an ntfy topic.
2. Web push: check the browser or phone allows notifications for Learnarr. On iPhone, it must be opened from the
   home screen. Learnarr must be on HTTPS.
3. ntfy: check you're subscribed to exactly the same topic, on the same server.
4. Before you watch: check your media server user name in Settings, and that the webhook is set up. Pausing
   and resuming doesn't send a second notification within a few minutes.
5. Reminders: they come once a day from the reminder hour, only when cards are due and you haven't studied.
   Check `TZ` is your time zone.
