import { defineEventHandler } from "h3";
import { z } from "zod";
import { useDb } from "~~/server/db";
import { resolveAiConfig } from "~~/server/utils/ai/config";
import { requireUser } from "~~/server/utils/auth";
import { ownSubtitle } from "~~/server/utils/ownSubtitle";
import { useSettings } from "~~/server/utils/settings";
import { idParam, validBody, validParams } from "~~/server/utils/validate";
import { cardFromWord } from "~~/server/utils/wordCards";

const body = z.object({
  cue: z.number().int().min(0),
  start: z.number().int().min(0),
  end: z.number().int().min(1),
  lemma: z.string().trim().min(1).max(80).nullable().default(null),
});

/** Make a card from a word the learner tapped: the AI translates it as used in that line. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const { lemma, ...use } = await validBody(event, body);
  const db = useDb();
  return cardFromWord({
    db,
    user,
    subtitle: ownSubtitle(db, user.id, id),
    use,
    lemma,
    config: resolveAiConfig(useSettings()),
  });
});
