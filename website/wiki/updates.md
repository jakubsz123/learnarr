# Updates and backups

## Updating

```bash
docker compose pull
docker compose up -d
```

Database changes are applied automatically when the new version starts. Read the
[release notes](https://github.com/jakubsz123/learnarr/releases) before a big jump: while Learnarr is below
1.0, a release can change how something works.

To stay on a version, use its tag instead of `latest`, for example `ghcr.io/jakubsz123/learnarr:0.3.0`.

## Backups

Everything is in `/config`. To back up, stop the container and copy the folder:

```bash
docker compose stop learnarr
tar czf learnarr-backup-$(date +%F).tar.gz config
docker compose start learnarr
```

The database is SQLite in WAL mode, so copying it while Learnarr runs can catch it mid-write; stopping for the
few seconds of a copy avoids that. To restore, put the folder back and start the container.

Keep `encryption.key` with the database. Without it, the saved media server token, AI key and OpenSubtitles
passwords can't be decrypted (everything else still works, and those can be entered again).
