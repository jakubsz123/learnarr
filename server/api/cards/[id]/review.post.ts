import { defineEventHandler } from "h3";
import { z } from "zod";
import { RATING_VALUES } from "#shared/srs";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { reviewCard } from "~~/server/utils/reviews";
import { idParam, validBody, validParams } from "~~/server/utils/validate";

const body = z.object({ rating: z.union(RATING_VALUES.map((r) => z.literal(r))) });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const { rating } = await validBody(event, body);
  return reviewCard(useDb(), user.id, id, rating);
});
