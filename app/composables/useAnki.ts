import { ANKI_FIELDS, escapeHtml, sentenceHtml } from "#shared/sentence";
import type { AnkiCard } from "~/utils/api";

/**
 * AnkiConnect runs on the user's own computer, so Learnarr's server can't reach
 * it: the browser talks to it directly, and AnkiConnect has to list this page's
 * address in its webCorsOriginList.
 */

const MODEL = "Learnarr";

async function call<T>(url: string, action: string, params: object = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: JSON.stringify({ action, version: 6, params }) });
  } catch {
    throw new LocalError("errors.anki.unreachable", { url, origin: window.location.origin });
  }
  const data = (await response.json()) as { result: T; error: string | null };
  if (data.error) throw new LocalError("errors.anki.error", { detail: data.error });
  return data.result;
}

async function check(url: string): Promise<number> {
  const permission = await call<{ permission: string }>(url, "requestPermission");
  if (permission.permission !== "granted") throw new LocalError("errors.anki.denied");
  return call<number>(url, "version");
}

async function ensureModel(url: string) {
  const models = await call<string[]>(url, "modelNames");
  if (models.includes(MODEL)) return;
  await call(url, "createModel", {
    modelName: MODEL,
    inOrderFields: [...ANKI_FIELDS],
    css: ".card { font-family: system-ui, sans-serif; font-size: 22px; text-align: center; } .meta { color: #777; font-size: 15px; } b { color: #d9543f; }",
    cardTemplates: [
      {
        Name: "Sentence",
        Front: "<div>{{Sentence}}</div>",
        Back: '{{FrontSide}}<hr id="answer"><div><b>{{Term}}</b>: {{Translation}}</div><div class="meta">{{Note}}</div><div class="meta">{{Source}}</div>',
      },
    ],
  });
}

/**
 * Add the cards to Anki and remember the note each became. A card whose term is
 * already in the deck is linked to that note instead of added twice.
 * Returns how many notes were added.
 */
async function push(url: string, deck: string, cards: AnkiCard[]): Promise<number> {
  await check(url);
  await call(url, "createDeck", { deck });
  await ensureModel(url);
  const notes = cards.map((card) => ({
    deckName: deck,
    modelName: MODEL,
    fields: {
      Term: escapeHtml(card.term),
      Translation: escapeHtml(card.translation),
      Sentence: sentenceHtml(card.sentence, card.form),
      Note: escapeHtml([card.partOfSpeech, card.note].filter(Boolean).join(" · ")),
      Source: escapeHtml(card.source),
    },
    options: { allowDuplicate: false, duplicateScope: "deck" },
    tags: ["learnarr"],
  }));
  // addNotes fails as a whole on a duplicate in newer AnkiConnect, so add only what can be added.
  const addable = await call<boolean[]>(url, "canAddNotes", { notes });
  const fresh = cards.filter((_, i) => addable[i]);
  const ids = fresh.length
    ? await call<(number | null)[]>(url, "addNotes", { notes: notes.filter((_, i) => addable[i]) })
    : [];
  const links = fresh.flatMap((card, i) => (ids[i] ? [{ cardId: card.id, noteId: ids[i]! }] : []));

  for (const card of cards.filter((_, i) => !addable[i])) {
    const query = `"deck:${deck.replace(/"/g, "")}" "Term:${escapeHtml(card.term).replace(/"/g, "")}"`;
    const [noteId] = await call<number[]>(url, "findNotes", { query });
    if (noteId) links.push({ cardId: card.id, noteId });
  }
  if (links.length) await api("/api/cards/anki", { method: "POST", body: { links } });
  return ids.filter(Boolean).length;
}

export function useAnki() {
  return { check, push };
}
