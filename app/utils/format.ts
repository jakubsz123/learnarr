/** "S1 E2", the way the *arr apps write an episode. */
export function episodeLabel(item: { seasonNumber?: number | null; episodeNumber?: number | null }): string {
  return `S${item.seasonNumber ?? "?"} E${item.episodeNumber ?? "?"}`;
}

/** Where a line is in the episode: "4:05", or "1:04:05" past an hour. */
export function timestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** A film's title, or an episode's show and number, to say where a card is from. */
export function sourceTitle(source: {
  kind?: "movie" | "episode" | null;
  title: string | null;
  showTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
}): string {
  return source.showTitle ? `${source.showTitle} · ${episodeLabel(source)}` : (source.title ?? "");
}
