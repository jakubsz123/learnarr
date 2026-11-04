interface Numbered {
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

/** "S1 E2", the way the *arr apps write an episode. */
export function episodeLabel(item: Numbered): string {
  return `S${item.seasonNumber ?? "?"} E${item.episodeNumber ?? "?"}`;
}

/** A film's title, or an episode's show and number: "Élite · S1 E2". Used wherever a card says where it's from. */
export function mediaTitle(item: Numbered & { title: string | null; showTitle?: string | null }): string {
  return item.showTitle ? `${item.showTitle} · ${episodeLabel(item)}` : (item.title ?? "");
}
