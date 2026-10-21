import { eq, inArray } from "drizzle-orm";
import { parseSubtitle } from "#shared/subtitles";
import { schema, type Db } from "../db";
import { frequencyRanks } from "./frequency";
import { wordStates } from "./knownWords";
import { subtitleTokens } from "./lemmas";
import { buildTranscript, transcriptCoverage } from "./transcript";

type Learner = { id: string; level: string };

/** A subtitle's lines and words, with what the learner knows of them. */
export async function subtitleTranscript(
  db: Db,
  user: Learner,
  subtitle: { id: number; language: string; content: string },
) {
  const cues = parseSubtitle(subtitle.content);
  const [states, ranks] = await Promise.all([
    wordStates(db, user, subtitle.language),
    frequencyRanks(subtitle.language),
  ]);
  const transcript = buildTranscript(cues, subtitleTokens(db, subtitle.id), states, ranks);
  return { cues, transcript, coverage: transcriptCoverage(transcript) };
}

/** "% you know" for each of these subtitles (all in one language), null where there are no lemmas yet. */
export async function coverageOf(db: Db, user: Learner, language: string, subtitleIds: number[]) {
  const result = new Map<number, number | null>();
  if (!subtitleIds.length) return result;
  const [states, ranks] = await Promise.all([wordStates(db, user, language), frequencyRanks(language)]);
  const rows = db
    .select({
      id: schema.subtitles.id,
      content: schema.subtitles.content,
      tokens: schema.subtitleLemmas.tokens,
      state: schema.subtitleLemmas.state,
    })
    .from(schema.subtitles)
    .leftJoin(schema.subtitleLemmas, eq(schema.subtitleLemmas.subtitleId, schema.subtitles.id))
    .where(inArray(schema.subtitles.id, subtitleIds))
    .all();
  for (const row of rows) {
    const tokens = row.state === "done" ? row.tokens : null;
    result.set(
      row.id,
      tokens ? transcriptCoverage(buildTranscript(parseSubtitle(row.content), tokens, states, ranks)) : null,
    );
  }
  return result;
}
