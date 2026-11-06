# Household accounts

One Learnarr server serves the whole household. The first account is the **admin**. After that, sign-up is
closed, and the admin invites people in **Settings → Users**.

## Inviting someone

Press **Create an invite link** and send the link to them however you like. They open it and choose their own
name, email and password, and are signed in. A link works once and expires after a week; it can't be shown
again after you leave the page, but you can cancel it under **Waiting to be used**.

If someone forgets their password, press **Reset password** next to their name and send them the link it
makes. They choose a new one and are signed out everywhere else. Anyone can change their own password under
**Settings → Account**.

What's shared and what isn't:

| Shared by everyone               | Each person's own                                           |
| -------------------------------- | ----------------------------------------------------------- |
| The media server and its library | Learning language, native language, level                   |
| The AI provider                  | Known words, cards and study history                        |
| Downloaded language models       | Subtitles they fetched, and their OpenSubtitles.com account |
|                                  | Notification settings                                       |

Only the admin sees **Settings → Media server**, **Settings → AI**, **Settings → Users** and **System**.
When someone signs in for the first time, Learnarr asks them which language they're learning and at what
level.

Deleting a user deletes their cards, known words and subtitles. Their account can't be recovered.
