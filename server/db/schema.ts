import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  ankiUrl: text("anki_url"),
  ankiDeck: text("anki_deck"),
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
    server: text("server", { enum: ["plex", "jellyfin"] }).notNull(),
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
    source: text("source", { enum: ["plex", "jellyfin", "opensubtitles"] }).notNull(),
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
    // Spaced repetition (server/utils/srs.ts)
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
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("reviews_user_time_idx").on(t.userId, t.reviewedAt)],
);

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
