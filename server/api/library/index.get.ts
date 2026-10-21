import { useMediaServer } from "~~/server/utils/media";
import { MediaServerError } from "~~/server/utils/media/types";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const server = useMediaServer();
  try {
    return { server: server.kind, libraries: await server.libraries() };
  } catch (error) {
    if (error instanceof MediaServerError)
      throw createError({ statusCode: 502, statusMessage: error.message });
    throw error;
  }
});
