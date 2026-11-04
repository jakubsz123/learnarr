import { defineEventHandler } from "h3";
import { requireUser } from "~~/server/utils/auth";
import { useMediaServer } from "~~/server/utils/media";

/** The media server's film and show libraries. */
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const server = useMediaServer();
  return { server: server.kind, libraries: await server.libraries() };
});
