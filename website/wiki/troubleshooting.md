# Troubleshooting

Start with **System → Status** (admin): it checks the media server, the AI provider, the lemmatiser and each
language's model, and links to the screen that fixes each problem. `docker logs learnarr` shows the rest.

## Sign-in fails, or the page keeps returning to sign-in

- Behind a reverse proxy with HTTPS, set `PUBLIC_URL` to the address you use.
- Reached at an address Learnarr doesn't expect (a second hostname, a VPN address), add it to
  `TRUSTED_ORIGINS`.
- Over plain HTTP, don't set `PUBLIC_URL` to an `https://` address: browsers drop secure cookies on HTTP.

## "Your media server has no subtitle for this"

The episode has no text subtitle track in your language. Image-based tracks (PGS, VobSub, common on Blu-ray
rips) can't be read. Connect your OpenSubtitles.com account in **Settings → Account** to download one, upload
a file, or have Bazarr fetch one.

## OpenSubtitles says the download limit is reached

Free OpenSubtitles.com accounts have a daily download limit. It resets every 24 hours. Episodes you already
have never count again.

## No "% you know" score

The episode page says why under the score:

- _Downloading the … language model_: wait; it's once per language.
- _Couldn't reach lindat.mff.cuni.cz_: the server can't download models. Allow outbound HTTPS to that host,
  then press **Try again**.
- _There's no language model for …_: Learnarr can't lemmatise that language yet (see [Languages](./languages)).
- _The lemmatiser isn't installed_: only outside Docker; run `scripts/fetch-udpipe.sh`.

## AI suggestions fail

- _returned an error (HTTP 401)_: the API key is wrong or has no credit.
- _ran out of room before answering_: a reasoning model spent its answer on thinking. Pick a non-reasoning
  model.
- _didn't answer with JSON_ or _didn't match any subtitle line_: the model is too small or ignores
  instructions. Use a larger one.
- Timeouts with a local model: the first request loads the model, which can take a minute. Try again.

## Notifications don't arrive

See [Notifications](./notifications#when-they-dont-arrive).

## Reporting a bug

Open an [issue](https://github.com/jakubsz123/learnarr/issues) with what you did, what you expected and what
happened, the Learnarr version (System → Status) and the relevant lines of `docker logs learnarr`. Remove
anything private (tokens, addresses) first.
