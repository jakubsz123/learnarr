import path from "node:path";

/**
 * Where Learnarr keeps everything it owns: the database and its generated keys.
 * `/config` in the Docker image; `./data` when running from a checkout.
 */
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
