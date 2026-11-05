/**
 * Ids of films and shows that don't come from the media server, so the server
 * and the browser can tell where an id belongs:
 *
 * - OpenSubtitles.com's catalogue: `os-m-<film>`, `os-s-<show>[-<season>[-<episode>]]`,
 *   and `os` for the catalogue in the library;
 * - subtitles people uploaded on their own: `up-<random>`, and `up` for the list of them.
 */
export const CATALOGUE_LIBRARY = "os";
export const CATALOGUE_PREFIX = "os-";
export const UPLOADS_LIBRARY = "up";
export const UPLOAD_PREFIX = "up-";

export const isCatalogueId = (id: string) => id === CATALOGUE_LIBRARY || id.startsWith(CATALOGUE_PREFIX);
export const isUploadId = (id: string) => id === UPLOADS_LIBRARY || id.startsWith(UPLOAD_PREFIX);
