import { parseSubtitle } from "#shared/subtitles";
import { AiError } from "~~/server/utils/ai/client";
import { aiInput, candidateConfig } from "~~/server/utils/ai/input";
import { pickWords } from "~~/server/utils/ai/pickWords";

const SAMPLE = `1
00:00:01,000 --> 00:00:03,000
No me lo puedo creer, ¿otra vez llegas tarde?

2
00:00:03,500 --> 00:00:06,000
Lo siento, el tráfico estaba fatal esta mañana.

3
00:00:06,500 --> 00:00:09,000
Siempre tienes una excusa preparada.

4
00:00:09,500 --> 00:00:12,000
Te prometo que mañana madrugaré.

5
00:00:12,500 --> 00:00:15,000
Más te vale, el jefe ya sospecha algo.`;

/** Run a real word pick on a short sample, so the admin sees the words and the time it takes. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const config = candidateConfig(await validBody(event, aiInput), useSettings());
  if (!config.model) return { ok: false, error: "Pick a model first." };
  const started = Date.now();
  try {
    const words = await pickWords(config, {
      cues: parseSubtitle(SAMPLE),
      language: "es",
      nativeLanguage: "en",
      level: "intermediate",
      count: 5,
      known: [],
    });
    return {
      ok: true,
      ms: Date.now() - started,
      words: words.map((w) => ({ term: w.term, translation: w.translation })),
    };
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
});
