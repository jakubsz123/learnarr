import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

// ─── better-auth ────────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  learningLanguage: text("learning_language").notNull().default("es"),
  nativeLanguage: text("native_language").notNull().default("en"),
  level: text("level", { enum: ["beginner", "intermediate", "advanced"] })
    .notNull()
    .default("intermediate"),
  opensubtitlesUsername: text("opensubtitles_username"),
  opensubtitlesPassword: text("opensubtitles_password"),
  /** The person's own OpenSubtitles.com API key, encrypted; searching and downloading there need it. */
  opensubtitlesApiKey: text("opensubtitles_api_key"),
  ankiUrl: text("anki_url"),
  ankiDeck: text("anki_deck"),
  /** When the person answered the first-sign-in questions (languages, level); null until then. */
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  /** The interface language, for what the server writes: notifications. */
  locale: text("locale").notNull().default("en"),
  // Notifications (server/utils/notifications)
  ntfyTopic: text("ntfy_topic"),
  practiceReminders: integer("practice_reminders", { mode: "boolean" }).notNull().default(true),
  watchReminders: integer("watch_reminders", { mode: "boolean" }).notNull().default(true),
  /** The person's user name on the media server, to tell whose plays are theirs. */
  mediaServerUser: text("media_server_user"),
  lastRemindedAt: integer("last_reminded_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
});

/**
 * A link the admin gives someone: it lets them choose their own name, email and
 * password (a new account), or set a new password for an account that exists
 * (`userId` set). Only a hash of the link's token is kept, and the invite is
 * deleted once it's used.
 */
export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamps.createdAt,
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

// ─── Learnarr ───────────────────────────────────────────────────────────────

/** Instance-wide settings. Secrets are stored encrypted (see server/utils/secrets.ts). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamps.updatedAt,
});

/** A film or episode someone has started learning from, as the media server knows it. */
export const mediaItems = sqliteTable(
  "media_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    server: text("server", { enum: ["plex", "jellyfin", "opensubtitles", "upload"] }).notNull(),
    serverItemId: text("server_item_id").notNull(),
    kind: text("kind", { enum: ["movie", "episode"] }).notNull(),
    title: text("title").notNull(),
    showTitle: text("show_title"),
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),
    year: integer("year"),
    imdbId: text("imdb_id"),
    showImdbId: text("show_imdb_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("media_items_server_item_idx").on(t.server, t.serverItemId)],
);

/**
 * A subtitle fetched for one user. Kept per user on purpose: a subtitle downloaded
 * with one person's OpenSubtitles account is never handed to another.
 */
export const subtitles = sqliteTable(
  "subtitles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaItemId: integer("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    source: text("source", { enum: ["plex", "jellyfin", "opensubtitles", "upload"] }).notNull(),
    content: text("content").notNull(),
    cueCount: integer("cue_count").notNull(),
    wordsPickedAt: integer("words_picked_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("subtitles_user_item_lang_idx").on(t.userId, t.mediaItemId, t.language)],
);

export const cards = sqliteTable(
  "cards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subtitleId: integer("subtitle_id").references(() => subtitles.id, { onDelete: "set null" }),
    mediaItemId: integer("media_item_id").references(() => mediaItems.id, { onDelete: "set null" }),
    language: text("language").notNull(),
    term: text("term").notNull(),
    form: text("form").notNull(),
    translation: text("translation").notNull(),
    partOfSpeech: text("part_of_speech"),
    note: text("note"),
    sentence: text("sentence").notNull(),
    sentenceStartMs: integer("sentence_start_ms"),
    // Spaced repetition (shared/srs.ts)
    state: text("state", { enum: ["new", "learning", "review"] })
      .notNull()
      .default("new"),
    step: integer("step").notNull().default(0),
    due: integer("due", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    intervalDays: real("interval_days").notNull().default(0),
    ease: real("ease").notNull().default(2.5),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    suspended: integer("suspended", { mode: "boolean" }).notNull().default(false),
    ankiNoteId: integer("anki_note_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cards_user_lang_term_idx").on(t.userId, t.language, t.term),
    index("cards_user_due_idx").on(t.userId, t.due),
  ],
);

/**
 * Words the AI picked from a subtitle that the learner hasn't decided on yet.
 * Learning one turns it into a card; knowing one marks the word known.
 */
export const suggestions = sqliteTable(
  "suggestions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subtitleId: integer("subtitle_id")
      .notNull()
      .references(() => subtitles.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    term: text("term").notNull(),
    form: text("form").notNull(),
    translation: text("translation").notNull(),
    partOfSpeech: text("part_of_speech"),
    note: text("note"),
    sentence: text("sentence").notNull(),
    sentenceStartMs: integer("sentence_start_ms"),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("suggestions_user_lang_term_idx").on(t.userId, t.language, t.term)],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    /** The card was new when reviewed; counts against the daily new-card limit. */
    wasNew: integer("was_new", { mode: "boolean" }).notNull().default(false),
    intervalDays: real("interval_days").notNull(),
    /** The card's schedule before this review, so the review can be undone. */
    previous: text("previous", { mode: "json" }).$type<CardSchedule>(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("reviews_user_time_idx").on(t.userId, t.reviewedAt)],
);

/**
 * Words a user knows in a language: ones they marked, and the common words
 * seeded for their level (see server/utils/knownWords.ts). Stored lowercased.
 */
export const knownWords = sqliteTable(
  "known_words",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    word: text("word").notNull(),
    source: text("source", { enum: ["seed", "marked"] }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("known_words_user_lang_word_idx").on(t.userId, t.language, t.word)],
);

/** Which level a user's seeded known words were taken for, per language. */
export const wordSeeds = sqliteTable(
  "word_seeds",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    level: text("level").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.language] })],
);

/**
 * A subtitle split into words with their dictionary forms (UDPipe). No row yet
 * means not done: waiting, working, or a language without a model.
 */
export const subtitleLemmas = sqliteTable("subtitle_lemmas", {
  subtitleId: integer("subtitle_id")
    .primaryKey()
    .references(() => subtitles.id, { onDelete: "cascade" }),
  state: text("state", { enum: ["done", "failed"] }).notNull(),
  /** `[cueIndex, start, end, lemma, upos][]`, offsets into the cue's text. */
  tokens: text("tokens", { mode: "json" }).$type<LemmaToken[]>(),
  model: text("model"),
  message: text("message"),
  createdAt: timestamps.createdAt,
});

export type LemmaToken = [cue: number, start: number, end: number, lemma: string | null, upos: string];

/** A browser or phone the person turned push notifications on in. */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

/**
 * Wiktionary definitions, kept so a word is looked up once a month at most.
 * A null `entries` remembers that Wiktionary has nothing for the word.
 */
export const dictionaryEntries = sqliteTable(
  "dictionary_entries",
  {
    language: text("language").notNull(),
    word: text("word").notNull(),
    entries: text("entries", { mode: "json" }).$type<DictionaryEntry[] | null>(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.language, t.word] })],
);

export interface DictionaryEntry {
  partOfSpeech: string;
  definitions: string[];
  /** Set when the word looked up is a form of another (a plural, a conjugation), defined here instead. */
  formOf?: string;
}

export type CardSchedule = Pick<
  typeof cards.$inferSelect,
  "state" | "step" | "intervalDays" | "ease" | "reps" | "lapses"
> & { due: number };

/** Background work (picking words) the browser polls for. */
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["pick-words"] }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id"),
    state: text("state", { enum: ["queued", "running", "done", "failed"] })
      .notNull()
      .default("queued"),
    message: text("message"),
    result: text("result", { mode: "json" }),
    ...timestamps,
  },
  (t) => [index("jobs_user_idx").on(t.userId)],
);
