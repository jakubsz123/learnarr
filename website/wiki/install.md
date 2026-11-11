# Install

Learnarr runs as one Docker container with one `/config` folder. Images are published for `linux/amd64` and
`linux/arm64`, so it runs on a NAS, a Raspberry Pi 4 or 5, or any server that runs Plex or Jellyfin.

## Docker Compose

Save this as `docker-compose.yml`:

```yaml
services:
  learnarr:
    image: ghcr.io/smoothless-io/learnarr:latest
    container_name: learnarr
    ports:
      - "7979:7979"
    volumes:
      - ./config:/config
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Europe/Warsaw
    restart: unless-stopped
```

```bash
docker compose up -d
```

Then open `http://<your-server>:7979` and the [setup wizard](./first-run) takes it from there.

`PUID` and `PGID` are the user and group that should own `./config`; run `id` on the host to see yours.
`TZ` sets the time zone for daily limits and reminders; leave it out to use UTC.

## Docker

```bash
docker run -d --name learnarr \
  -p 7979:7979 \
  -v ./config:/config \
  -e PUID=1000 -e PGID=1000 \
  --restart unless-stopped \
  ghcr.io/smoothless-io/learnarr:latest
```

## Unraid, TrueNAS and other NAS systems

Use the image `ghcr.io/smoothless-io/learnarr:latest`, map container port `7979` to a free port on the host, and
map `/config` to an appdata folder (for example `/mnt/user/appdata/learnarr`). Nothing else is required.

## Behind a reverse proxy

Learnarr works over plain HTTP on your network with no configuration. If you put it behind a reverse proxy
with HTTPS (Caddy, Traefik, Nginx Proxy Manager, SWAG), set `PUBLIC_URL` to the address people use, so that
sign-in cookies are marked secure:

```yaml
environment:
  - PUBLIC_URL=https://learnarr.example.com
```

A minimal Caddy site:

```
learnarr.example.com {
  reverse_proxy learnarr:7979
}
```

## What it needs from your network

- Your media server, for browsing and subtitles.
- Your AI provider, unless you run one locally.
- `api.opensubtitles.com`, for people who connect an OpenSubtitles.com account.
- `lindat.mff.cuni.cz`, once per language, to download that language's lemmatiser model (see
  [Languages](./languages)).

## From source

For development, or to run without Docker:

```bash
git clone https://github.com/smoothless-io/learnarr && cd learnarr
npm install
scripts/fetch-udpipe.sh   # the lemmatiser, for "% you know"
npm run build
node .output/server/index.mjs
```

Learnarr then keeps its data in `./data` instead of `/config`. Node.js 22 or newer is required.
